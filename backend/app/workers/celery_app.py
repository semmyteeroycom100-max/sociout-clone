from celery import Celery
import os
from dotenv import load_dotenv
from celery.schedules import crontab

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380")

celery_app = Celery(
    "sociout_clone",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.campaign_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    'start-scheduled-campaigns': {
        'task': 'app.workers.campaign_tasks.start_scheduled_campaigns',
        'schedule': 60.0,  # every 60 seconds
    },
}