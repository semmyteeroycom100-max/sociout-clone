from app.models.activity import ActivityLog
from app.database import SessionLocal

def log_activity(user_id: int, action_type: str, description: str = None, metadata: dict = None):
    db = SessionLocal()
    try:
        log = ActivityLog(
            user_id=user_id,
            action_type=action_type,
            description=description,
            metadata=metadata
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log activity: {e}")
    finally:
        db.close()