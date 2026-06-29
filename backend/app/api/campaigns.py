from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
import re
import json
import random
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.oauth import OAuthToken
from app.models.campaign import Campaign, CampaignStatus, CampaignActionType, CampaignAction
from app.schemas.campaign import CampaignCreate
from app.core.auth import decode_access_token
from app.services.youtube import YouTubeService
from app.services.webhook import send_webhook
from app.services.email import send_campaign_completion_email
from app.services.activity_logger import log_activity
from app.services.account_selector import AccountSelector
from app.services.action_executor import ActionExecutor
from app.models.pool_account import PoolAccount

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])
security = HTTPBearer()


def extract_video_id(url: str) -> str:
    patterns = [
        r'(?:youtube\.com\/watch\?v=)([\w-]+)',
        r'(?:youtu\.be\/)([\w-]+)',
        r'(?:youtube\.com\/embed\/)([\w-]+)',
        r'(?:youtube\.com\/v\/)([\w-]+)',
        r'(?:youtube\.com\/shorts\/)([\w-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Invalid YouTube URL")


def extract_channel_id(url: str) -> str:
    patterns = [
        r'youtube\.com/channel/([UC][\w-]+)',
        r'youtube\.com/@([\w-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


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


async def _run_campaign_logic(campaign_id: int, db: Session, background_tasks: BackgroundTasks = None):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return 0, 0, "failed", []
    if campaign.status != CampaignStatus.PENDING:
        return 0, campaign.target_count, campaign.status.value, []

    # Mark as running
    campaign.status = CampaignStatus.RUNNING
    campaign.started_at = datetime.utcnow()
    db.commit()

    # Log activity: campaign started
    log_activity(
        user_id=campaign.user_id,
        action_type="campaign_started",
        description=f"Started campaign '{campaign.name}' on {campaign.platform}",
        extra_data={"campaign_id": campaign.id, "platform": campaign.platform}
    )

    # Decide which accounts to use
    if campaign.use_pool:
        # Use shared pool for all actions
        selector = AccountSelector(db)
        account = selector.select_account(campaign.action_type.value.lower())
        if not account:
            campaign.status = CampaignStatus.FAILED
            campaign.error_message = "No available accounts in pool"
            db.commit()
            log_activity(
                user_id=campaign.user_id,
                action_type="campaign_failed",
                description=f"Campaign '{campaign.name}' failed: no pool accounts available",
                extra_data={"campaign_id": campaign.id, "error": "No pool accounts"}
            )
            return 0, campaign.target_count, "failed", []

        # Use a single account for all actions (or you could rotate)
        # For simplicity, we'll use the same account for all actions
        yt = YouTubeService(account.access_token)  # Access token is stored in pool_accounts
    else:
        # Use user's own account
        oauth_token = db.query(OAuthToken).filter(
            OAuthToken.user_id == campaign.user_id,
            OAuthToken.provider == "google"
        ).first()
        if not oauth_token:
            campaign.status = CampaignStatus.FAILED
            campaign.error_message = "YouTube not connected"
            db.commit()
            log_activity(
                user_id=campaign.user_id,
                action_type="campaign_failed",
                description=f"Campaign '{campaign.name}' failed: YouTube not connected",
                extra_data={"campaign_id": campaign.id, "error": "YouTube not connected"}
            )
            return 0, campaign.target_count, "failed", []
        yt = YouTubeService(oauth_token.access_token)

    successes = 0
    actions_log = []
    first_error = None

    for i in range(campaign.target_count):
        try:
            if campaign.action_type == CampaignActionType.LIKE:
                result = await yt.like_video(campaign.video_id)
                success = "error" not in result
                response = str(result)
                if not success and first_error is None:
                    first_error = response

            elif campaign.action_type == CampaignActionType.SUBSCRIBE:
                if not campaign.channel_id and campaign.video_id:
                    video_info = await yt.get_video_info(campaign.video_id)
                    campaign.channel_id = video_info.get("channel_id")
                    db.commit()
                if not campaign.channel_id:
                    campaign.channel_id = extract_channel_id(str(campaign.video_url))
                    db.commit()
                if campaign.channel_id:
                    result = await yt.subscribe_to_channel(campaign.channel_id)
                    success = "error" not in result
                    response = str(result)
                else:
                    success = False
                    response = "Could not find channel ID"
                if not success and first_error is None:
                    first_error = response

            elif campaign.action_type == CampaignActionType.COMMENT:
                comment_text = campaign.comment_text
                if campaign.comment_list:
                    try:
                        comments = json.loads(campaign.comment_list)
                        if comments and len(comments) > 0:
                            comment_text = random.choice(comments)
                    except:
                        pass
                if not comment_text or not comment_text.strip():
                    success = False
                    response = "No comment text provided"
                else:
                    result = await yt.post_comment(campaign.video_id, comment_text)
                    if "error" in result:
                        success = False
                        response = result["error"]
                    else:
                        success = True
                        response = f"Comment posted: {comment_text[:50]}..."
                if not success and first_error is None:
                    first_error = response

            else:
                success = False
                response = "Unknown action type"
                if first_error is None:
                    first_error = response

            # Record action
            action = CampaignAction(
                campaign_id=campaign.id,
                action_index=i+1,
                success=success,
                youtube_response=response[:500] if response else None,
                error_message=None if success else response[:500]
            )
            db.add(action)
            if success:
                successes += 1
            campaign.completed_count = i+1
            db.commit()
            actions_log.append({"index": i+1, "success": success, "response": response[:200]})

        except Exception as e:
            error_msg = str(e)[:500]
            action = CampaignAction(
                campaign_id=campaign.id,
                action_index=i+1,
                success=False,
                error_message=error_msg
            )
            db.add(action)
            campaign.completed_count = i+1
            db.commit()
            actions_log.append({"index": i+1, "success": False, "error": error_msg})
            if first_error is None:
                first_error = error_msg

    # Final status
    if successes > 0:
        campaign.status = CampaignStatus.COMPLETED
        log_activity(
            user_id=campaign.user_id,
            action_type="campaign_completed",
            description=f"Campaign '{campaign.name}' completed with {successes}/{campaign.target_count} actions",
            extra_data={"campaign_id": campaign.id, "successes": successes, "total": campaign.target_count}
        )
    else:
        campaign.status = CampaignStatus.FAILED
        campaign.error_message = first_error or "All actions failed"
        log_activity(
            user_id=campaign.user_id,
            action_type="campaign_failed",
            description=f"Campaign '{campaign.name}' failed: {campaign.error_message}",
            extra_data={"campaign_id": campaign.id, "error": campaign.error_message}
        )
    db.commit()

    # Send webhook if provided
    if campaign.webhook_url and (campaign.status in (CampaignStatus.COMPLETED, CampaignStatus.FAILED)):
        if background_tasks:
            background_tasks.add_task(
                send_webhook,
                campaign.webhook_url,
                campaign.id,
                campaign.name,
                campaign.status.value,
                successes,
                campaign.target_count,
                str(campaign.video_url),
                campaign.webhook_secret
            )
        else:
            await send_webhook(
                campaign.webhook_url,
                campaign.id,
                campaign.name,
                campaign.status.value,
                successes,
                campaign.target_count,
                str(campaign.video_url),
                campaign.webhook_secret
            )

    user = db.query(User).filter(User.id == campaign.user_id).first()
    if user and user.email:
        send_campaign_completion_email(
            to_email=user.email,
            campaign_name=campaign.name,
            status=campaign.status.value,
            successful_actions=successes,
            total_actions=campaign.target_count
        )

    return successes, campaign.target_count, campaign.status.value, actions_log


@router.post("/create")
@limiter.limit("25/hour")
async def create_campaign(
    request: Request,
    campaign_data: CampaignCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)

    try:
        video_id = extract_video_id(str(campaign_data.video_url))
    except ValueError:
        video_id = None

    if campaign_data.action_type == CampaignActionType.COMMENT:
        if not (campaign_data.comment_text or campaign_data.comment_list):
            raise HTTPException(status_code=400, detail="Comment text or list is required")

    if campaign_data.target_count < 1 or campaign_data.target_count > 100:
        raise HTTPException(status_code=400, detail="Target count must be between 1 and 100")

    comment_list_json = json.dumps(campaign_data.comment_list) if campaign_data.comment_list else None

    campaign = Campaign(
        user_id=user.id,
        name=campaign_data.name,
        video_url=str(campaign_data.video_url),
        video_id=video_id,
        action_type=campaign_data.action_type,
        target_count=campaign_data.target_count,
        comment_text=campaign_data.comment_text,
        comment_list=comment_list_json,
        status=CampaignStatus.PENDING,
        scheduled_at=campaign_data.scheduled_at,
        webhook_url=str(campaign_data.webhook_url) if campaign_data.webhook_url else None,
        webhook_secret=campaign_data.webhook_secret,
        platform=campaign_data.platform or "youtube",
        use_pool=campaign_data.use_pool or False
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return {
        "id": campaign.id,
        "name": campaign.name,
        "video_url": campaign.video_url,
        "video_id": campaign.video_id,
        "action_type": campaign.action_type.value,
        "target_count": campaign.target_count,
        "completed_count": campaign.completed_count,
        "status": campaign.status.value,
        "error_message": campaign.error_message,
        "created_at": campaign.created_at,
        "updated_at": campaign.updated_at,
        "scheduled_at": campaign.scheduled_at,
        "started_at": campaign.started_at,
        "webhook_url": campaign.webhook_url,
        "webhook_secret": campaign.webhook_secret,
        "platform": campaign.platform,
        "use_pool": campaign.use_pool,
    }


@router.post("/{campaign_id}/start")
@limiter.limit("25/hour")
async def start_campaign(
    request: Request,
    campaign_id: int,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != CampaignStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Campaign already {campaign.status.value}")

    successes, total, status, actions = await _run_campaign_logic(campaign_id, db, background_tasks)
    return {
        "campaign_id": campaign.id,
        "successful_actions": successes,
        "total_actions": total,
        "status": status,
        "actions": actions
    }


@router.get("/")
async def list_campaigns(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    user = get_current_user_from_token(credentials, db)
    campaigns = db.query(Campaign).filter(
        Campaign.user_id == user.id
    ).order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    result = []
    for c in campaigns:
        result.append({
            "id": c.id,
            "name": c.name,
            "video_url": c.video_url,
            "video_id": c.video_id,
            "action_type": c.action_type.value,
            "target_count": c.target_count,
            "completed_count": c.completed_count,
            "status": c.status.value,
            "error_message": c.error_message,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "scheduled_at": c.scheduled_at,
            "started_at": c.started_at,
            "webhook_url": c.webhook_url,
            "webhook_secret": c.webhook_secret,
            "platform": c.platform,
          #  "use_pool": c.use_pool,
        })
    return result


@router.get("/{campaign_id}/status")
async def get_campaign_status(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {
        "id": campaign.id,
        "name": campaign.name,
        "status": campaign.status.value,
        "target_count": campaign.target_count,
        "completed_count": campaign.completed_count,
        "percentage": (campaign.completed_count / campaign.target_count * 100) if campaign.target_count > 0 else 0,
        "scheduled_at": campaign.scheduled_at,
        "started_at": campaign.started_at,
        "webhook_url": campaign.webhook_url,
        "use_pool": campaign.use_pool,
    }


@router.get("/{campaign_id}/export")
async def export_campaign_csv(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    actions = db.query(CampaignAction).filter(
        CampaignAction.campaign_id == campaign_id
    ).order_by(CampaignAction.action_index).all()
    import csv
    from io import StringIO
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Action Index", "Success", "YouTube Response", "Error Message", "Created At"])
    for action in actions:
        writer.writerow([
            action.action_index,
            "Yes" if action.success else "No",
            action.youtube_response or "",
            action.error_message or "",
            action.created_at.isoformat() if action.created_at else ""
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=campaign_{campaign_id}_export.csv"}
    )


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_token(credentials, db)
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == CampaignStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Cannot delete a running campaign. Stop it first.")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}
