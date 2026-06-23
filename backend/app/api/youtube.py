from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.oauth import OAuthToken
from app.core.auth import decode_access_token
from app.services.youtube import YouTubeService
from app.api.oauth import get_youtube_token

router = APIRouter(prefix="/api/youtube", tags=["YouTube API"])
security = HTTPBearer()


class LikeRequest(BaseModel):
    video_id: str


class SubscribeRequest(BaseModel):
    video_id: str


class CommentRequest(BaseModel):
    video_id: str
    text: str


def get_youtube_service(credentials: HTTPAuthorizationCredentials, db: Session):
    """Dependency to get authenticated YouTube service"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    youtube_token = get_youtube_token(user.id, db)
    
    if not youtube_token:
        raise HTTPException(
            status_code=401, 
            detail="YouTube not connected. Please authenticate with Google OAuth first."
        )
    
    return YouTubeService(youtube_token), user


@router.post("/like")
async def like_video(
    request: LikeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Like a YouTube video (REAL - affects YouTube counter)"""
    youtube_service, user = get_youtube_service(credentials, db)
    result = await youtube_service.like_video(request.video_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"success": True, "message": f"Liked video {request.video_id}"}


@router.post("/subscribe")
async def subscribe_to_channel(
    request: SubscribeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Subscribe to a YouTube channel (REAL - affects YouTube counter)"""
    youtube_service, user = get_youtube_service(credentials, db)
    
    # First get video info to extract channel ID
    video_info = await youtube_service.get_video_info(request.video_id)
    
    if "error" in video_info or not video_info.get("channel_id"):
        raise HTTPException(status_code=400, detail="Could not find channel for this video")
    
    channel_id = video_info["channel_id"]
    result = await youtube_service.subscribe_to_channel(channel_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "success": True,
        "message": f"Subscribed to channel {video_info.get('channel_title', channel_id)}"
    }


@router.post("/comment")
async def post_comment(
    request: CommentRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Post a comment on a YouTube video (REAL - appears on YouTube)"""
    youtube_service, user = get_youtube_service(credentials, db)
    
    result = await youtube_service.post_comment(request.video_id, request.text)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "success": True,
        "message": f"Comment posted on video {request.video_id}"
    }


@router.get("/video/{video_id}")
async def get_video_info(
    video_id: str,
    db: Session = Depends(get_db)
):
    """Get video information (no auth required for public data)"""
    import httpx
    
    async with httpx.AsyncClient() as client:
        # Note: Replace with your actual API key from Google Cloud Console
        url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id={video_id}"
        response = await client.get(url)
        
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])
            if items:
                item = items[0]
                return {
                    "id": item["id"],
                    "title": item["snippet"]["title"],
                    "channel_id": item["snippet"]["channelId"],
                    "channel_title": item["snippet"]["channelTitle"],
                    "view_count": item["statistics"].get("viewCount", 0),
                    "like_count": item["statistics"].get("likeCount", 0),
                }
        
        return {"error": "Video not found"}
@router.get("/status")
async def youtube_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    oauth_token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "google"
    ).first()
    
    return {"connected": oauth_token is not None}
