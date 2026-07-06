from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user, require_admin
from pydantic import BaseModel
import pyotp
import qrcode
from io import BytesIO
import base64

router = APIRouter(prefix="/api/admin/security", tags=["Admin Security"])
security = HTTPBearer()

class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # base64 image

@router.post("/2fa/setup")
def setup_2fa(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    secret = pyotp.random_base32()
    # Store secret temporarily (or directly in user table)
    current_user.twofa_secret = secret
    db.commit()
    # Generate QR code
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name="Sociout")
    img = qrcode.make(uri)
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    qr_b64 = base64.b64encode(buffered.getvalue()).decode()
    return {"secret": secret, "qr_code": qr_b64}

@router.post("/2fa/verify")
def verify_2fa(
    token: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if not current_user.twofa_secret:
        raise HTTPException(status_code=400, detail="2FA not set up")
    totp = pyotp.TOTP(current_user.twofa_secret)
    if totp.verify(token):
        current_user.twofa_enabled = True
        db.commit()
        return {"message": "2FA verified and enabled"}
    raise HTTPException(status_code=400, detail="Invalid token")

@router.post("/2fa/disable")
def disable_2fa(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    current_user.twofa_secret = None
    current_user.twofa_enabled = False
    db.commit()
    return {"message": "2FA disabled"}