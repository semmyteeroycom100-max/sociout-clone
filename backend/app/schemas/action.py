from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

class ActionRequest(BaseModel):
    action_type: str  # subscribe, like, comment
    target: str       # channel_id or video_id

class ActionResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    created_at: datetime

class ActionStatusResponse(BaseModel):
    job_id: uuid.UUID
    status: str
    action_type: str
    target: str
    account_id: Optional[uuid.UUID]
    error_message: Optional[str]
    attempts: int
    created_at: datetime
    updated_at: datetime