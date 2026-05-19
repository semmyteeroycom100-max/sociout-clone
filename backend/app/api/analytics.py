from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.database import get_db
from app.models.user import User, OAuthToken
from app.core.auth import decode_access_token

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

def get_youtube_analytics_service(oauth_token: OAuthToken):
    creds = Credentials(
        token=oauth_token.access_token,
        refresh_token=oauth_token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/yt-analytics.readonly"]
    )
    return build("youtubeAnalytics", "v2", credentials=creds)

@router.get("/channel")
async def get_channel_analytics(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    oauth_token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "google"
    ).first()
    if not oauth_token:
        raise HTTPException(status_code=401, detail="YouTube not connected")
    
    # Get channel ID from YouTube Data API (since Analytics API requires it)
    from googleapiclient.discovery import build as data_build
    creds = Credentials(
        token=oauth_token.access_token,
        refresh_token=oauth_token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/youtube.readonly"]
    )
    youtube_data = data_build("youtube", "v3", credentials=creds)
    channels_response = youtube_data.channels().list(part="id", mine=True).execute()
    if not channels_response.get("items"):
        raise HTTPException(status_code=404, detail="No YouTube channel found")
    channel_id = channels_response["items"][0]["id"]
    
    # Now fetch analytics for the last 28 days
    analytics = get_youtube_analytics_service(oauth_token)
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