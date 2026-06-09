from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import stripe
import os
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.ad import Ad, AdSlot, AdStatus, AdSlotPrice
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/ads", tags=["Ads"])
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

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.get("/available-slots")
def get_available_slots(db: Session = Depends(get_db)):
    """Return all slot/duration combinations with prices (for the create ad form)."""
    prices = db.query(AdSlotPrice).all()
    result = {}
    for price in prices:
        slot = price.slot.value
        if slot not in result:
            result[slot] = []
        result[slot].append({
            "duration_days": price.duration_days,
            "price_cents": price.price_cents,
            "price_dollars": round(price.price_cents / 100, 2),
            "stripe_price_id": price.stripe_price_id
        })
    return result

@router.post("/create")
def create_ad(
    data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a pending ad and return Stripe PaymentIntent client secret."""
    user = get_current_user(credentials, db)
    required_fields = ["title", "image_url", "target_url", "slot", "duration_days"]
    for field in required_fields:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")

    slot = data["slot"]
    duration_days = data["duration_days"]
    # Validate slot and duration exist in price table
    price_row = db.query(AdSlotPrice).filter(
        AdSlotPrice.slot == slot,
        AdSlotPrice.duration_days == duration_days
    ).first()
    if not price_row:
        raise HTTPException(status_code=400, detail="Invalid slot or duration")

    amount_cents = price_row.price_cents

    # Create Stripe PaymentIntent
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            metadata={
                "user_id": user.id,
                "slot": slot,
                "duration_days": duration_days,
                "title": data["title"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {str(e)}")

    # Create ad record with pending status
    ad = Ad(
        user_id=user.id,
        title=data["title"],
        image_url=data["image_url"],
        target_url=data["target_url"],
        slot=slot,
        duration_days=duration_days,
        stripe_payment_intent_id=intent["id"],
        price_paid=amount_cents,
        status=AdStatus.PENDING
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)

    return {
        "ad_id": ad.id,
        "client_secret": intent["client_secret"],
        "amount_cents": amount_cents
    }

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe PaymentIntent succeeded event."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        payment_intent_id = intent["id"]
        # Find ad by stripe_payment_intent_id
        ad = db.query(Ad).filter(Ad.stripe_payment_intent_id == payment_intent_id).first()
        if ad:
            # Calculate start and end dates
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=ad.duration_days)
            ad.start_date = start_date
            ad.end_date = end_date
            ad.status = AdStatus.ACTIVE   # or PENDING if you want admin approval; adjust as needed
            db.commit()
            print(f"Ad {ad.id} activated")
    return {"status": "ok"}

@router.get("/my-ads")
def list_my_ads(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    ads = db.query(Ad).filter(Ad.user_id == user.id).order_by(Ad.created_at.desc()).all()
    return [{
        "id": a.id,
        "title": a.title,
        "image_url": a.image_url,
        "target_url": a.target_url,
        "slot": a.slot.value,
        "duration_days": a.duration_days,
        "status": a.status.value,
        "start_date": a.start_date,
        "end_date": a.end_date,
        "price_paid_dollars": round(a.price_paid / 100, 2) if a.price_paid else 0,
        "impressions": a.impressions,
        "clicks": a.clicks,
        "created_at": a.created_at
    } for a in ads]

@router.get("/active")
def get_active_ad(
    slot: str,
    db: Session = Depends(get_db)
):
    """Return a random active ad for the given slot (impressions counted)."""
    now = datetime.utcnow()
    ad = db.query(Ad).filter(
        Ad.slot == slot,
        Ad.status == AdStatus.ACTIVE,
        Ad.start_date <= now,
        Ad.end_date >= now
    ).order_by(func.random()).first()
    if not ad:
        return None
    # Increment impressions
    ad.impressions += 1
    db.commit()
    return {
        "id": ad.id,
        "image_url": ad.image_url,
        "target_url": ad.target_url,
        "click_url": f"/api/ads/click/{ad.id}"
    }

@router.get("/click/{ad_id}")
def click_ad(
    ad_id: int,
    redirect_url: str,
    db: Session = Depends(get_db)
):
    """Increment click count and redirect to target URL."""
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if ad:
        ad.clicks += 1
        db.commit()
    # Redirect to the target URL (provided as query param)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=redirect_url)