from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class SupportContribution(Base):
    __tablename__ = "support_contributions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)          # in cents
    tier = Column(String(20), nullable=True)          # supporter, patron, benefactor
    stripe_payment_id = Column(String(255), nullable=True)
    status = Column(String(20), default="pending")    # pending, succeeded, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="support_contributions")

    def __repr__(self):
        return f"<SupportContribution ${self.amount/100} from user {self.user_id}>"