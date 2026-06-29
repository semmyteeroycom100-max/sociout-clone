from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
import stripe
import os

from app.database import get_db
from app.models.user import User
from app.models.support import SupportContribution
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/support", tags=["Support"])
security = HTTPBearer()

# ===== STRIPE SETUP =====
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
if not stripe.api_key:
    print("⚠️  STRIPE_SECRET_KEY not set. Support/donation endpoints will not work.")

# ===== SCHEMAS =====
class SupportCreate(BaseModel):
    amount: int  # in cents (e.g., 500 = $5.00)
    tier: str = "supporter"  # supporter, patron, benefactor
    recurring: bool = False

# ===== ENDPOINTS =====
@router.post("/create-checkout")
def create_support_checkout(
    support: SupportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe Checkout session for a support/donation contribution."""
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured. Please set STRIPE_SECRET_KEY.")

    try:
        # Determine mode: subscription or one-time payment
        mode = "subscription" if support.recurring else "payment"

        # For subscriptions, we need a price object
        if support.recurring:
            # Create a product for this tier (if not already existing, we use a generic one)
            # In production, you'd want to pre-create these and pass price IDs.
            # For simplicity, we create a temporary price.
            product = stripe.Product.create(
                name=f"Sociout Support - {support.tier} (Recurring)",
                metadata={"tier": support.tier}
            )
            price = stripe.Price.create(
                product=product.id,
                unit_amount=support.amount,
                currency="usd",
                recurring={"interval": "month"},
            )
            line_items = [{"price": price.id, "quantity": 1}]
        else:
            # One-time payment
            line_items = [{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": support.amount,
                    "product_data": {
                        "name": f"Sociout Support - {support.tier}",
                        "description": f"One-time contribution to Sociout",
                    },
                },
                "quantity": 1,
            }]

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode=mode,
            success_url="https://sociout-frontend.vercel.app/dashboard?support=success",
            cancel_url="https://sociout-frontend.vercel.app/dashboard?support=cancel",
            metadata={
                "user_id": current_user.id,
                "tier": support.tier,
                "amount": str(support.amount),
                "recurring": str(support.recurring)
            },
            customer_email=current_user.email,
        )

        # Save pending contribution record
        contribution = SupportContribution(
            user_id=current_user.id,
            amount=support.amount,
            tier=support.tier,
            stripe_payment_id=checkout_session.id,
            status="pending"
        )
        db.add(contribution)
        db.commit()

        return {"checkout_url": checkout_session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

# ===== WEBHOOK ENDPOINT (Placeholder – to be implemented later) =====
# Stripe webhook will be at /api/support/webhook
# It will update the contribution status from "pending" to "succeeded" or "failed".
# We'll implement this in a future update if needed.