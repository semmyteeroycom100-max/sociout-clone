from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class AdminAction(Base):
    __tablename__ = "admin_actions"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String(50), nullable=False)   # e.g., "promote_user", "delete_article"
    target_id = Column(Integer, nullable=True)
    target_type = Column(String(50), nullable=True)    # e.g., "User", "Article", "Feedback"
    details = Column(JSON, nullable=True)              # Extra context
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    admin = relationship("User", foreign_keys=[admin_id])

    def __repr__(self):
        return f"<AdminAction {self.action_type} by admin {self.admin_id}>"