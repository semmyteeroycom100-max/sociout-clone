from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ThumbnailTest(Base):
    __tablename__ = "thumbnail_tests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_url = Column(String, nullable=False)
    video_id = Column(String, nullable=False)
    thumbnail_a_url = Column(String, nullable=False)
    thumbnail_b_url = Column(String, nullable=False)
    impressions_a = Column(Integer, default=0)
    impressions_b = Column(Integer, default=0)
    clicks_a = Column(Integer, default=0)
    clicks_b = Column(Integer, default=0)
    status = Column(String, default="running")
    winner = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    owner = relationship("app.models.user.User", back_populates="thumbnail_tests")
