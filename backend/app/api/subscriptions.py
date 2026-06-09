from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import stripe
import os

from app.database import get_db
from app.models.user import User, SubscriptionPlan, UserSubscription
from app.core.auth import decode_access_token
from app.core.stripe_config import stripe, get_or_create_price

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/plans")
def get_plans(db: Session = Depends(get_db)):
    """Get available subscription plans"""
    plans = db.query(SubscriptionPlan).all()
    return [{"name": p.name, "price_monthly": p.price_monthly, "actions_limit": p.actions_limit} for p in plans]

@router.post("/create-checkout")
def create_checkout_session(
    plan_name: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create Stripe checkout session for subscription"""
    user = get_current_user(credentials, db)
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == plan_name).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get or create Stripe price ID
    price_id = get_or_create_price(plan_name, plan.price_monthly)
    if not price_id:
        raise HTTPException(status_code=500, detail="Failed to create Stripe price")
    
    # Create Stripe checkout session
    checkout_session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url="https://sociout-clone.vercel.app/dashboard?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://sociout-clone.vercel.app/pricing",
        customer_email=user.email,
        metadata={"user_id": user.id, "plan_name": plan_name}
    )
    
    return {"checkout_url": checkout_session.url}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except:
        raise HTTPException(status_code=400, detail="Invalid webhook")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session["metadata"]["user_id"])
        plan_name = session["metadata"]["plan_name"]
        
        # Update user subscription
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == plan_name).first()
        if plan:
            subscription = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
            if subscription:
                subscription.plan_id = plan.id
                subscription.stripe_customer_id = session["customer"]
                subscription.stripe_subscription_id = session["subscription"]
                subscription.status = "active"
            else:
                new_sub = UserSubscription(
                    user_id=user_id,
                    plan_id=plan.id,
                    stripe_customer_id=session["customer"],
                    stripe_subscription_id=session["subscription"],
                    status="active"
                )
                db.add(new_sub)
            db.commit()
    
    return {"status": "ok"}
@router.get("/plans")
def get_plans(db: Session = Depends(get_db)):
    """Get available subscription plans as simple array for pricing page"""
    plans = db.query(SubscriptionPlan).all()
    
    result = []
    for plan in plans:
        result.append({
            "name": plan.name.lower(),
            "price_monthly": plan.price_monthly,  # in cents
            "actions_limit": plan.actions_limit,
        })
    
    return result   # Returns an array, not an object
@router.post("/create-checkout")
def create_checkout_session(
    plan_name: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user(credentials, db)
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == plan_name).first()
    if not plan or not plan.stripe_price_id:
        raise HTTPException(status_code=404, detail="Plan or price ID not found")
    checkout_session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{"price": plan.stripe_price_id, "quantity": 1}],
        mode="subscription",
        success_url="https://sociout-clone.vercel.app/dashboard?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="https://sociout-clone.vercel.app/pricing",
        customer_email=user.email,
        metadata={"user_id": user.id, "plan_name": plan_name}
    )
    return {"checkout_url": checkout_session.url}