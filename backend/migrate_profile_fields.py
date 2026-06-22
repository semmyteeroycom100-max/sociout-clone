import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. DROP columns from oauth_tokens if they exist (wrongly added)
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS bio")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS avatar_url")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS website")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS location")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS wallet_balance")
print("✅ Removed profile columns from oauth_tokens (if they existed)")

# 2. ADD columns to users if they don't exist
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0")
print("✅ Added profile columns to users table")

# 3. DROP old activity_logs table if it exists (to avoid column name conflict)
cur.execute("DROP TABLE IF EXISTS activity_logs")
print("✅ Dropped old activity_logs table (if existed)")

# 4. CREATE activity_logs table with extra_data (renamed from metadata)
cur.execute("""
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR NOT NULL,
    description VARCHAR,
    extra_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
""")
print("✅ Created activity_logs table")

conn.commit()
cur.close()
conn.close()
print("✅ Migration completed successfully")