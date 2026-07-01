from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User

def add_xp(user: User, amount: int, db: Session):
    """Add XP to a user, update level and streak."""
    user.xp += amount
    # Level up: every 100 XP = +1 level
    new_level = (user.xp // 100) + 1
    if new_level > user.level:
        user.level = new_level
    db.commit()
    return user.xp, user.level

def update_streak(user: User, db: Session):
    """Update daily streak if user is active today."""
    today = datetime.utcnow().date()
    if user.last_active:
        last_active_date = user.last_active.date()
        if last_active_date == today:
            # Already active today, no change
            return user.streak_days
        elif last_active_date == today - timedelta(days=1):
            # Consecutive day
            user.streak_days += 1
        else:
            # Streak broken
            user.streak_days = 1
    else:
        # First activity
        user.streak_days = 1
    user.last_active = datetime.utcnow()
    db.commit()
    return user.streak_days