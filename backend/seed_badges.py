from app.database import SessionLocal
from app.models.badge import Badge

badges = [
    {"name": "First Campaign", "description": "Create your first campaign", "icon": "🚀", "criteria": "first_campaign", "xp_reward": 10},
    {"name": "Campaign Pro", "description": "Complete 10 campaigns", "icon": "🎯", "criteria": "complete_10_campaigns", "xp_reward": 50},
    {"name": "Streak Master", "description": "7-day login streak", "icon": "🔥", "criteria": "streak_7", "xp_reward": 20},
]

db = SessionLocal()
for b in badges:
    if not db.query(Badge).filter(Badge.name == b["name"]).first():
        db.add(Badge(**b))
db.commit()
print("Badges seeded.")