from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.admin_action import AdminAction
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/admin/audit", tags=["Admin Audit"])
security = HTTPBearer()

# ===== SCHEMAS =====
class AdminActionResponse(BaseModel):
    id: int
    admin_id: int
    admin_username: str
    action_type: str
    target_id: Optional[int]
    target_type: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True

# ===== ENDPOINTS =====
@router.get("/", response_model=List[AdminActionResponse])
def get_audit_log(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    limit: int = 100,
    skip: int = 0,
    action_type: Optional[str] = None
):
    """Get the audit log of admin actions – admin only."""
    # Verify the current user is an admin
    current_user = get_current_user(credentials, db)
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")

    query = db.query(AdminAction)
    if action_type:
        query = query.filter(AdminAction.action_type == action_type)

    actions = query.order_by(AdminAction.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for action in actions:
        # Fetch admin username
        admin_user = db.query(User).filter(User.id == action.admin_id).first()
        result.append({
            "id": action.id,
            "admin_id": action.admin_id,
            "admin_username": admin_user.username if admin_user else "Unknown",
            "action_type": action.action_type,
            "target_id": action.target_id,
            "target_type": action.target_type,
            "details": action.details or {},
            "ip_address": action.ip_address,
            "created_at": action.created_at,
        })

    return result