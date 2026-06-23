from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from app.database import get_db
from app.models.user import User
from app.models.oauth import OAuthToken
from app.core.auth import decode_access_token
import os
import traceback

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])
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

def get_valid_credentials(oauth_token: OAuthToken, db: Session):
    """Refresh token if expired and return valid credentials."""
    creds = Credentials(
        token=oauth_token.access_token,
        refresh_token=oauth_token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/youtube.readonly",
                "https://www.googleapis.com/auth/yt-analytics.readonly"]
    )
    
    # If token is expired and we have a refresh token, refresh it
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleAuthRequest())
            # Update the stored token in the database
            oauth_token.access_token = creds.token
            oauth_token.expires_at = creds.expiry.replace(tzinfo=None) if creds.expiry else None
            db.commit()
            print(f"Refreshed token for user {oauth_token.user_id}")
        except Exception as e:
            print(f"Token refresh failed: {e}")
            raise HTTPException(status_code=401, detail="YouTube token expired. Please reconnect your YouTube account.")
    
    return creds

def get_youtube_analytics_service(creds):
    """Build YouTube Analytics service using credentials."""
    return build("youtubeAnalytics", "v2", credentials=creds)

@router.get("/channel")
async def get_channel_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        user = get_current_user(credentials, db)
        
        oauth_token = db.query(OAuthToken).filter(
            OAuthToken.user_id == user.id,
            OAuthToken.provider == "google"
        ).first()
        if not oauth_token:
            raise HTTPException(status_code=401, detail="YouTube not connected")
        
        # Get valid credentials (auto-refresh if needed)
        creds = get_valid_credentials(oauth_token, db)
        
        # Get channel ID from YouTube Data API v3
        youtube_data = build("youtube", "v3", credentials=creds)
        channels_response = youtube_data.channels().list(part="id", mine=True).execute()
        
        if not channels_response.get("items"):
            raise HTTPException(status_code=404, detail="No YouTube channel found")
        channel_id = channels_response["items"][0]["id"]
        
        # Fetch analytics for last 28 days using the same credentials
        analytics = get_youtube_analytics_service(creds)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=28)
        
        report = analytics.reports().query(
            ids=f"channel=={channel_id}",
            startDate=start_date.isoformat(),
            endDate=end_date.isoformat(),
            metrics="views,likes,subscribersGained,subscribersLost,estimatedMinutesWatched",
            dimensions="day",
            sort="day"
        ).execute()
        
        return report
    
    except HttpError as e:
        error_detail = f"YouTube API Error: {e.status_code} - {e.reason}"
        print(error_detail)
        traceback.print_exc()
        # Provide user-friendly message based on status code
        if e.status_code == 403:
            raise HTTPException(status_code=403, detail="YouTube API access denied. Check your OAuth scopes.")
        elif e.status_code == 400:
            raise HTTPException(status_code=400, detail="Invalid request. Possibly no analytics data for this period.")
        else:
            raise HTTPException(status_code=502, detail=error_detail)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
