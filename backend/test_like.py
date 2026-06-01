from app.models.user import OAuthToken
from app.database import SessionLocal
from app.services.youtube import YouTubeService
import asyncio

db = SessionLocal()
token_row = db.query(OAuthToken).first()
print("Token exists?", token_row is not None)
if token_row:
    yt = YouTubeService(token_row.access_token)
    result = asyncio.run(yt.like_video('dQw4w9WgXcQ'))
    print("Like result:", result)
db.close()