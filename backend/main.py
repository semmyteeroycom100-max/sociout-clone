from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
import os
import secrets

from app.database import engine, Base
from app.api import auth, users, oauth, youtube, campaigns, password_reset,admin

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=os.getenv("APP_NAME", "Sociout Clone"),
    description="Social platform with YouTube API integration",
    version="1.0.0"
)

# Add Session Middleware (required for OAuth)
app.add_middleware(
    SessionMiddleware,
    secret_key=secrets.token_urlsafe(32),
    session_cookie="sociout_session",
    max_age=3600,  # 1 hour
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://sociout-clone.vercel.app",  # ← ADD THIS
        "https://sociout-clone-git-main.vercel.app",  # optional
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(password_reset.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(oauth.router)
app.include_router(youtube.router)
app.include_router(campaigns.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {os.getenv('APP_NAME', 'Sociout Clone')}",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}