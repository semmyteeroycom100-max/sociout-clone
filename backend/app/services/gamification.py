from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.badge import Badge, UserBadge
from app.models.campaign import Campaign

def add_xp(user: User, amount: int, db: Session):
    if user.xp is None:
        user.xp = 0
    user.xp += amount
    new_level = (user.xp // 100) + 1
    if new_level > user.level:
        user.level = new_level
    db.commit()
    check_badges(user, db)
    return user.xp, user.level

def update_streak(user: User, db: Session):
    if user.streak_days is None:
        user.streak_days = 0
    today = datetime.utcnow().date()
    if user.last_active:
        last_active_date = user.last_active.date()
        if last_active_date == today:
            return user.streak_days
        elif last_active_date == today - timedelta(days=1):
            user.streak_days += 1
        else:
            user.streak_days = 1
    else:
        user.streak_days = 1
    user.last_active = datetime.utcnow()
    db.commit()
    # Streak rewards
    if user.streak_days == 7:
        add_xp(user, 10, db)
    elif user.streak_days == 14:
        add_xp(user, 25, db)
    elif user.streak_days == 30:
        add_xp(user, 50, db)
    check_badges(user, db)
    return user.streak_days

def check_badges(user: User, db: Session):
    # Fetch all badges from DB
    all_badges = db.query(Badge).all()
    for badge in all_badges:
        # Check if already earned
        earned = db.query(UserBadge).filter(
            UserBadge.user_id == user.id,
            UserBadge.badge_id == badge.id
        ).first()
        if earned:
            continue
        # Check criteria
        earned_bool = False
        if badge.criteria == "first_campaign":
            count = db.query(Campaign).filter(Campaign.user_id == user.id).count()
            if count >= 1:
                earned_bool = True
        elif badge.criteria == "complete_10_campaigns":
            count = db.query(Campaign).filter(Campaign.user_id == user.id, Campaign.status == "completed").count()
            if count >= 10:
                earned_bool = True
        elif badge.criteria == "streak_7":
            if user.streak_days >= 7:
                earned_bool = True
        # ... add more criteria
        if earned_bool:
            new_badge = UserBadge(user_id=user.id, badge_id=badge.id)
            db.add(new_badge)
            add_xp(user, badge.xp_reward, db)  # award XP for badge
            # We can trigger notification here (later)
    db.commit()