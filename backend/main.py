from fastapi import FastAPI
from app.utils.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
import os
import secrets

from app.database import engine, Base
from app.api import auth, users, oauth, youtube, campaigns, password_reset, admin, analytics, thumbnail_test
from app.api import subscriptions
from app.api import referral
from app.api import templates 
from app.api import scheduler
from app.api import ads

# ===== NEW IMPORTS =====
from app.api import articles, admin_users, feedback, support, admin_audit, admin_pool
from app.api import gamification          # <-- ADDED
from app.api import admin_security        # <-- ADDED

# Import new models so they are registered with SQLAlchemy
from app.models import Article, Feedback, SupportContribution, AdminAction

load_dotenv()

app = FastAPI(
    title=os.getenv("APP_NAME", "Sociout Clone"),
    description="Social platform with YouTube API integration",
    version="1.0.0"
)

os.makedirs("static/thumbnails", exist_ok=True)
os.makedirs("static/ads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    SessionMiddleware,
    secret_key=secrets.token_urlsafe(32),
    session_cookie="sociout_session",
    max_age=3600,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://sociout-clone.vercel.app",
        "https://sociout-clone-git-main.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# ===== INCLUDE ROUTERS =====
app.include_router(password_reset.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(oauth.router)
app.include_router(youtube.router)
app.include_router(campaigns.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(thumbnail_test.router)
app.include_router(subscriptions.router)
app.include_router(templates.router)
app.include_router(scheduler.router)
app.include_router(ads.router)
app.include_router(referral.router)

# ===== NEW ROUTERS (Admin & CMS) =====
app.include_router(articles.router)
app.include_router(admin_users.router)
app.include_router(feedback.router)
app.include_router(support.router)
app.include_router(admin_audit.router)
app.include_router(admin_pool.router)

# ===== GAMIFICATION & SECURITY =====
app.include_router(gamification.router)       # <-- ADDED
app.include_router(admin_security.router)     # <-- ADDED

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

@app.get("/debug/routes")
def list_routes():
    return [{"path": route.path, "name": route.name} for route in app.routes]