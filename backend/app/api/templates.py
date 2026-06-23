from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from app.database import get_db
from app.models.user import User
from app.models.campaign import CampaignTemplate, CampaignActionType
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/templates", tags=["Campaign Templates"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

class TemplateCreate(BaseModel):
    name: str
    video_url: str
    action_type: str
    target_count: int
    comment_text: Optional[str] = None
    comment_list: Optional[List[str]] = None
    scheduled_days_offset: Optional[int] = None

class TemplateResponse(TemplateCreate):
    id: int
    created_at: str

    class Config:
        from_attributes = True

@router.post("/", response_model=TemplateResponse)
def create_template(
    data: TemplateCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    # Convert comment_list to JSON string
    comment_list_json = json.dumps(data.comment_list) if data.comment_list else None
    template = CampaignTemplate(
        user_id=user.id,
        name=data.name,
        video_url=data.video_url,
        action_type=CampaignActionType[data.action_type],
        target_count=data.target_count,
        comment_text=data.comment_text,
        comment_list=comment_list_json,
        scheduled_days_offset=data.scheduled_days_offset
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {
        "id": template.id,
        "name": template.name,
        "video_url": template.video_url,
        "action_type": template.action_type.value,
        "target_count": template.target_count,
        "comment_text": template.comment_text,
        "comment_list": json.loads(template.comment_list) if template.comment_list else None,
        "scheduled_days_offset": template.scheduled_days_offset,
        "created_at": template.created_at.isoformat()
    }

@router.get("/", response_model=List[TemplateResponse])
def list_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    templates = db.query(CampaignTemplate).filter(
        CampaignTemplate.user_id == user.id
    ).order_by(CampaignTemplate.created_at.desc()).all()
    result = []
    for t in templates:
        result.append({
            "id": t.id,
            "name": t.name,
            "video_url": t.video_url,
            "action_type": t.action_type.value,
            "target_count": t.target_count,
            "comment_text": t.comment_text,
            "comment_list": json.loads(t.comment_list) if t.comment_list else None,
            "scheduled_days_offset": t.scheduled_days_offset,
            "created_at": t.created_at.isoformat()
        })
    return result

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    template = db.query(CampaignTemplate).filter(
        CampaignTemplate.id == template_id,
        CampaignTemplate.user_id == user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}


