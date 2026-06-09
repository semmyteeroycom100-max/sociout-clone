import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Replace the price IDs with your actual Stripe Price IDs
cur.execute("""
    UPDATE subscription_plans 
    SET stripe_price_id = 'price_1...'   -- 👈 change this
    WHERE name = 'FREE'
""")
cur.execute("""
    UPDATE subscription_plans 
    SET stripe_price_id = 'price_1...'   -- 👈 change this
    WHERE name = 'PRO'
""")

conn.commit()
print("✅ Price IDs updated")
cur.close()
conn.close()