from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from io import StringIO
import csv
import re  # <-- ADDED

from app.database import get_db
from app.models.user import User
from app.models.campaign import Campaign, CampaignStatus, CampaignActionType, CampaignAction
from app.models.oauth import OAuthToken
from app.models.pool_account import PoolAccount
from app.schemas.campaign import CampaignCreate
from app.core.auth import decode_access_token
from app.services.youtube import YouTubeService
from app.services.webhook import send_webhook
from app.services.email import send_campaign_completion_email
from app.services.activity_logger import log_activity
from app.services.account_selector import AccountSelector
from app.services.action_executor import ActionExecutor
from app.services.gamification import add_xp, update_streak

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])
security = HTTPBearer()

# ===== VIDEO ID EXTRACTION (supports all YouTube formats) =====
def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)",  # standard watch
        r"youtu\.be\/([0-9A-Za-z_-]{11})",          # youtu.be
        r"shorts\/([0-9A-Za-z_-]{11})",             # shorts
        r"embed\/([0-9A-Za-z_-]{11})",              # embed
        r"v\/([0-9A-Za-z_-]{11})"                   # /v/ format
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Could not extract video ID")

# ===== REUSABLE CAMPAIGN EXECUTION LOGIC (for scheduler) =====
def _run_campaign_logic(campaign_id: int, db: Session):
    """
    Executes a campaign by its ID. Used by the scheduler and background tasks.
    Returns a dict with campaign_id, status, completed, target.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return {"error": "Campaign not found", "campaign_id": campaign_id}

    user = db.query(User).filter(User.id == campaign.user_id).first()
    if not user:
        return {"error": "User not found", "campaign_id": campaign_id}

    # If already running or completed, skip
    if campaign.status in (CampaignStatus.RUNNING, CampaignStatus.COMPLETED):
        return {
            "campaign_id": campaign.id,
            "status": campaign.status.value,
            "completed": campaign.completed_count,
            "target": campaign.target_count,
            "message": "Campaign already processed"
        }

    try:
        # Check YouTube connection
        oauth_token = db.query(OAuthToken).filter(
            OAuthToken.user_id == user.id,
            OAuthToken.provider == "google"
        ).first()
        if not oauth_token:
            return {"error": "YouTube not connected", "campaign_id": campaign_id}

        # Select account from pool
        selector = AccountSelector(db)
        account = selector.select_account(campaign.action_type)
        if not account:
            return {"error": "No available pool accounts", "campaign_id": campaign_id}

        # Execute actions
        executor = ActionExecutor(db)
        actions = campaign.target_count
        success_count = 0
        for i in range(actions):
            result = executor.execute_action(
                account_id=account.id,
                user_id=user.id,
                action_type=campaign.action_type.value,
                target=campaign.video_id,
                campaign_id=campaign.id,
                comment_text=campaign.comment_text or None,
                comment_list=campaign.comment_list.split("\n") if campaign.comment_list else None
            )
            if result:
                success_count += 1

        # Update campaign
        campaign.completed_count = success_count
        if success_count >= campaign.target_count:
            campaign.status = CampaignStatus.COMPLETED
            add_xp(user, 20, db)
            update_streak(user, db)
            if campaign.webhook_url:
                send_webhook(campaign.webhook_url, {"campaign_id": campaign.id, "status": "completed"})
            send_campaign_completion_email(user.email, campaign.name)
            log_activity(db, user.id, "campaign_completed", f"Campaign '{campaign.name}' completed (scheduled)")
        else:
            campaign.status = CampaignStatus.FAILED
            log_activity(db, user.id, "campaign_failed", f"Campaign '{campaign.name}' failed (only {success_count}/{campaign.target_count} actions)")

        db.commit()
        return {
            "campaign_id": campaign.id,
            "status": campaign.status.value,
            "completed": success_count,
            "target": campaign.target_count
        }

    except Exception as e:
        campaign.status = CampaignStatus.FAILED
        campaign.error_message = str(e)
        db.commit()
        return {"error": str(e), "campaign_id": campaign_id}

def get_current_user_from_token(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===== ROUTES =====

@router.get("/")
def list_campaigns(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaigns = db.query(Campaign).filter(Campaign.user_id == user.id).order_by(desc(Campaign.created_at)).all()
    return campaigns

@router.post("/create")
@limiter.limit("25/hour")
def create_campaign(
    request: Request,
    campaign_data: CampaignCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)

    # Validate and extract video ID using robust function
    try:
        video_id = extract_video_id(campaign_data.video_url)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL – could not extract video ID")

    new_campaign = Campaign(
        user_id=user.id,
        name=campaign_data.name,
        video_url=campaign_data.video_url,
        video_id=video_id,
        action_type=CampaignActionType[campaign_data.action_type],
        target_count=campaign_data.target_count,
        comment_text=campaign_data.comment_text,
        comment_list="\n".join(campaign_data.comment_list) if campaign_data.comment_list else None,
        scheduled_at=campaign_data.scheduled_at,
        platform=campaign_data.platform or "youtube",
        status=CampaignStatus.PENDING
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    add_xp(user, 5, db)
    update_streak(user, db)
    log_activity(db, user.id, "campaign_created", f"Created campaign '{new_campaign.name}'")
    return {"message": "Campaign created", "id": new_campaign.id}

@router.post("/{campaign_id}/start")
def start_campaign(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != CampaignStatus.PENDING:
        raise HTTPException(status_code=400, detail="Campaign already started or completed")
    campaign.status = CampaignStatus.RUNNING
    campaign.started_at = datetime.utcnow()
    db.commit()
    try:
        oauth_token = db.query(OAuthToken).filter(OAuthToken.user_id == user.id, OAuthToken.provider == "google").first()
        if not oauth_token:
            raise HTTPException(status_code=400, detail="YouTube not connected")
        selector = AccountSelector(db)
        account = selector.select_account(campaign.action_type)
        if not account:
            raise HTTPException(status_code=503, detail="No available pool accounts")
        executor = ActionExecutor(db)
        actions = campaign.target_count
        success_count = 0
        for i in range(actions):
            result = executor.execute_action(
                account_id=account.id,
                user_id=user.id,
                action_type=campaign.action_type.value,
                target=campaign.video_id,
                campaign_id=campaign.id,
                comment_text=campaign.comment_text or None,
                comment_list=campaign.comment_list.split("\n") if campaign.comment_list else None
            )
            if result:
                success_count += 1
        campaign.completed_count = success_count
        if success_count >= campaign.target_count:
            campaign.status = CampaignStatus.COMPLETED
            add_xp(user, 20, db)
            update_streak(user, db)
            if campaign.webhook_url:
                send_webhook(campaign.webhook_url, {"campaign_id": campaign.id, "status": "completed"})
            send_campaign_completion_email(user.email, campaign.name)
            log_activity(db, user.id, "campaign_completed", f"Campaign '{campaign.name}' completed")
        else:
            campaign.status = CampaignStatus.FAILED
            log_activity(db, user.id, "campaign_failed", f"Campaign '{campaign.name}' failed (only {success_count}/{campaign.target_count} actions)")
        db.commit()
        return {"message": "Campaign started", "completed": success_count, "target": campaign.target_count}
    except Exception as e:
        campaign.status = CampaignStatus.FAILED
        campaign.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == CampaignStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Cannot delete running campaign")
    db.delete(campaign)
    db.commit()
    log_activity(db, user.id, "campaign_deleted", f"Deleted campaign '{campaign.name}'")
    return {"message": "Campaign deleted"}

@router.get("/{campaign_id}/export")
def export_campaign_csv(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)   # <-- Fixed typo
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    actions = db.query(CampaignAction).filter(CampaignAction.campaign_id == campaign.id).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Index", "Success", "Response", "Error", "Created At"])
    for a in actions:
        writer.writerow([a.action_index, a.success, a.youtube_response or "", a.error_message or "", a.created_at])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=campaign_{campaign_id}.csv"})