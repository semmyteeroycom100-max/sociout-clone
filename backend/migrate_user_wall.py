import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    print("✅ Connected to database")

    # 1. Add profile fields to users table
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0")
    print("✅ Profile fields added to users table")

    # 2. Create activity_logs table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            action_type VARCHAR NOT NULL,
            description VARCHAR,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    print("✅ activity_logs table created")

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Migration complete!")

except Exception as e:
    print(f"❌ Error: {e}")