from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import shutil
import os
from datetime import datetime  # <-- ADDED for avatar upload

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

# ========== AVATAR UPLOAD ==========
@router.post("/avatar")
async def upload_avatar(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an avatar image for the authenticated user.
    The image is saved to static/avatars/ and the user's avatar_url is updated.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Ensure the avatars directory exists
    os.makedirs("static/avatars", exist_ok=True)
    
    # Generate a unique filename (user_id + original filename)
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    safe_filename = f"{user.id}_{datetime.utcnow().timestamp()}{file_extension}"
    file_path = f"static/avatars/{safe_filename}"
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update the user's avatar_url (relative path)
    avatar_url = f"/static/avatars/{safe_filename}"
    user.avatar_url = avatar_url
    db.commit()
    
    return {"avatar_url": avatar_url}

# ========== GAMIFICATION ==========
@router.get("/me/gamification")
def get_gamification(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    return {
        "xp": user.xp or 0,
        "level": user.level or 1,
        "streak_days": user.streak_days or 0,
        "next_level_xp": ((user.level or 1) * 100)  # XP needed for next level
    }