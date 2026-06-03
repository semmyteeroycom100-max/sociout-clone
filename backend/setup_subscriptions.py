import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Create tables
cur.execute("""
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    price_monthly INTEGER NOT NULL,
    actions_limit INTEGER NOT NULL,
    stripe_price_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    actions_used_this_month INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
""")

# Insert default plans
cur.execute("""
INSERT INTO subscription_plans (name, price_monthly, actions_limit) VALUES
('free', 0, 100),
('pro', 1999, 10000),
('business', 9999, 100000)
ON CONFLICT (name) DO NOTHING;
""")

conn.commit()
cur.close()
conn.close()
print("✅ Subscription tables created and default plans added")