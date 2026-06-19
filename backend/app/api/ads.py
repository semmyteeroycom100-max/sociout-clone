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

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

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
    media_url = data.get("media_url")          # renamed
    media_type = data.get("media_type", "image")
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

    # Create Stripe PaymentIntent
    try:
        intent = stripe.PaymentIntent.create(
            amount=price_cents,
            currency="usd",
            metadata={
                "ad_id": ad.id,
                "user_id": user.id,
                "slot": slot.value,
                "duration_days": duration_days
            }
        )
        ad.stripe_payment_intent_id = intent.id
        db.commit()
    except Exception as e:
        db.delete(ad)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

    return {
        "ad_id": ad.id,
        "client_secret": intent.client_secret,
        "amount": price_cents,
        "currency": "usd"
    }

@router.get("/my-ads")
def get_my_ads(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    ads = db.query(Ad).filter(Ad.user_id == user.id).order_by(Ad.created_at.desc()).all()
    return [{
        "id": a.id,
        "title": a.title,
        "media_url": a.media_url,   # renamed
        "media_type": a.media_type,
        "target_url": a.target_url,
        "slot": a.slot.value,
        "duration_days": a.duration_days,
        "status": a.status.value,
        "impressions": a.impressions,
        "clicks": a.clicks,
        "created_at": a.created_at,
        "start_date": a.start_date,
        "end_date": a.end_date
    } for a in ads]

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        ad_id = int(intent["metadata"]["ad_id"])
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if ad and ad.status == AdStatus.PENDING:
            now = datetime.utcnow()
            ad.status = AdStatus.ACTIVE
            ad.start_date = now
            ad.end_date = now + timedelta(days=ad.duration_days)
            db.commit()
    return {"status": "ok"}

@router.get("/active")
def get_active_ad(slot: str, db: Session = Depends(get_db)):
    try:
        slot_enum = AdSlot(slot)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slot")
    now = datetime.utcnow()
    ad = db.query(Ad).filter(
        Ad.slot == slot_enum,
        Ad.status == AdStatus.ACTIVE,
        Ad.start_date <= now,
        Ad.end_date >= now
    ).order_by(func.random()).first()
    if not ad:
        return None
    ad.impressions += 1
    db.commit()
    return {
        "id": ad.id,
        "image_url": ad.image_url,
        "target_url": ad.target_url,
        "click_url": f"/api/ads/click/{ad.id}"
    }

@router.get("/click/{ad_id}")
def track_click(ad_id: int, redirect_url: str, db: Session = Depends(get_db)):
    from fastapi.responses import RedirectResponse
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if ad:
        ad.clicks += 1
        db.commit()
    redirect_to = ad.target_url if ad else redirect_url
    return RedirectResponse(url=redirect_to)

@router.post("/admin/approve/{ad_id}")
def approve_ad(
    ad_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # You should check admin privileges here (similar to admin.py)
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad.status == AdStatus.PENDING and ad.stripe_payment_intent_id:
        ad.status = AdStatus.ACTIVE
        now = datetime.utcnow()
        ad.start_date = now
        ad.end_date = now + timedelta(days=ad.duration_days)
        db.commit()
        return {"message": "Ad approved"}
    else:
        raise HTTPException(status_code=400, detail="Ad not eligible for approval")
@router.post("/upload")
async def upload_ad_media(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    content_type = file.content_type
    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="File must be an image or video")

    ext = file.filename.split(".")[-1]
    media_type = "image" if content_type.startswith("image/") else "video"
    prefix = "img" if media_type == "image" else "vid"
    filename = f"ad_{prefix}_{datetime.utcnow().timestamp()}_{secrets.token_hex(8)}.{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"/static/ads/{filename}"
    return {"url": url, "media_type": media_type}
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        print("⚠️ STRIPE_WEBHOOK_SECRET not set – webhook disabled")
        return {"status": "ok"}

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        ad_id = int(intent["metadata"]["ad_id"])
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if ad and ad.status == "pending":
            now = datetime.utcnow()
            ad.status = "active"
            ad.start_date = now
            ad.end_date = now + timedelta(days=ad.duration_days)
            db.commit()
            print(f"✅ Ad {ad_id} activated via webhook")
    return {"status": "ok"}