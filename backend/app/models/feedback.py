from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = anonymous
    type = Column(String(20), nullable=False)    # "bug", "feature", "praise", "general"
    message = Column(Text, nullable=False)
    screenshot_url = Column(String(255), nullable=True)
    status = Column(String(20), default="new")   # new, in_progress, resolved, closed
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="feedback")

    def __repr__(self):
        return f"<Feedback {self.type} - {self.status}>"