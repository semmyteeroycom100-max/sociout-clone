from sqlalchemy import text
from app.database import engine

def create_tables():
    with engine.connect() as conn:
        # Create ads table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ads (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                image_url TEXT NOT NULL,
                target_url TEXT NOT NULL,
                slot VARCHAR(20) NOT NULL,
                duration_days INTEGER NOT NULL,
                start_date TIMESTAMP WITH TIME ZONE,
                end_date TIMESTAMP WITH TIME ZONE,
                status VARCHAR(20) DEFAULT 'pending',
                stripe_payment_intent_id VARCHAR(255),
                price_paid INTEGER,
                impressions INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        print("✅ Table 'ads' created (or already exists)")

        # Create ad_slot_prices table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ad_slot_prices (
                id SERIAL PRIMARY KEY,
                slot VARCHAR(20) NOT NULL,
                duration_days INTEGER NOT NULL,
                price_cents INTEGER NOT NULL,
                stripe_price_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        print("✅ Table 'ad_slot_prices' created (or already exists)")

        # Create index for fast random ad selection
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ads_active_slot 
            ON ads (slot, status, start_date, end_date);
        """))
        conn.commit()

if __name__ == "__main__":
    create_tables()