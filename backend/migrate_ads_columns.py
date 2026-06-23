import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check if image_url exists
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='ads' AND column_name='image_url'
""")
if cur.fetchone():
    cur.execute("ALTER TABLE ads RENAME COLUMN image_url TO media_url")
    print("✅ Renamed image_url to media_url")
else:
    print("⏭️ image_url column does not exist (may already be media_url)")

# Add media_type if it doesn't exist
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='ads' AND column_name='media_type'
""")
if not cur.fetchone():
    cur.execute("ALTER TABLE ads ADD COLUMN media_type VARCHAR DEFAULT 'image'")
    print("✅ Added media_type column")
else:
    print("⏭️ media_type already exists")

# Ensure other required columns exist
required_columns = ['target_url', 'slot', 'duration_days', 'start_date', 'end_date', 'status', 'stripe_payment_intent_id', 'price_paid', 'impressions', 'clicks']
for col in required_columns:
    cur.execute(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='ads' AND column_name='{col}'
    """)
    if not cur.fetchone():
        cur.execute(f"ALTER TABLE ads ADD COLUMN {col} TEXT")  # Use appropriate type
        print(f"✅ Added column {col}")
    else:
        print(f"⏭️ {col} already exists")

conn.commit()
cur.close()
conn.close()
print("✅ Ads migration completed successfully")