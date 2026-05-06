from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc
import re

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


@router.post("/create", response_model=CampaignResponse)
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
    
    if campaign_data.action_type == CampaignActionType.COMMENT:
        if not campaign_data.comment_text or len(campaign_data.comment_text) < 2:
            raise HTTPException(status_code=400, detail="Comment text is required")
    
    if campaign_data.target_count < 1 or campaign_data.target_count > 100:
        raise HTTPException(status_code=400, detail="Target count must be between 1 and 100")
    
    campaign = Campaign(
        user_id=user.id,
        name=campaign_data.name,
        video_url=str(campaign_data.video_url),
        video_id=video_id,
        action_type=campaign_data.action_type,
        target_count=campaign_data.target_count,
        comment_text=campaign_data.comment_text,
        status=CampaignStatus.PENDING
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return campaign


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
    
    return campaigns


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
    }