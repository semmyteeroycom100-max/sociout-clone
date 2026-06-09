from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    campaigns = relationship("Campaign", back_populates="owner")
    oauth_tokens = relationship("OAuthToken", back_populates="user")
    templates = relationship("CampaignTemplate", back_populates="owner")
    subscription = relationship("UserSubscription", back_populates="user", uselist=False)
    thumbnail_tests = relationship("ThumbnailTest", back_populates="owner")
    ads = relationship("Ad", back_populates="owner")   # new

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String, default="google")
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    scope = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="oauth_tokens")

class CampaignStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CampaignActionType(enum.Enum):
    LIKE = "LIKE"
    SUBSCRIBE = "SUBSCRIBE"
    COMMENT = "COMMENT"
    FOLLOW = "FOLLOW"   # for TikTok follow

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    video_url = Column(String, nullable=False)
    video_id = Column(String, nullable=False)
    channel_id = Column(String, nullable=True)
    action_type = Column(Enum(CampaignActionType), nullable=False)
    target_count = Column(Integer, nullable=False)
    completed_count = Column(Integer, default=0)
    comment_text = Column(Text, nullable=True)
    comment_list = Column(Text, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.PENDING)
    celery_task_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    # Webhook fields
    webhook_url = Column(String, nullable=True)
    webhook_secret = Column(String, nullable=True)
    platform = Column(String, default='youtube')  # 'youtube' or 'tiktok'
    
    owner = relationship("User", back_populates="campaigns")
    actions = relationship("CampaignAction", back_populates="campaign")

class CampaignAction(Base):
    __tablename__ = "campaign_actions"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    action_index = Column(Integer, nullable=False)
    success = Column(Boolean, default=False)
    youtube_response = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    campaign = relationship("Campaign", back_populates="actions")

class CampaignTemplate(Base):
    __tablename__ = "campaign_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    video_url = Column(String, nullable=False)
    action_type = Column(Enum(CampaignActionType), nullable=False)
    target_count = Column(Integer, nullable=False)
    comment_text = Column(Text, nullable=True)
    comment_list = Column(Text, nullable=True)
    scheduled_days_offset = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="templates")

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    price_monthly = Column(Integer, nullable=False)  # in cents
    actions_limit = Column(Integer, nullable=False)
    stripe_price_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    status = Column(String, default="active")
    current_period_end = Column(DateTime, nullable=True)
    actions_used_this_month = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="subscription")
    plan = relationship("SubscriptionPlan")

class ThumbnailTest(Base):
    __tablename__ = "thumbnail_tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_url = Column(String, nullable=False)
    video_id = Column(String, nullable=False)
    thumbnail_a_url = Column(String, nullable=False)
    thumbnail_b_url = Column(String, nullable=False)
    impressions_a = Column(Integer, default=0)
    impressions_b = Column(Integer, default=0)
    clicks_a = Column(Integer, default=0)
    clicks_b = Column(Integer, default=0)
    status = Column(String, default="running")
    winner = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="thumbnail_tests")