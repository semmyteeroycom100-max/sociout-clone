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