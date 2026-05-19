import os
import json
import random
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User, ThumbnailTest
from app.core.auth import decode_access_token
from app.services.youtube import YouTubeService
from app.api.oauth import get_youtube_token

router = APIRouter(prefix="/api/thumbnail-test", tags=["Thumbnail A/B Testing"])
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

# For simplicity, we'll store uploaded thumbnails in a local folder.
# In production, use cloud storage (e.g., Render disk, Cloudinary, S3).
UPLOAD_DIR = "static/thumbnails"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/create")
async def create_test(
    video_url: str = Form(...),
    thumbnail_a: UploadFile = File(...),
    thumbnail_b: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    
    # Validate YouTube URL and extract video ID
    from app.api.campaigns import extract_video_id
    try:
        video_id = extract_video_id(video_url)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    # Save uploaded files
    import uuid
    ext = thumbnail_a.filename.split('.')[-1]
    filename_a = f"{uuid.uuid4()}.{ext}"
    filepath_a = os.path.join(UPLOAD_DIR, filename_a)
    with open(filepath_a, "wb") as f:
        f.write(await thumbnail_a.read())
    
    ext_b = thumbnail_b.filename.split('.')[-1]
    filename_b = f"{uuid.uuid4()}.{ext_b}"
    filepath_b = os.path.join(UPLOAD_DIR, filename_b)
    with open(filepath_b, "wb") as f:
        f.write(await thumbnail_b.read())
    
    # Create URLs (assuming backend serves static files)
    base_url = os.getenv("BASE_URL", "https://sociout-backend.onrender.com")
    thumbnail_a_url = f"{base_url}/static/thumbnails/{filename_a}"
    thumbnail_b_url = f"{base_url}/static/thumbnails/{filename_b}"
    
    # Create test entry
    test = ThumbnailTest(
        user_id=user.id,
        video_url=video_url,
        video_id=video_id,
        thumbnail_a_url=thumbnail_a_url,
        thumbnail_b_url=thumbnail_b_url,
        status="running"
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    
    return {"id": test.id, "message": "Test created", "thumbnail_a": thumbnail_a_url, "thumbnail_b": thumbnail_b_url}

@router.get("/serve/{video_id}")
async def get_thumbnail(video_id: str, request: Request, db: Session = Depends(get_db)):
    """Returns the thumbnail variant to show to a user, increments impression count."""
    # You'd typically use a session ID or user cookie to ensure consistent variant per viewer.
    # For simplicity, we'll just alternate or random.
    tests = db.query(ThumbnailTest).filter(
        ThumbnailTest.video_id == video_id,
        ThumbnailTest.status == "running"
    ).all()
    if not tests:
        return {"error": "No active test for this video"}
    # For demo, take the first active test
    test = tests[0]
    # Randomly choose variant A or B (50/50)
    variant = random.choice(['a', 'b'])
    if variant == 'a':
        test.impressions_a += 1
        thumbnail_url = test.thumbnail_a_url
    else:
        test.impressions_b += 1
        thumbnail_url = test.thumbnail_b_url
    db.commit()
    return {"thumbnail_url": thumbnail_url, "variant": variant, "test_id": test.id}

@router.post("/click/{test_id}")
async def record_click(test_id: int, variant: str = Form(...), db: Session = Depends(get_db)):
    test = db.query(ThumbnailTest).filter(ThumbnailTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if variant == 'a':
        test.clicks_a += 1
    elif variant == 'b':
        test.clicks_b += 1
    else:
        raise HTTPException(status_code=400, detail="Invalid variant")
    db.commit()
    return {"message": "Click recorded"}

@router.get("/results/{test_id}")
async def get_results(test_id: int, credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    user = get_current_user(credentials, db)
    test = db.query(ThumbnailTest).filter(
        ThumbnailTest.id == test_id,
        ThumbnailTest.user_id == user.id
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    # Simple CTR calculation
    ctr_a = test.clicks_a / test.impressions_a if test.impressions_a > 0 else 0
    ctr_b = test.clicks_b / test.impressions_b if test.impressions_b > 0 else 0
    return {
        "id": test.id,
        "video_url": test.video_url,
        "impressions_a": test.impressions_a,
        "clicks_a": test.clicks_a,
        "ctr_a": ctr_a,
        "impressions_b": test.impressions_b,
        "clicks_b": test.clicks_b,
        "ctr_b": ctr_b,
        "status": test.status,
        "winner": test.winner
    }