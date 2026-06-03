import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import SubscriptionPlan, Base

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed():
    db = SessionLocal()
    plans = [
        SubscriptionPlan(name="Free", price_monthly=0, actions_limit=30),
        SubscriptionPlan(name="Pro", price_monthly=2900, actions_limit=500),
        SubscriptionPlan(name="Agency", price_monthly=9900, actions_limit=2000)
    ]
    for plan in plans:
        existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == plan.name).first()
        if not existing:
            db.add(plan)
    db.commit()
    db.close()
    print("✅ Plans seeded successfully")

if __name__ == "__main__":
    seed()