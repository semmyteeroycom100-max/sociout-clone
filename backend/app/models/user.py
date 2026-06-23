from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
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
    
    # Profile fields
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    website = Column(String, nullable=True)
    location = Column(String, nullable=True)
    wallet_balance = Column(Integer, default=0)
    role = Column(String, default="user")
    daily_action_limit = Column(Integer, default=5)

    # Relationships
    campaigns = relationship("app.models.campaign.Campaign", back_populates="owner")
    oauth_tokens = relationship("app.models.oauth.OAuthToken", back_populates="user")
    templates = relationship("app.models.campaign.CampaignTemplate", back_populates="owner")
    subscription = relationship("app.models.subscriptions.UserSubscription", back_populates="user", uselist=False)
    action_jobs = relationship("app.models.action_job.ActionJob", back_populates="user")
    action_logs = relationship("app.models.action_log.ActionLog", back_populates="user")

    def __repr__(self):
        return f"<User {self.username}>"
