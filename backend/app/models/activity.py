from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String, nullable=False)  # e.g., "campaign_started", "video_watched", "subscriber_gained"
    description = Column(String, nullable=True)   # human-readable description
    extra_data = Column(JSON, nullable=True)       # extra data (campaign_id, video_id, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
