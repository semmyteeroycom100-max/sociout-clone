from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.activity import ActivityLog
from app.services.activity_logger import log_activity
from app.schemas.user import UserResponse
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/users", tags=["Users"])
security = HTTPBearer()

@router.get("/me", response_model=UserResponse)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user
@router.get("/me/profile")
def get_my_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "website": user.website,
        "location": user.location,
        "wallet_balance": user.wallet_balance,
        "created_at": user.created_at,
    }

# Update profile
@router.put("/me/profile")
def update_profile(
    profile_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    for key, value in profile_data.items():
        if hasattr(user, key) and key in ["bio", "avatar_url", "website", "location"]:
            setattr(user, key, value)
    db.commit()
    return {"message": "Profile updated"}

# Get activity feed
@router.get("/me/activity")
def get_my_activity(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    limit: int = 20,
    skip: int = 0
):
    user = get_current_user(credentials, db)
    activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == user.id
    ).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": a.id,
        "action_type": a.action_type,
        "description": a.description,
        "metadata": a.metadata,
        "created_at": a.created_at,
    } for a in activities]
