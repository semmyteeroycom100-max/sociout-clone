from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime
import os
import httpx

from app.database import get_db
from app.models.user import User, OAuthToken
from app.core.auth import create_access_token, decode_access_token
from app.core.oauth_config import oauth

router = APIRouter(prefix="/api/auth", tags=["Google OAuth"])

# Get credentials from environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")


@router.get("/google")
async def auth_google(request: Request):
    """Start Google OAuth flow"""
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")  
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google")
async def auth_google(request: Request):
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    return await oauth.google.authorize_redirect(
        request, redirect_uri,
        access_type="offline",
        prompt="consent"
    )
@router.get("/google/callback")
async def auth_google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        # Get token from Google
        token = await oauth.google.authorize_access_token(request)
        
        # Get user info using the access token
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {token["access_token"]}'}
            )
            user_info = resp.json()
        
        email = user_info.get("email")
        username = user_info.get("name", email.split("@")[0])
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            user = User(email=email, username=username, hashed_password=None)
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Store OAuth tokens
        expires_at = None
        if "expires_in" in token:
            expires_at = datetime.utcnow().timestamp() + token["expires_in"]
            expires_at = datetime.fromtimestamp(expires_at)
        
        oauth_token = OAuthToken(
            user_id=user.id,
            provider="google",
            access_token=token.get("access_token"),
            refresh_token=token.get("refresh_token"),
            expires_at=expires_at,
            scope=token.get("scope")
        )
        
        db.query(OAuthToken).filter(
            OAuthToken.user_id == user.id,
            OAuthToken.provider == "google"
        ).delete()
        
        db.add(oauth_token)
        db.commit()
        
        jwt_token = create_access_token(data={"sub": user.email})
        
        # Redirect back to frontend dashboard with token
        redirect_url = f"http://localhost:5173/dashboard?token={jwt_token}"
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")


@router.get("/youtube/status")
async def get_youtube_status(request: Request, db: Session = Depends(get_db)):
    """Check if current user has YouTube connected"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"connected": False}
    
    token = auth_header.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload:
        return {"connected": False}
    
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return {"connected": False}
    
    oauth_token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "google"
    ).first()
    
    return {"connected": oauth_token is not None}


def get_youtube_token(user_id: int, db: Session):
    """Helper function to get valid YouTube token"""
    oauth_token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user_id,
        OAuthToken.provider == "google"
    ).first()
    
    if not oauth_token:
        return None
    
    if oauth_token.expires_at and oauth_token.expires_at <= datetime.utcnow():
        return None
    
    return oauth_token.access_token