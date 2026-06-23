from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid
import enum


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class CampaignActionType(str, enum.Enum):
    LIKE = "like"
    COMMENT = "comment"
    SUBSCRIBE = "subscribe"
    VIEW = "view"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=False)
    video_id = Column(String(100), nullable=True)
    action_type = Column(String(50), nullable=False)  # like, comment, subscribe
    target_count = Column(Integer, nullable=False, default=10)
    current_count = Column(Integer, default=0)
    status = Column(String(20), default="draft")
    schedule_time = Column(DateTime, nullable=True)
    comment_text = Column(Text, nullable=True)  # For comment campaigns
    webhook_url = Column(String(500), nullable=True)
    platform = Column(String(20), default="youtube")
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("app.models.user.User", back_populates="campaigns")
    actions = relationship("app.models.campaign.CampaignAction", back_populates="campaign", cascade="all, delete-orphan")
    action_logs = relationship("app.models.action_log.ActionLog", back_populates="campaign")

    def __repr__(self):
        return f"<Campaign {self.name} - {self.status}>"


class CampaignAction(Base):
    __tablename__ = "campaign_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    account_id = Column(UUID(as_uuid=True), ForeignKey("pool_accounts.id"), nullable=True)
    target = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")  # pending, success, failed
    error_message = Column(Text, nullable=True)
    performed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    campaign = relationship("app.models.campaign.Campaign", back_populates="actions")
    account = relationship("app.models.pool_account.PoolAccount", back_populates="campaign_actions")

    def __repr__(self):
        return f"<CampaignAction {self.id} - {self.status}>"


class CampaignTemplate(Base):
    __tablename__ = "campaign_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    config = Column(JSON, nullable=False)  # Stores the campaign configuration
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("app.models.user.User", back_populates="templates")

    def __repr__(self):
        return f"<CampaignTemplate {self.name}>"