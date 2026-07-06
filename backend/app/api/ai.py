import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from app.core.auth import get_current_user
from app.models.user import User
from app.models.oauth import OAuthToken
from app.services.youtube import YouTubeService
from app.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/ai", tags=["AI"])
security = HTTPBearer()

class GenerateCommentsRequest(BaseModel):
    video_url: str

class GenerateCommentsResponse(BaseModel):
    comments: List[str]

def extract_video_id(url: str) -> str:
    # Reuse the extraction logic from campaigns.py (simplified)
    import re
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"shorts\/([0-9A-Za-z_-]{11})",
        r"embed\/([0-9A-Za-z_-]{11})",
        r"v\/([0-9A-Za-z_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Could not extract video ID")

@router.post("/generate-comments", response_model=GenerateCommentsResponse)
async def generate_comments(
    request: GenerateCommentsRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # 1. Get current user
    user = get_current_user(credentials, db)
    
    # 2. Get user's OAuth token (YouTube)
    oauth_token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "google"
    ).first()
    if not oauth_token:
        raise HTTPException(status_code=400, detail="YouTube not connected")

    # 3. Extract video ID
    try:
        video_id = extract_video_id(request.video_url)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    # 4. Fetch video info using user's token
    youtube_service = YouTubeService(oauth_token.access_token)
    video_info = await youtube_service.get_video_info(video_id)
    if not video_info or "error" in video_info:
        raise HTTPException(status_code=400, detail="Could not fetch video info")

    title = video_info.get("title", "this video")

    # 5. Generate comments using Hugging Face inference API
    prompt = f"Generate 3 short, friendly, and engaging comments for a YouTube video titled: '{title}'. The comments should be positive, conversational, and encourage interaction. Write them as separate lines, each starting with a dash."

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api-inference.huggingface.co/models/gpt2",
                json={"inputs": prompt, "parameters": {"max_length": 200, "num_return_sequences": 1}},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                result = response.json()
                # The API returns a list with a 'generated_text' field
                generated_text = result[0].get("generated_text", "")
                # Extract lines that start with dash
                lines = [line.strip("- ").strip() for line in generated_text.split("\n") if line.strip().startswith("-")]
                # If we have fewer than 3, fallback to templates
                if len(lines) < 3:
                    fallback = [
                        f"Great video! Really enjoyed the part about {title[:30]}!",
                        f"Thanks for sharing this, very helpful! 🔥",
                        f"Awesome content, keep it up! 💪"
                    ]
                    lines = (lines + fallback)[:3]
                comments = lines[:3]
            else:
                # Fallback to template-based if API fails
                comments = [
                    f"Great video! Really enjoyed the part about {title[:30]}!",
                    f"Thanks for sharing this, very helpful! 🔥",
                    f"Awesome content, keep it up! 💪"
                ]
    except Exception:
        # Fallback on any error
        comments = [
            f"Great video! Really enjoyed the part about {title[:30]}!",
            f"Thanks for sharing this, very helpful! 🔥",
            f"Awesome content, keep it up! 💪"
        ]

    return {"comments": comments}