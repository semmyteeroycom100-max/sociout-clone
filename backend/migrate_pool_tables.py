import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Create pool_accounts table with SERIAL (integer) primary key
cur.execute("""
CREATE TABLE IF NOT EXISTS pool_accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP,
    cookie_json TEXT,
    proxy VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    daily_subscribe_count INT DEFAULT 0,
    daily_like_count INT DEFAULT 0,
    daily_comment_count INT DEFAULT 0,
    last_reset_date TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    cooldown_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
""")
print("✅ Created pool_accounts table")

# Create action_jobs table with INTEGER foreign keys
cur.execute("""
CREATE TABLE IF NOT EXISTS action_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL,
    target VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    account_id INTEGER REFERENCES pool_accounts(id),
    error_message TEXT,
    attempts INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)
""")
print("✅ Created action_jobs table")

# Create action_logs table with INTEGER foreign keys
cur.execute("""
CREATE TABLE IF NOT EXISTS action_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES action_jobs(id),
    account_id INTEGER REFERENCES pool_accounts(id),
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(20) NOT NULL,
    target VARCHAR(255) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    response_code INT,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
)
""")
print("✅ Created action_logs table")

# Add use_pool column to campaigns (if not exists)
cur.execute("""
SELECT column_name
FROM information_schema.columns
WHERE table_name='campaigns' AND column_name='use_pool'
""")
if not cur.fetchone():
    cur.execute("ALTER TABLE campaigns ADD COLUMN use_pool BOOLEAN DEFAULT FALSE")
    print("✅ Added use_pool to campaigns")
else:
    print("⏭️ use_pool already exists")

conn.commit()
cur.close()
conn.close()
print("✅ Pool tables migration completed successfully")