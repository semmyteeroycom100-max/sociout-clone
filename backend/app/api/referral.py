from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import secrets
import string

from app.database import get_db
from app.models.user import User
from app.models.referral import Referral
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/referral", tags=["Referral"])
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

def generate_referral_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.get("/me")
def get_my_referral(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    if not user.referral_code:
        code = generate_referral_code()
        while db.query(User).filter(User.referral_code == code).first():
            code = generate_referral_code()
        user.referral_code = code
        db.commit()
    referrals_made = db.query(Referral).filter(Referral.referrer_id == user.id).all()
    total_referrals = len(referrals_made)
    completed_referrals = sum(1 for r in referrals_made if r.status == "completed")
    rewards_earned = sum(1 for r in referrals_made if r.reward_given)
    return {
        "code": user.referral_code,
        "total_referrals": total_referrals,
        "completed_referrals": completed_referrals,
        "rewards_earned": rewards_earned,
        "link": f"https://sociout-clone.vercel.app/register?ref={user.referral_code}"
    }