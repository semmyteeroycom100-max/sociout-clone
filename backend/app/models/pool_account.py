from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base  # Change this to your actual database import
import uuid

# If ActionJob and ActionLog are defined in other files, import them here
# to ensure they're registered before defining relationships
# from app.models.action_job import ActionJob
# from app.models.action_log import ActionLog


class PoolAccount(Base):
    __tablename__ = "pool_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False)
    channel_id = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    cookie_json = Column(Text, nullable=True)  # Encrypted cookie string
    proxy = Column(String(255), nullable=True)
    status = Column(String(20), default='active')  # active, suspended, rate_limited, cooldown
    daily_subscribe_count = Column(Integer, default=0)
    daily_like_count = Column(Integer, default=0)
    daily_comment_count = Column(Integer, default=0)
    last_reset_date = Column(DateTime, default=func.now())
    last_used_at = Column(DateTime, nullable=True)
    cooldown_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships - using string references with full module paths
    # This avoids circular import issues
    action_jobs = relationship(
        "app.models.action_job.ActionJob", 
        back_populates="account",
        lazy="select"
    )
    action_logs = relationship(
        "app.models.action_log.ActionLog", 
        back_populates="account",
        lazy="select"
    )

    def __repr__(self):
        return f"<PoolAccount {self.email}>"