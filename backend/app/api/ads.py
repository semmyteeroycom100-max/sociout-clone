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

@router.get("/ping")
async def ping():
    return {"message": "pong"}