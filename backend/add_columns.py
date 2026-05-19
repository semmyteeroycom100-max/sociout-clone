import psycopg2
import os

# 🔁 REPLACE THIS WITH YOUR ACTUAL RENDER POSTGRES CONNECTION STRING
DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS comment_list TEXT;")
    print("✅ Added comment_list column")

    cur.execute("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;")
    print("✅ Added scheduled_at column")

    cur.execute("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;")
    print("✅ Added started_at column")

    cur.close()
    conn.close()
    print("All columns added successfully!")

except Exception as e:
    print(f"❌ Error: {e}")