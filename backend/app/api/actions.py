from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.action_job import ActionJob
from app.models.pool_account import PoolAccount
from app.schemas.action import ActionRequest, ActionResponse, ActionStatusResponse
from app.services.account_selector import AccountSelector
from app.services.rate_limiter import RateLimiter
from app.core.auth import decode_access_token
from app.tasks.action_tasks import execute_action
from datetime import datetime

router = APIRouter(prefix="/api/actions", tags=["Actions"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/{action_type}")
async def request_action(
    action_type: str,
    request: ActionRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Request an action (subscribe, like, comment) using the shared pool.
    """
    user = get_current_user(credentials, db)

    # Validate action type
    if action_type not in ['subscribe', 'like', 'comment']:
        raise HTTPException(status_code=400, detail="Invalid action type")

    # Per‑user rate limiting (5 actions per hour)
    if not RateLimiter.check_user_limit(str(user.id), action_type, 5):
        raise HTTPException(status_code=429, detail="User action limit exceeded")

    # Select an available account
    selector = AccountSelector(db)
    account = selector.select_account(action_type)
    if not account:
        raise HTTPException(status_code=503, detail="No YouTube accounts available")

    # Create job
    job = ActionJob(
        user_id=user.id,
        action_type=action_type,
        target=request.target,
        account_id=account.id,
        status='pending'
    )
    db.add(job)
    db.commit()

    # Enqueue task
    execute_action.apply_async(args=[str(job.id)])

    return ActionResponse(
        job_id=job.id,
        status=job.status,
        created_at=job.created_at
    )

@router.get("/status/{job_id}")
def get_action_status(
    job_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    job = db.query(ActionJob).filter(ActionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your job")

    return ActionStatusResponse(
        job_id=job.id,
        status=job.status,
        action_type=job.action_type,
        target=job.target,
        account_id=job.account_id,
        error_message=job.error_message,
        attempts=job.attempts,
        created_at=job.created_at,
        updated_at=job.updated_at
    )