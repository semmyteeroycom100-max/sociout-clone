from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os
import uuid
import shutil
from app.database import get_db
from app.core.auth import decode_access_token
from app.models.user import User

router = APIRouter(prefix="/api/upload", tags=["Upload"])
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

UPLOAD_DIR = "static/ads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/ad-image")
async def upload_ad_image(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images allowed")
    
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the public URL (you may need to serve static files)
    # For Render, you need to serve static files from `/static` route.
    public_url = f"/static/ads/{filename}"
    return {"url": public_url}