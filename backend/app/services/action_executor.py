from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from app.models.pool_account import PoolAccount
from app.services.account_encryption import decrypt_token
import random
import time

class ActionExecutor:
    def __init__(self, account: PoolAccount):
        self.account = account
        self._init_client()

    def _init_client(self):
        """Initialize YouTube API client using OAuth tokens."""
        access_token = decrypt_token(self.account.access_token)
        refresh_token = decrypt_token(self.account.refresh_token) if self.account.refresh_token else None

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/youtube.force-ssl"]
        )
        self.youtube = build("youtube", "v3", credentials=creds)

    def subscribe(self, channel_id: str) -> dict:
        """Subscribe to a YouTube channel."""
        try:
            response = self.youtube.subscriptions().insert(
                part="snippet",
                body={
                    "snippet": {
                        "resourceId": {
                            "kind": "youtube#channel",
                            "channelId": channel_id
                        }
                    }
                }
            ).execute()
            return {"success": True, "subscription_id": response.get("id")}
        except HttpError as e:
            if e.resp.status == 403 and "subscriptionLimit" in str(e):
                return {"success": False, "error": "daily_limit_reached"}
            elif e.resp.status == 429:
                return {"success": False, "error": "rate_limited"}
            else:
                return {"success": False, "error": str(e)}

    def like_video(self, video_id: str) -> dict:
        """Like a YouTube video."""
        try:
            self.youtube.videos().rate(id=video_id, rating="like").execute()
            return {"success": True}
        except HttpError as e:
            if e.resp.status == 403:
                return {"success": False, "error": "video_interaction_disabled"}
            elif e.resp.status == 429:
                return {"success": False, "error": "rate_limited"}
            else:
                return {"success": False, "error": str(e)}

    def comment(self, video_id: str, text: str) -> dict:
        """Post a comment on a YouTube video."""
        try:
            response = self.youtube.commentThreads().insert(
                part="snippet",
                body={
                    "snippet": {
                        "videoId": video_id,
                        "topLevelComment": {
                            "snippet": {
                                "textOriginal": text
                            }
                        }
                    }
                }
            ).execute()
            return {"success": True, "comment_id": response.get("id")}
        except HttpError as e:
            if e.resp.status == 403 and "spam" in str(e).lower():
                return {"success": False, "error": "spam_filter"}
            elif e.resp.status == 429:
                return {"success": False, "error": "rate_limited"}
            else:
                return {"success": False, "error": str(e)}