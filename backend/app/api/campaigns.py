from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc
import re
import json

from app.database import get_db
from app.models.user import User, Campaign, CampaignStatus, CampaignActionType
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignDetailResponse
from app.core.auth import decode_access_token
from app.workers.campaign_tasks import execute_campaign
from app.services.youtube import YouTubeService
from app.api.oauth import get_youtube_token

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])
security = HTTPBearer()


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from URL"""
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


@router.post("/create")   # response_model removed
async def create_campaign(
    campaign_data: CampaignCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new campaign"""
    user = get_current_user_from_token(credentials, db)
    
    try:
        video_id = extract_video_id(str(campaign_data.video_url))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    # For COMMENT action, require either comment_text or comment_list
    if campaign_data.action_type == CampaignActionType.COMMENT:
        if not (campaign_data.comment_text or campaign_data.comment_list):
            raise HTTPException(status_code=400, detail="Comment text or list is required")
    
    if campaign_data.target_count < 1 or campaign_data.target_count > 100:
        raise HTTPException(status_code=400, detail="Target count must be between 1 and 100")
    
    # Convert comment_list to JSON string if present
    comment_list_json = json.dumps(campaign_data.comment_list) if campaign_data.comment_list else None
    
    campaign = Campaign(
        user_id=user.id,
        name=campaign_data.name,
        video_url=str(campaign_data.video_url),
        video_id=video_id,
        action_type=campaign_data.action_type,
        target_count=campaign_data.target_count,
        comment_text=campaign_data.comment_text,
        comment_list=comment_list_json,   # <-- store JSON array
        status=CampaignStatus.PENDING,
        scheduled_at=campaign_data.scheduled_at
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Return dictionary (as before)
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
    }

    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Return a dictionary with enum values converted to strings
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
    }


@router.post("/{campaign_id}/start")
async def start_campaign(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Start a campaign"""
    user = get_current_user_from_token(credentials, db)
    
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user.id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != CampaignStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Campaign already {campaign.status.value}")
    
    task = execute_campaign.delay(campaign_id)
    campaign.celery_task_id = task.id
    db.commit()
    
    return {"campaign_id": campaign_id, "task_id": task.id, "status": "queued"}


@router.get("/")
async def list_campaigns(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """List all campaigns for current user"""
    user = get_current_user_from_token(credentials, db)
    
    campaigns = db.query(Campaign).filter(
        Campaign.user_id == user.id
    ).order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    
    # Convert list of SQLAlchemy objects to dicts with enum values as strings
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
        })
    return result


@router.get("/{campaign_id}/status")
async def get_campaign_status(
    campaign_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get campaign status"""
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
    }