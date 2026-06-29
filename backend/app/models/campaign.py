from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

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
    FOLLOW = "FOLLOW"

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
    webhook_url = Column(String, nullable=True)
    webhook_secret = Column(String, nullable=True)
    platform = Column(String, default='youtube')

    owner = relationship("User", back_populates="campaigns")
    actions = relationship("CampaignAction", back_populates="campaign")
    action_logs = relationship("ActionLog", back_populates="campaign")  # <-- FIXED: added back_populates

    def __repr__(self):
        return f"<Campaign {self.name} - {self.status.value}>"

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

    def __repr__(self):
        return f"<CampaignAction {self.id} - {'Success' if self.success else 'Failed'}>"

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

    def __repr__(self):
        return f"<CampaignTemplate {self.name}>"
