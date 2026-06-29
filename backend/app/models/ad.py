from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index, Enum
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
    media_url = Column(Text, nullable=False)           # renamed from image_url
    media_type = Column(String, default="image")       # 'image' or 'video'
    target_url = Column(Text, nullable=False)
    slot = Column(Enum(AdSlot), nullable=False)        # uses SQLAlchemy Enum
    duration_days = Column(Integer, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default=AdStatus.PENDING.value)
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
    slot = Column(String, nullable=False)              # simple string, not Enum
    duration_days = Column(Integer, nullable=False)
    price_cents = Column(Integer, nullable=False)
    stripe_price_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())