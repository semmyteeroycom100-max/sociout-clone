@router.get("/status")
async def tiktok_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "tiktok"
    ).first()
    return {"connected": token is not None}

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.oauth import OAuthToken
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/tiktok", tags=["TikTok"])
security = HTTPBearer()

@router.post("/reset")
async def tiktok_reset(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "tiktok"
    ).delete()
    db.commit()
    return {"message": "TikTok connection reset"}
