from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ActionType(str, Enum):
    LIKE = "LIKE"
    SUBSCRIBE = "SUBSCRIBE"
    COMMENT = "COMMENT"

class CampaignStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class CampaignCreate(BaseModel):
    name: str
    video_url: str  # Changed from HttpUrl to str
    action_type: ActionType
    target_count: int
    comment_text: Optional[str] = None
    
    @field_validator('video_url')
    def validate_youtube_url(cls, v):
        if not v.startswith(('https://www.youtube.com/', 'https://youtu.be/', 'https://m.youtube.com/')):
            raise ValueError('Must be a valid YouTube URL')
        return v
    
    @field_validator('target_count')
    def validate_target_count(cls, v):
        if v < 1:
            raise ValueError('target_count must be at least 1')
        if v > 100:
            raise ValueError('target_count cannot exceed 100')
        return v

class CampaignResponse(BaseModel):
    id: int
    name: str
    video_url: str
    video_id: str
    action_type: str
    target_count: int
    completed_count: int
    status: CampaignStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CampaignActionResponse(BaseModel):
    id: int
    action_index: int
    success: bool
    error_message: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CampaignDetailResponse(CampaignResponse):
    actions: List[CampaignActionResponse] = []