from celery import Task
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import asyncio
import os
import json
import random
from dotenv import load_dotenv

from app.workers.celery_app import celery_app
from app.models.user import Campaign, CampaignAction, CampaignStatus, CampaignActionType, OAuthToken
from app.services.youtube import YouTubeService

load_dotenv()

# Database setup for Celery worker
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sociout.db")
if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class CampaignTask(Task):
    """Custom task class to handle database sessions"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        if self._db is not None:
            self._db.close()


@celery_app.task(base=CampaignTask, bind=True)
def execute_campaign(self, campaign_id: int):
    """Execute a campaign - performs real YouTube API calls"""
    db = self.db
    
    try:
        # Get campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return {"error": f"Campaign {campaign_id} not found"}
        
        # Update status to running
        campaign.status = CampaignStatus.RUNNING
        campaign.celery_task_id = self.request.id
        db.commit()
        
        # Get user's YouTube token
        oauth_token = db.query(OAuthToken).filter(
            OAuthToken.user_id == campaign.user_id,
            OAuthToken.provider == "google"
        ).first()
        
        if not oauth_token:
            campaign.status = CampaignStatus.FAILED
            campaign.error_message = "YouTube not connected. Please authenticate with Google."
            db.commit()
            return {"error": "No YouTube token found"}
        
        # Create YouTube service
        youtube_service = YouTubeService(oauth_token.access_token)
        
        # Run actions asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        for i in range(campaign.target_count):
            try:
                success = False
                response = None
                
                if campaign.action_type == CampaignActionType.LIKE:
                    result = loop.run_until_complete(
                        youtube_service.like_video(campaign.video_id)
                    )
                    success = "error" not in result
                    response = str(result)
                    
                elif campaign.action_type == CampaignActionType.SUBSCRIBE:
                    if not campaign.channel_id:
                        # Extract channel ID from video
                        video_info = loop.run_until_complete(
                            youtube_service.get_video_info(campaign.video_id)
                        )
                        campaign.channel_id = video_info.get("channel_id")
                        db.commit()
                    
                    if campaign.channel_id:
                        result = loop.run_until_complete(
                            youtube_service.subscribe_to_channel(campaign.channel_id)
                        )
                        success = "error" not in result
                        response = str(result)
                    else:
                        success = False
                        response = "Could not find channel ID"
                        
                elif campaign.action_type == CampaignActionType.COMMENT:
                    # Determine comment text from comment_list (random) or comment_text
                    comment_text = None
                    if campaign.comment_list:
                        try:
                            comments = json.loads(campaign.comment_list)
                            if comments:
                                comment_text = random.choice(comments)
                        except:
                            pass
                    if not comment_text:
                        comment_text = campaign.comment_text
                    
                    if comment_text:
                        result = loop.run_until_complete(
                            youtube_service.post_comment(campaign.video_id, comment_text)
                        )
                        success = "error" not in result
                        response = str(result)
                    else:
                        success = False
                        response = "No comment text provided"
                
                # Record action
                action = CampaignAction(
                    campaign_id=campaign.id,
                    action_index=i + 1,
                    success=success,
                    youtube_response=response[:500] if response else None,
                    error_message=None if success else response[:500]
                )
                db.add(action)
                
                # Update campaign progress
                campaign.completed_count = i + 1
                db.commit()
                
                # Update Celery task state with progress
                self.update_state(
                    state="PROGRESS",
                    meta={
                        "current": i + 1,
                        "total": campaign.target_count,
                        "status": f"Completed {i + 1} of {campaign.target_count} actions"
                    }
                )
                
            except Exception as e:
                # Record failed action
                action = CampaignAction(
                    campaign_id=campaign.id,
                    action_index=i + 1,
                    success=False,
                    error_message=str(e)[:500]
                )
                db.add(action)
                campaign.completed_count = i + 1
                db.commit()
        
        loop.close()
        
        # Mark campaign as completed
        campaign.status = CampaignStatus.COMPLETED
        db.commit()
        
        return {
            "campaign_id": campaign.id,
            "total_actions": campaign.target_count,
            "completed": campaign.completed_count,
            "status": "completed"
        }
        
    except Exception as e:
        campaign.status = CampaignStatus.FAILED
        campaign.error_message = str(e)
        db.commit()
        return {"error": str(e)}


# ==================== TASK FOR SCHEDULED CAMPAIGNS ====================
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import Campaign, CampaignStatus

@celery_app.task
def start_scheduled_campaigns():
    """Periodically check for pending scheduled campaigns and start them"""
    db = SessionLocal()
    now = datetime.utcnow()
    campaigns = db.query(Campaign).filter(
        Campaign.status == CampaignStatus.PENDING,
        Campaign.scheduled_at <= now,
        Campaign.scheduled_at.isnot(None)
    ).all()
    
    for camp in campaigns:
        # Use the existing execute_campaign task (defined above)
        execute_campaign.delay(camp.id)
        camp.started_at = now
        db.add(camp)
    
    db.commit()
    db.close()