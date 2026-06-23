from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

class PoolAccountCreate(BaseModel):
    email: EmailStr
    channel_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    cookie_json: Optional[str] = None
    proxy: Optional[str] = None

class PoolAccountUpdate(BaseModel):
    email: Optional[EmailStr] = None
    status: Optional[str] = None
    proxy: Optional[str] = None
    daily_subscribe_count: Optional[int] = None
    daily_like_count: Optional[int] = None
    daily_comment_count: Optional[int] = None

class PoolAccountResponse(BaseModel):
    id: uuid.UUID
    email: str
    channel_id: Optional[str]
    status: str
    daily_subscribe_count: int
    daily_like_count: int
    daily_comment_count: int
    last_used_at: Optional[datetime]
    cooldown_until: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True