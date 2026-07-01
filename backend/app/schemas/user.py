from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    referral_code: Optional[str] = None   # <-- ADDED

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    wallet_balance: int = 0
    role: str = "user"
    daily_action_limit: int = 5

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str