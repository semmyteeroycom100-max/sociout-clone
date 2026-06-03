import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

# Set the default Django settings module (if using Django – not needed for FastAPI)
# But Celery needs a broker URL
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery('sociout', broker=REDIS_URL)

# Optional: Configure result backend (if you want to store task results)
app.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Timezone (important for scheduling)
app.conf.timezone = 'UTC'

# Configure periodic tasks (schedules)
app.conf.beat_schedule = {
    'check-scheduled-campaigns-every-minute': {
        'task': 'check_scheduled_campaigns',
        'schedule': 60.0,  # every 60 seconds
    },
    # You can add more tasks here
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

# Import tasks so they are registered
from app.tasks.campaign_tasks import check_scheduled_campaigns