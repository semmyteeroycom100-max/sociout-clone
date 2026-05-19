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
        "scope": "openid email profile https://www.googleapis.com/auth/youtube.force-ssl",
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"),
    },
)
@router.get("/google")
async def auth_google(request: Request):
    redirect_uri = "https://sociout-backend.onrender.com/api/auth/google/callback"
    print(f"Redirect URI used: {redirect_uri}")  # Add this line
    return await oauth.google.authorize_redirect(request, redirect_uri)