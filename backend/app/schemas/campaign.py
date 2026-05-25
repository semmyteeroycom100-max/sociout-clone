from pydantic import BaseModel, field_validator, field_serializer  # add field_serializer
from typing import Optional, List
from datetime import datetime
from enum import Enum
import re

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
    video_url: str
    action_type: ActionType
    target_count: int
    comment_text: Optional[str] = None
    comment_list: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None

    @field_validator('video_url')
    def validate_youtube_url(cls, v):
        # Accept any URL that contains a YouTube video ID and domain
        if not re.search(r'([a-zA-Z0-9_-]{11})', v):
            raise ValueError('Must be a valid YouTube URL')
        if not ('youtube.com' in v or 'youtu.be' in v):
            raise ValueError('Must be a YouTube URL')
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
    action_type: ActionType
    target_count: int
    completed_count: int
    status: CampaignStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None

 @field_serializer('action_type', 'status')
    def serialize_enum(self, value: Enum) -> str:
        return value.value

    class Config:
        from_attributes = True
        # use_enum_values = True  # optional, but we already have explicit serializer
    class Config:
        from_attributes = True
        use_enum_values = True   # ← This converts enums to their string values when serializing

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