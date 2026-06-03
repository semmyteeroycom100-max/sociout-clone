from celery import shared_task
from sqlalchemy.orm import Session
from datetime import datetime
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal
from app.models.user import Campaign, CampaignStatus

@shared_task
def check_scheduled_campaigns():
    """Check for campaigns that are scheduled to start and start them."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        campaigns = db.query(Campaign).filter(
            Campaign.scheduled_at <= now,
            Campaign.status == CampaignStatus.PENDING,
            Campaign.started_at == None
        ).all()
        for campaign in campaigns:
            print(f"Starting scheduled campaign {campaign.id} - {campaign.name}")
            # Here you would call the actual start logic
            # For now, just update status to running
            campaign.status = CampaignStatus.RUNNING
            campaign.started_at = now
            db.commit()
        db.commit()
    except Exception as e:
        print(f"Error in check_scheduled_campaigns: {e}")
    finally:
        db.close()