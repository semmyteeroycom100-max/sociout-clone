from app.models.activity import ActivityLog
from app.database import SessionLocal

def log_activity(user_id: int, action_type: str, description: str = None, extra_data: dict = None):
    db = SessionLocal()
    try:
        log = ActivityLog(
            user_id=user_id,
            action_type=action_type,
            description=description,
            extra_data=extra_data
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log activity: {e}")
    finally:
        db.close()