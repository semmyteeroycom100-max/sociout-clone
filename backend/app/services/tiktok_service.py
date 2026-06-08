import httpx
from typing import Dict, Any

TIKTOK_API_BASE = "https://open.tiktokapis.com/v2"

class TikTokService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

    async def _make_request(self, method: str, url: str, data: Dict = None) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            if method == "POST":
                response = await client.post(url, headers=self.headers, json=data)
            elif method == "GET":
                response = await client.get(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            if response.status_code >= 400:
                return {"error": response.text, "status_code": response.status_code}
            return response.json()

    async def like_video(self, video_id: str) -> Dict[str, Any]:
        """Like a TikTok video. Requires video_id."""
        url = f"{TIKTOK_API_BASE}/like/video/"
        data = {"video_id": video_id}
        return await self._make_request("POST", url, data)

    async def follow_user(self, open_id: str) -> Dict[str, Any]:
        """Follow a TikTok user by their open_id."""
        url = f"{TIKTOK_API_BASE}/follow/user/"
        data = {"open_id": open_id}
        return await self._make_request("POST", url, data)

    async def post_comment(self, video_id: str, text: str) -> Dict[str, Any]:
        """Post a comment on a TikTok video."""
        url = f"{TIKTOK_API_BASE}/comment/video/"
        data = {"video_id": video_id, "comment_text": text}
        return await self._make_request("POST", url, data)