from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])
security = HTTPBearer()

# ===== SCHEMAS =====
class FeedbackCreate(BaseModel):
    type: str  # bug, feature, praise, general
    message: str
    screenshot_url: Optional[str] = None

class FeedbackUpdate(BaseModel):
    status: str  # new, in_progress, resolved, closed
    admin_notes: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    user_id: Optional[int]
    type: str
    message: str
    screenshot_url: Optional[str]
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ===== PUBLIC ENDPOINTS =====
@router.post("/")
def submit_feedback(
    feedback: FeedbackCreate,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Submit feedback – can be anonymous or authenticated."""
    user = None
    if credentials:
        try:
            user = get_current_user(credentials, db)
        except:
            pass  # If token is invalid, treat as anonymous
    
    new_feedback = Feedback(
        user_id=user.id if user else None,
        type=feedback.type,
        message=feedback.message,
        screenshot_url=feedback.screenshot_url,
        status="new"
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return {
        "message": "Feedback submitted successfully. Thank you!",
        "id": new_feedback.id
    }

# ===== ADMIN ENDPOINTS =====
@router.get("/", response_model=List[FeedbackResponse])
def list_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None
):
    """List all feedback – admin only."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    query = db.query(Feedback)
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    return query.order_by(Feedback.created_at.desc()).all()

@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback_detail(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed feedback – admin only."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return fb

@router.put("/{feedback_id}")
def update_feedback(
    feedback_id: int,
    update: FeedbackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update feedback status and admin notes – admin only."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    if update.status:
        fb.status = update.status
    if update.admin_notes:
        fb.admin_notes = update.admin_notes
    
    fb.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Feedback updated successfully", "status": fb.status}