import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS bio")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS avatar_url")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS website")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS location")
cur.execute("ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS wallet_balance")
conn.commit()
print("✅ Removed columns from oauth_tokens")
cur.close()
conn.close()