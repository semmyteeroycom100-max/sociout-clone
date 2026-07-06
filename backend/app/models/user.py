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
    is_super_admin = Column(Boolean, default=False)   
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

    # Gamification fields
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_days = Column(Integer, default=0)
    last_active = Column(DateTime(timezone=True), nullable=True)

    # 2FA fields
    twofa_secret = Column(String, nullable=True)            # NEW
    twofa_enabled = Column(Boolean, default=False)          # NEW

    # ===== REFERRAL FIELDS (NEW) =====
    referral_code = Column(String(50), unique=True, index=True, nullable=True)
    referred_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    thumbnail_tests = relationship("app.models.thumbnail.ThumbnailTest", back_populates="owner")
    campaigns = relationship("app.models.campaign.Campaign", back_populates="owner")
    oauth_tokens = relationship("app.models.oauth.OAuthToken", back_populates="user")
    templates = relationship("app.models.campaign.CampaignTemplate", back_populates="owner")
    subscription = relationship("app.models.subscriptions.UserSubscription", back_populates="user", uselist=False)
    action_jobs = relationship("app.models.action_job.ActionJob", back_populates="user")
    action_logs = relationship("app.models.action_log.ActionLog", back_populates="user")
    feedback = relationship("app.models.feedback.Feedback", back_populates="user")
    support_contributions = relationship("app.models.support.SupportContribution", back_populates="user")
    admin_actions = relationship("app.models.admin_action.AdminAction", foreign_keys="[AdminAction.admin_id]", back_populates="admin")
    # Referral relationships
    referrals_made = relationship("Referral", foreign_keys="[Referral.referrer_id]", back_populates="referrer")
    referrals_received = relationship("Referral", foreign_keys="[Referral.referred_id]", back_populates="referred")
    badges = relationship("UserBadge", back_populates="user")
    wallet_audits = relationship("WalletAudit", back_populates="user")

    def __repr__(self):
        return f"<User {self.username}>"