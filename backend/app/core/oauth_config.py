from authlib.integrations.starlette_client import OAuth
import os
from dotenv import load_dotenv

load_dotenv()

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
	"scope": "openid email profile https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly",       
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"),
    },
)