@router.get("/status")
async def tiktok_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    token = db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "tiktok"
    ).first()
    return {"connected": token is not None}

@router.post("/reset")
async def tiktok_reset(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    db.query(OAuthToken).filter(
        OAuthToken.user_id == user.id,
        OAuthToken.provider == "tiktok"
    ).delete()
    db.commit()
    return {"message": "TikTok connection reset"}