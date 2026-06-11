from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, Index
from sqlalchemy.sql import func
from app.database import Base
import enum

class AdSlot(str, enum.Enum):
    SIDEBAR = "sidebar"
    TOP_BANNER = "top_banner"
    BETWEEN_CARDS = "between_cards"

class AdStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    EXPIRED = "expired"

class Ad(Base):
    __tablename__ = "ads"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    image_url = Column(Text, nullable=False)
    target_url = Column(Text, nullable=False)
    slot = Column(Enum(AdSlot), nullable=False)
    duration_days = Column(Integer, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(AdStatus), default=AdStatus.PENDING)
    stripe_payment_intent_id = Column(String, nullable=True)
    price_paid = Column(Integer, nullable=True)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('idx_ads_active_slot', 'slot', 'status', 'start_date', 'end_date'),
    )

class AdSlotPrice(Base):
    __tablename__ = "ad_slot_prices"
    id = Column(Integer, primary_key=True, index=True)
    slot = Column(Enum(AdSlot), nullable=False)
    duration_days = Column(Integer, nullable=False)
    price_cents = Column(Integer, nullable=False)
    stripe_price_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())from app.models.user import User
from app.models.ad import Ad, AdSlot, AdStatus, AdSlotPrice
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/ads", tags=["Ads"])
security = HTTPBearer()

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

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
    """Return price in cents for the given slot and duration."""
    price_entry = db.query(AdSlotPrice).filter(
        AdSlotPrice.slot == slot,
        AdSlotPrice.duration_days == duration_days
    ).first()
    if not price_entry:
        raise HTTPException(status_code=400, detail=f"No price defined for slot {slot.value} and {duration_days} days")
    return price_entry.price_cents


# ---------- Advertiser endpoints (authenticated) ----------
@router.get("/slots")
def get_available_slots(db: Session = Depends(get_db)):
    """Return list of available slots with their prices for each duration."""
    prices = db.query(AdSlotPrice).all()
    result = {}
    for p in prices:
        slot = p.slot.value
        if slot not in result:
            result[slot] = []
        result[slot].append({"duration_days": p.duration_days, "price_cents": p.price_cents})
    return result

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

    # Calculate price
    price_cents = get_price_for_slot(slot, duration_days, db)

    # Create pending ad
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
        # If Stripe fails, delete the pending ad
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
        "image_url": a.image_url,
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


# ---------- Stripe webhook ----------
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


# ---------- Public endpoints (no auth) ----------
@router.get("/active")
def get_active_ad(slot: str, db: Session = Depends(get_db)):
    """Return a random active ad for the given slot."""
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
def track_click(ad_id: int, redirect_url: str, db: Session = Depends(get_db)):
    """Increment click count and redirect to target URL."""
    ad = db.query(Ad).filter(Ad.id == ad_id).first()
    if ad:
        ad.clicks += 1
        db.commit()
    # Redirect to the stored target URL or the provided one
    redirect_to = ad.target_url if ad else redirect_url
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=redirect_to)


# ---------- Admin endpoints (optional) ----------
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
        # Payment must have succeeded before approval
        # Optionally verify payment intent status with Stripe
        ad.status = AdStatus.ACTIVE
        now = datetime.utcnow()
        ad.start_date = now
        ad.end_date = now + timedelta(days=ad.duration_days)
        db.commit()
        return {"message": "Ad approved"}
    else:
        raise HTTPException(status_code=400, detail="Ad not eligible for approval")