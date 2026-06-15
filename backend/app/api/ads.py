from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import stripe
import os
import random
import shutil
import secrets
from typing import Optional
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.models.ad import Ad, AdSlot, AdStatus, AdSlotPrice
from app.core.auth import decode_access_token

router = APIRouter(prefix="/api/ads", tags=["Ads"])
security = HTTPBearer()

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

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

def get_price_for_slot(slot: AdSlot, duration_days: int, db: Session) -> int:
    price_entry = db.query(AdSlotPrice).filter(
        AdSlotPrice.slot == slot,
        AdSlotPrice.duration_days == duration_days
    ).first()
    if not price_entry:
        raise HTTPException(status_code=400, detail=f"No price defined for slot {slot.value} and {duration_days} days")
    return price_entry.price_cents

@router.get("/slots")
def get_available_slots(db: Session = Depends(get_db)):
    prices = db.query(AdSlotPrice).all()
    result = {}
    for p in prices:
        slot = p.slot.value
        if slot not in result:
            result[slot] = []
        result[slot].append({"duration_days": p.duration_days, "price_cents": p.price_cents})
    return result

@router.get("/ping")
async def ping():
    return {"message": "pong"}