from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.badge import UserBadge, Badge
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/gamification", tags=["Gamification"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/me")
def get_gamification_data(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    badges = db.query(UserBadge).filter(UserBadge.user_id == user.id).all()
    earned_badges = [{"id": b.badge_id, "name": b.badge.name, "icon": b.badge.icon} for b in badges]
    return {
        "xp": user.xp,
        "level": user.level,
        "streak_days": user.streak_days,
        "badges": earned_badges,
        "next_level_xp": (user.level * 100),
        "perks": {
            "daily_action_limit": user.daily_action_limit,
            "next_perk": f"Unlock at Level 20: Comment Templates" if user.level < 20 else "Unlocked: Comment Templates",
        }
    }

@router.get("/badges/all")
def list_all_badges(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    current_user = get_current_user(credentials, db)
    all_badges = db.query(Badge).all()
    earned_ids = [b.badge_id for b in db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()]
    return [{"id": b.id, "name": b.name, "description": b.description, "icon": b.icon, "earned": b.id in earned_ids} for b in all_badges]