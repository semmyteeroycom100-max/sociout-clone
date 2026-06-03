import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Read DATABASE_URL from .env file
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env file")
    exit(1)

print(f"✓ Using database: {DATABASE_URL[:50]}...")  # Shows first 50 chars (hides password)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print("\n📦 Creating indexes...")
    
    # Indexes for campaigns table
    cur.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);")
    print("  ✅ idx_campaigns_user_id")
    
    cur.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);")
    print("  ✅ idx_campaigns_created_at")
    
    cur.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);")
    print("  ✅ idx_campaigns_status")
    
    # Indexes for campaign_actions table
    cur.execute("CREATE INDEX IF NOT EXISTS idx_campaign_actions_campaign_id ON campaign_actions(campaign_id);")
    print("  ✅ idx_campaign_actions_campaign_id")
    
    cur.execute("CREATE INDEX IF NOT EXISTS idx_campaign_actions_created_at ON campaign_actions(created_at);")
    print("  ✅ idx_campaign_actions_created_at")
    
    # Indexes for oauth_tokens table
    cur.execute("CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);")
    print("  ✅ idx_oauth_tokens_user_id")
    
    conn.commit()
    cur.close()
    conn.close()
    
    print("\n🎉 All indexes created successfully!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")