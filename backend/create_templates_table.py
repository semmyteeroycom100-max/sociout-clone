import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in environment")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Create campaign_templates table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS campaign_templates (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            video_url TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target_count INTEGER NOT NULL,
            comment_text TEXT,
            comment_list TEXT,
            scheduled_days_offset INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    conn.commit()
    print("✅ Table 'campaign_templates' created successfully")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")