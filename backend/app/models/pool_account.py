from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID

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

    # Relationships
    action_jobs = relationship("ActionJob", back_populates="account")
    action_logs = relationship("ActionLog", back_populates="account")

    def __repr__(self):
        return f"<PoolAccount {self.email}>"