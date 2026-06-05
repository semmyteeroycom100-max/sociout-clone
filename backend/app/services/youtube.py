import httpx
from typing import Optional, Dict, Any

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeService:
    """Service for making real YouTube API calls"""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
    
    async def _make_request(self, method: str, url: str, data: Dict = None) -> Dict[str, Any]:
        """Make authenticated request to YouTube API"""
        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, headers=self.headers)
            elif method == "POST":
                response = await client.post(url, headers=self.headers, json=data)
            elif method == "DELETE":
                response = await client.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code >= 400:
                return {"error": response.text, "status_code": response.status_code}
            
            return response.json() if response.text else {}
    
    async def like_video(self, video_id: str) -> Dict[str, Any]:
        """Like a YouTube video (REAL API call)"""
        url = f"{YOUTUBE_API_BASE}/videos/rate?id={video_id}&rating=like"
        return await self._make_request("POST", url)
    
    async def unlike_video(self, video_id: str) -> Dict[str, Any]:
        """Remove like from a YouTube video (not used in campaigns, kept for completeness)"""
        url = f"{YOUTUBE_API_BASE}/videos/rate?id={video_id}&rating=none"
        return await self._make_request("POST", url)
    
    async def subscribe_to_channel(self, channel_id: str) -> Dict[str, Any]:
        """Subscribe to a YouTube channel (REAL API call)"""
        url = f"{YOUTUBE_API_BASE}/subscriptions?part=snippet"
        data = {
            "snippet": {
                "resourceId": {
                    "kind": "youtube#channel",
                    "channelId": channel_id
                }
            }
        }
        return await self._make_request("POST", url, data=data)
    
    async def unsubscribe_from_channel(self, subscription_id: str) -> Dict[str, Any]:
        """Unsubscribe from a YouTube channel"""
        url = f"{YOUTUBE_API_BASE}/subscriptions?id={subscription_id}"
        return await self._make_request("DELETE", url)
    
    async def post_comment(self, video_id: str, text: str) -> Dict[str, Any]:
        """Post a comment on a YouTube video with validation and error handling."""
        # --- VALIDATION (local, no API call) ---
        if not text or not text.strip():
            return {"error": "Comment cannot be empty", "status_code": 400}
        
        if len(text) > 1000:
            return {"error": "Comment is too long (max 1000 characters)", "status_code": 400}
        
        if len(text) < 2:
            return {"error": "Comment is too short", "status_code": 400}
        
        # Basic spam detection
        spam_keywords = ["buy followers", "click here", "free subscribers", "bit.ly", "goo.gl", "http://", "https://"]
        lower_text = text.lower()
        for keyword in spam_keywords:
            if keyword in lower_text:
                return {"error": f"Comment looks like spam (contains '{keyword}')", "status_code": 400}
        
        # --- ACTUAL API CALL ---
        url = f"{YOUTUBE_API_BASE}/commentThreads?part=snippet"
        data = {
            "snippet": {
                "videoId": video_id,
                "topLevelComment": {
                    "snippet": {
                        "textOriginal": text
                    }
                }
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=self.headers, json=data)
            
            # --- ERROR HANDLING (user-friendly messages) ---
            if response.status_code == 403:
                error_text = response.text.lower()
                if "commentsdisabled" in error_text or "comments disabled" in error_text:
                    return {"error": "Comments are disabled on this video", "status_code": 403}
                elif "spam" in error_text:
                    return {"error": "YouTube's spam filter blocked your comment. Try a different wording.", "status_code": 403}
                else:
                    return {"error": "Permission denied. Make sure your YouTube account is connected.", "status_code": 403}
            elif response.status_code == 400:
                return {"error": "Invalid comment format or video ID.", "status_code": 400}
            elif response.status_code == 404:
                return {"error": "Video not found or unavailable.", "status_code": 404}
            elif response.status_code >= 400:
                return {"error": f"YouTube API error: {response.text[:200]}", "status_code": response.status_code}
            
            # Success
            result = response.json()
            return {"success": True, "comment_id": result.get("id", ""), "status_code": 200}
    
    async def get_video_info(self, video_id: str) -> Dict[str, Any]:
        """Get video metadata"""
        url = f"{YOUTUBE_API_BASE}/videos?part=snippet,statistics&id={video_id}"
        response = await self._make_request("GET", url)
        items = response.get("items", [])
        if items:
            item = items[0]
            return {
                "id": item["id"],
                "title": item["snippet"]["title"],
                "channel_id": item["snippet"]["channelId"],
                "channel_title": item["snippet"]["channelTitle"],
                "view_count": item["statistics"].get("viewCount", 0),
                "like_count": item["statistics"].get("likeCount", 0),
                "comment_count": item["statistics"].get("commentCount", 0),
            }
        return {"error": "Video not found"}
    
    async def extract_channel_id(self, video_id: str) -> Optional[str]:
        """Extract channel ID from a video ID"""
        info = await self.get_video_info(video_id)
        return info.get("channel_id")