"""
Admin Panel API
Protected endpoints for admin users only
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User, Campaign, OAuthToken
from app.schemas.user import UserCreate
from app.core.auth import decode_access_token, get_password_hash
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin"])
security = HTTPBearer()

def require_admin(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@router.get("/users")
def get_all_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    require_admin(credentials, db)
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/stats")
def get_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)
    total_users = db.query(User).count()
    total_campaigns = db.query(Campaign).count()
    total_oauth = db.query(OAuthToken).count()
    return {
        "total_users": total_users,
        "total_campaigns": total_campaigns,
        "youtube_connected": total_oauth,
    }

@router.post("/users/batch")
def batch_create_users(
    users_data: list,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)
    results = {"created": [], "failed": []}
    for user_data in users_data:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if existing:
            results["failed"].append({"email": user_data["email"], "reason": "Already exists"})
        else:
            new_user = User(
                email=user_data["email"],
                username=user_data["username"],
                hashed_password=get_password_hash(user_data["password"])
            )
            db.add(new_user)
            results["created"].append(user_data["email"])
    db.commit()
    return results

# ========== NEW: Get all campaigns ==========
@router.get("/all-campaigns")
def get_all_campaigns(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    require_admin(credentials, db)
    campaigns = db.query(Campaign).order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    return [{
        "id": c.id,
        "user_id": c.user_id,
        "name": c.name,
        "action_type": c.action_type.value,
        "status": c.status.value,
        "target_count": c.target_count,
        "completed_count": c.completed_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "started_at": c.started_at.isoformat() if c.started_at else None,
    } for c in campaigns]

@router.get("/stats")
def get_stats(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    require_admin(credentials, db)
    total_users = db.query(User).count()
    total_campaigns = db.query(Campaign).count()
    youtube_connected = db.query(OAuthToken).filter(OAuthToken.provider == "google").count()
    tiktok_connected = db.query(OAuthToken).filter(OAuthToken.provider == "tiktok").count()
    # Optional: campaign status counts
    completed_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.COMPLETED).count()
    failed_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.FAILED).count()
    running_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.RUNNING).count()
    total_actions = db.query(CampaignAction).count()
    successful_actions = db.query(CampaignAction).filter(CampaignAction.success == True).count()
    return {
        "total_users": total_users,
        "total_campaigns": total_campaigns,
        "youtube_connected": youtube_connected,
        "tiktok_connected": tiktok_connected,
        "completed_campaigns": completed_campaigns,
        "failed_campaigns": failed_campaigns,
        "running_campaigns": running_campaigns,
        "total_actions": total_actions,
        "successful_actions": successful_actions,
    }

# ========== TEMPORARY BACKDOOR – REMOVE AFTER USE ==========
import secrets
from fastapi import Request

@router.post("/tmp/make-admin")
async def make_admin_endpoint(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    🔒 TEMPORARY endpoint – remove after setting admin user.
    Uses a secret token for authentication (see code).
    """
    # Generate a random token (run `python -c "import secrets; print(secrets.token_urlsafe(32))"` once)
    # Then replace the string below with that token.
    EXPECTED_TOKEN = "tczZWYQ4xeIZM3Fp8nEDDK8XgkWTmDj_Mg7mmvOg6c0"  # 👈 CHANGE THIS TO YOUR GENERATED TOKEN

    auth_header = request.headers.get("Authorization")
    if not auth_header or auth_header != f"Bearer {EXPECTED_TOKEN}":
        raise HTTPException(status_code=403, detail="Forbidden")

    target_email = "tijanisemilore21@gmail.com"  # 👈 CHANGE TO YOUR EMAIL
    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"Admin rights granted to {user.email}"}
