from celery import shared_task
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.action_job import ActionJob
from app.models.pool_account import PoolAccount
from app.models.action_log import ActionLog
from app.services.account_selector import AccountSelector
from app.services.action_executor import ActionExecutor
from app.services.account_encryption import decrypt_token
from datetime import datetime
import random

@shared_task(bind=True, max_retries=3)
def execute_action(self, job_id: str):
    """
    Celery task to execute a queued action.
    """
    db = SessionLocal()
    try:
        job = db.query(ActionJob).filter(ActionJob.id == job_id).first()
        if not job:
            raise ValueError("Job not found")

        # Update status to processing
        job.status = 'processing'
        db.commit()

        # Get account
        account = db.query(PoolAccount).filter(PoolAccount.id == job.account_id).first()
        if not account:
            raise ValueError("Account not found")

        # Execute action
        executor = ActionExecutor(account)
        result = None

        if job.action_type == 'subscribe':
            result = executor.subscribe(job.target)
        elif job.action_type == 'like':
            result = executor.like_video(job.target)
        elif job.action_type == 'comment':
            # Use a random comment from the job's metadata if available
            comment_text = job.metadata.get('comment_text', 'Great video!') if hasattr(job, 'metadata') else 'Great video!'
            result = executor.comment(job.target, comment_text)

        # Log result
        log = ActionLog(
            job_id=job.id,
            account_id=account.id,
            user_id=job.user_id,
            action_type=job.action_type,
            target=job.target,
            success=result.get('success', False),
            response_code=result.get('status_code'),
            response_body=result.get('response'),
            error_message=result.get('error')
        )
        db.add(log)

        if result.get('success'):
            job.status = 'completed'
            db.commit()

            # Update account usage
            selector = AccountSelector(db)
            selector.mark_used(account.id, job.action_type)

        else:
            # Handle failure
            error = result.get('error')
            job.attempts += 1
            job.error_message = error

            if 'rate_limited' in error:
                # Apply cooldown
                selector = AccountSelector(db)
                selector.mark_rate_limited(account.id, 60)
                # Retry with another account
                job.status = 'pending'
                job.account_id = None
                db.commit()
                # Re‑queue
                execute_action.apply_async(args=[job.id], countdown=random.randint(10, 30))
                return

            elif 'daily_limit_reached' in error:
                # Mark account as rate‑limited for 24h
                selector = AccountSelector(db)
                selector.mark_rate_limited(account.id, 24*60)
                job.status = 'pending'
                job.account_id = None
                db.commit()
                execute_action.apply_async(args=[job.id], countdown=60)
                return

            elif 'spam_filter' in error:
                # Do not retry – mark as failed
                job.status = 'failed'
                db.commit()
                return

            else:
                # Retry with same account or fallback
                if job.attempts < job.max_retries:
                    job.status = 'pending'
                    db.commit()
                    self.retry(countdown=2 ** job.attempts * 10)
                else:
                    job.status = 'failed'
                    db.commit()
                    return

        db.commit()

    except Exception as e:
        # Log error and retry
        job.status = 'failed'
        job.error_message = str(e)
        db.commit()
        raise

    finally:
        db.close()