from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base  # Changed from app.database to app.core.database
import uuid


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("action_jobs.id"), nullable=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("pool_accounts.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action_type = Column(String(20), nullable=False)  # subscribe, like, comment
    target = Column(String(255), nullable=False)      # channel_id or video_id
    success = Column(Boolean, default=False)
    response_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships - using string references with full module paths
    # This avoids circular import issues
    job = relationship(
        "app.models.action_job.ActionJob",
        back_populates="logs",
        lazy="select"
    )
    account = relationship(
        "app.models.pool_account.PoolAccount",
        back_populates="action_logs",
        lazy="select"
    )
    user = relationship(
        "app.models.user.User",
        back_populates="action_logs",  # Changed from backref to back_populates
        lazy="select"
    )

    def __repr__(self):
        return f"<ActionLog {self.action_type} - {'Success' if self.success else 'Failed'}>"