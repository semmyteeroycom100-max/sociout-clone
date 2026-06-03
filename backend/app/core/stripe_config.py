import stripe
import os
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Price IDs (you'll get these from Stripe Dashboard after creating products)
# For now, we'll create them dynamically later
FREE_PRICE_ID = None
PRO_PRICE_ID = None
BUSINESS_PRICE_ID = None

def get_or_create_price(plan_name, amount_cents):
    """Get or create a Stripe price for a plan"""
    try:
        # Check if price exists
        prices = stripe.Price.list(lookup_keys=[plan_name])
        if prices.data:
            return prices.data[0].id
        
        # Create new price
        product = stripe.Product.create(name=f"Sociout {plan_name.capitalize()}")
        price = stripe.Price.create(
            product=product.id,
            unit_amount=amount_cents,
            currency="usd",
            recurring={"interval": "month"},
            lookup_key=plan_name
        )
        return price.id
    except Exception as e:
        print(f"Error creating price: {e}")
        return None