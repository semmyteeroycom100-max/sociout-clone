import sys
from sqlalchemy import create_engine, text
from app.database import DATABASE_URL  # or import from your config

# If you can't import from app.database, you can read .env manually
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def upgrade():
    with engine.connect() as conn:
        # Check if column already exists (PostgreSQL)
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='campaigns' AND column_name='platform'
        """))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN platform VARCHAR DEFAULT 'youtube'"))
            conn.commit()
            print("✅ Added 'platform' column to campaigns table")
        else:
            print("⏭️ 'platform' column already exists")

if __name__ == "__main__":
    upgrade()