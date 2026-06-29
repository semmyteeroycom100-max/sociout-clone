from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/admin/users", tags=["Admin Users"])
security = HTTPBearer()

# ===== SCHEMAS =====
class UserAdminResponse(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool
    is_active: bool
    created_at: str

    class Config:
        orm_mode = True

# ===== ENDPOINTS =====
@router.get("/", response_model=List[UserAdminResponse])
def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all users – admin only."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    users = db.query(User).all()
    return users

@router.put("/{user_id}/role")
def toggle_admin_role(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Promote or demote a user to/from admin – admin only."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user.is_admin = not target_user.is_admin
    db.commit()
    return {
        "message": f"User {target_user.username} admin status set to {target_user.is_admin}",
        "is_admin": target_user.is_admin
    }