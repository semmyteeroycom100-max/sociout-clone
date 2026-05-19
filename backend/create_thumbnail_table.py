import psycopg2
import os

# 🔁 REPLACE THIS WITH YOUR REAL RENDER POSTGRES CONNECTION STRING
DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS thumbnail_tests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        video_url TEXT NOT NULL,
        video_id TEXT NOT NULL,
        thumbnail_a_url TEXT NOT NULL,
        thumbnail_b_url TEXT NOT NULL,
        impressions_a INTEGER DEFAULT 0,
        impressions_b INTEGER DEFAULT 0,
        clicks_a INTEGER DEFAULT 0,
        clicks_b INTEGER DEFAULT 0,
        status TEXT DEFAULT 'running',
        winner TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """)

    print("✅ Table 'thumbnail_tests' created or already exists")
    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")