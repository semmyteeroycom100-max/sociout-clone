from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID

class ActionJob(Base):
    __tablename__ = "action_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action_type = Column(String(20), nullable=False)  # subscribe, like, comment
    target = Column(String(255), nullable=False)      # channel_id or video_id
    status = Column(String(20), default='pending')    # pending, processing, completed, failed
    account_id = Column(UUID(as_uuid=True), ForeignKey("pool_accounts.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    attempts = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("User", backref="action_jobs")
    account = relationship("PoolAccount", back_populates="action_jobs")
    logs = relationship("ActionLog", back_populates="job")

    def __repr__(self):
        return f"<ActionJob {self.id} {self.action_type} {self.status}>"