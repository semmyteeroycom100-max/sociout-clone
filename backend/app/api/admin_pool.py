from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.pool_account import PoolAccount
from app.schemas.pool_account import PoolAccountCreate, PoolAccountUpdate, PoolAccountResponse
from app.services.account_encryption import encrypt_token
from app.core.auth import decode_access_token
from datetime import datetime
import os

router = APIRouter(prefix="/api/admin/pool", tags=["Admin Pool"])
security = HTTPBearer()

def require_admin(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@router.post("/accounts")
def add_account(
    account_data: PoolAccountCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)

    # Encrypt tokens before storing
    access_enc = encrypt_token(account_data.access_token) if account_data.access_token else None
    refresh_enc = encrypt_token(account_data.refresh_token) if account_data.refresh_token else None
    cookie_enc = encrypt_token(account_data.cookie_json) if account_data.cookie_json else None

    account = PoolAccount(
        email=account_data.email,
        channel_id=account_data.channel_id,
        access_token=access_enc,
        refresh_token=refresh_enc,
        token_expiry=account_data.token_expiry,
        cookie_json=cookie_enc,
        proxy=account_data.proxy,
        status='active'
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return {"message": "Account added", "id": account.id}

@router.get("/accounts")
def list_accounts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    require_admin(credentials, db)
    accounts = db.query(PoolAccount).offset(skip).limit(limit).all()
    return [PoolAccountResponse.from_orm(a) for a in accounts]

@router.put("/accounts/{account_id}")
def update_account(
    account_id: str,
    account_data: PoolAccountUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)
    account = db.query(PoolAccount).filter(PoolAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    for key, value in account_data.dict(exclude_unset=True).items():
        setattr(account, key, value)
    db.commit()
    return {"message": "Account updated"}

@router.delete("/accounts/{account_id}")
def delete_account(
    account_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    require_admin(credentials, db)
    account = db.query(PoolAccount).filter(PoolAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.commit()
    return {"message": "Account deleted"}