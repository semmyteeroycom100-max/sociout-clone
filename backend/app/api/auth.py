from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.referral import Referral  # <-- ADDED
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.core.auth import verify_password, get_password_hash, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Extend UserCreate schema to include optional referral_code (already done in schemas/user.py)
# If not, we'll handle it as a separate field

@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # ===== REFERRAL HANDLING =====
    # The referral_code is passed in the request body (we'll add it to UserCreate schema)
    # If not added, we can read it from the request body separately, but we'll assume it's there.
    # We'll get it from user_data if it exists, or we can add a field to UserCreate.
    # To be safe, we'll use a separate parameter or rely on the schema.
    # Since we have the schema, we'll add it there.
    referral_code = getattr(user_data, 'referral_code', None)
    if referral_code:
        referrer = db.query(User).filter(User.referral_code == referral_code).first()
        if referrer and referrer.id != new_user.id:
            # Create referral record
            referral = Referral(
                referrer_id=referrer.id,
                referred_id=new_user.id,
                status="pending"
            )
            db.add(referral)
            db.commit()
    
    return new_user

@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(token: str, db: Session):
    """Helper function to get current user from token"""
    payload = decode_access_token(token)
    if not payload:
        return None
    
    email = payload.get("sub")
    if not email:
        return None
    
    user = db.query(User).filter(User.email == email).first()
    return user

@router.options("/register")
async def options_register():
    return {"message": "OK"}