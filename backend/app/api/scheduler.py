from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.campaign import Campaign, CampaignStatus
from app.api.campaigns import _run_campaign_logic  # import the reusable function

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])

@router.post("/check-scheduled")
async def check_scheduled_campaigns(db: Session = Depends(get_db)):
    """
    Check for campaigns whose scheduled_at time has arrived and start them.
    Intended to be called by an external cron job (e.g., cron-job.org) every 10 minutes.
    """
    now = datetime.utcnow()
    campaigns = db.query(Campaign).filter(
        Campaign.scheduled_at <= now,
        Campaign.status == CampaignStatus.PENDING
    ).all()

    results = []
    for campaign in campaigns:
        # Run the campaign (no background_tasks needed – we want it to complete before returning)
        successes, total, status, actions = await _run_campaign_logic(campaign.id, db, background_tasks=None)
        results.append({
            "campaign_id": campaign.id,
            "name": campaign.name,
            "scheduled_at": campaign.scheduled_at,
            "started_at": datetime.utcnow(),
            "successful_actions": successes,
            "total_actions": total,
            "status": status
        })

    return {
        "checked_at": now,
        "campaigns_found": len(campaigns),
        "results": results
    }


