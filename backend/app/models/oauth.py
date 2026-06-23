from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String, default="google")
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    scope = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("app.models.user.User", back_populates="oauth_tokens")

    def __repr__(self):
        return f"<OAuthToken {self.provider} for user {self.user_id}>"
