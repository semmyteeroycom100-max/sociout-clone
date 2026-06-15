from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import stripe
import os
import random
import shutil
import secrets
from typing import Optional
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.models.ad import Ad, AdSlot, AdStatus, AdSlotPrice
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/ads", tags=["Ads"])
security = HTTPBearer()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")   # may be None, but we'll not call stripe yet

UPLOAD_DIR = Path("static/ads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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

def get_price_for_slot(slot: AdSlot, duration_days: int, db: Session) -> int:
    price_entry = db.query(AdSlotPrice).filter(
        AdSlotPrice.slot == slot,
        AdSlotPrice.duration_days == duration_days
    ).first()
    if not price_entry:
        raise HTTPException(status_code=400, detail=f"No price defined for slot {slot.value} and {duration_days} days")
    return price_entry.price_cents

@router.get("/slots")
def get_available_slots(db: Session = Depends(get_db)):
    prices = db.query(AdSlotPrice).all()
    result = {}
    for p in prices:
        slot = p.slot.value
        if slot not in result:
            result[slot] = []
        result[slot].append({"duration_days": p.duration_days, "price_cents": p.price_cents})
    return result

@router.post("/upload")
async def upload_ad_image(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    ext = file.filename.split(".")[-1]
    filename = f"ad_{datetime.utcnow().timestamp()}_{secrets.token_hex(8)}.{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    url = f"/static/ads/{filename}"
    return {"url": url}

@router.post("/create")
async def create_ad(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    data = await request.json()
    title = data.get("title")
    image_url = data.get("image_url")
    target_url = data.get("target_url")
    slot_str = data.get("slot")
    duration_days = data.get("duration_days")

    if not all([title, image_url, target_url, slot_str, duration_days]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        slot = AdSlot(slot_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slot type")

    price_cents = get_price_for_slot(slot, duration_days, db)

    ad = Ad(
        user_id=user.id,
        title=title,
        image_url=image_url,
        target_url=target_url,
        slot=slot,
        duration_days=duration_days,
        price_paid=price_cents,
        status=AdStatus.PENDING
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)

    # TODO: Replace with real Stripe PaymentIntent
    # For now, return a fake client_secret (so frontend can proceed)
    return {
        "ad_id": ad.id,
        "client_secret": "fake_secret_for_testing",
        "amount": price_cents,
        "currency": "usd"
    }

@router.get("/ping")
async def ping():
    return {"message": "pong"}