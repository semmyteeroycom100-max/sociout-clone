from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

# ===== Pydantic Schemas for Pool Accounts =====
class PoolAccountBase(BaseModel):
    email: str
    channel_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    cookie_json: Optional[str] = None
    proxy: Optional[str] = None

class PoolAccountCreate(PoolAccountBase):
    pass

class PoolAccountUpdate(BaseModel):
    email: Optional[str] = None
    channel_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    cookie_json: Optional[str] = None
    proxy: Optional[str] = None
    status: Optional[str] = None

class PoolAccountResponse(PoolAccountBase):
    id: UUID
    status: str
    daily_subscribe_count: int
    daily_like_count: int
    daily_comment_count: int
    last_reset_date: datetime
    last_used_at: Optional[datetime]
    cooldown_until: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True   # Pydantic V2 uses from_attributes instead of orm_mode