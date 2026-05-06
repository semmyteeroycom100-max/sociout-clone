"""
Admin Panel API
Protected endpoints for admin users only
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc
import csv
import io

from app.database import get_db
from app.models.user import User, Campaign, OAuthToken
from app.schemas.user import UserCreate, UserResponse
from app.core.auth import decode_access_token, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin"])
security = HTTPBearer()

def require_admin(credentials: HTTPAuthorizationCredentials, db: Session):
    """Check if user is admin"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not getattr(user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@router.get("/users")
def get_all_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all users (admin only)"""
    require_admin(credentials, db)
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/campaigns")
def get_all_campaigns(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all campaigns across all users (admin only)"""
    require_admin(credentials, db)
    campaigns = db.query(Campaign).order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    return campaigns

@router.post("/users/batch")
def batch_create_users(
    users_data: list[UserCreate],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Batch create users from JSON (admin only)"""
    require_admin(credentials, db)
    
    results = {"created": [], "failed": []}
    
    for user_data in users_data:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            results["failed"].append({"email": user_data.email, "reason": "Already exists"})
        else:
            new_user = User(
                email=user_data.email,
                username=user_data.username,
                hashed_password=get_password_hash(user_data.password)
            )
            db.add(new_user)
            results["created"].append(user_data.email)
    
    db.commit()
    return results

@router.get("/stats")
def get_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get platform statistics (admin only)"""
    require_admin(credentials, db)
    
    total_users = db.query(User).count()
    total_campaigns = db.query(Campaign).count()
    active_campaigns = db.query(Campaign).filter(Campaign.status == "running").count()
    total_oauth = db.query(OAuthToken).count()
    
    # Get subscribers to your channel
    # (You'll need to track this in a separate table or parse campaign results)
    
    return {
        "total_users": total_users,
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "youtube_connected": total_oauth,
        "platform": "Sociout Clone"
    }@router.post("/users/batch")
def batch_create_users(
    users_data: list,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Batch create users from JSON (admin only)"""
    require_admin(credentials, db)
    
    from app.schemas.user import UserCreate
    from app.core.auth import get_password_hash
    
    results = {"created": [], "failed": []}
    
    for user_data in users_data:
        try:
            # Check if user exists
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
        except Exception as e:
            results["failed"].append({"email": user_data.get("email", "unknown"), "reason": str(e)})
    
    db.commit()
    return results