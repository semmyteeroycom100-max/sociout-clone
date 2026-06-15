from fastapi import APIRouter

router = APIRouter(prefix="/api/ads", tags=["Ads"])

@router.get("/ping")
async def ping():
    return {"message": "pong"}