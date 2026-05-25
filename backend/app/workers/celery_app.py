from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Use in‑memory broker and no result backend – this completely avoids Redis
celery_app = Celery(
    "sociout_clone",
    broker="memory://",
    backend=None,
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
    task_always_eager=True,          # Run tasks synchronously inside the web process
    task_ignore_result=True,         # Do not attempt to store results (no backend needed)
    task_eager_propagates=True,      # Let exceptions propagate immediately
)

# If you still want scheduled campaigns later, you can add the beat schedule,
# but it won't work without a separate beat process. For now, comment it out or leave empty.
# celery_app.conf.beat_schedule = {}