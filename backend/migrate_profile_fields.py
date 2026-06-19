import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Add columns if they don't exist
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR")
cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0")

conn.commit()
print("✅ Profile fields added to users table")
cur.close()
conn.close()