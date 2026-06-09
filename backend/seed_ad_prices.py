from sqlalchemy import text
from app.database import engine

def seed_prices():
    with engine.connect() as conn:
        # Step 1: Add unique constraint on (slot, duration_days) if not present
        try:
            conn.execute(text("""
                ALTER TABLE ad_slot_prices
                ADD CONSTRAINT unique_slot_duration UNIQUE (slot, duration_days);
            """))
            conn.commit()
            print("✅ Added unique constraint (slot, duration_days)")
        except Exception as e:
            # Constraint may already exist – ignore the error
            if "already exists" in str(e) or "duplicate" in str(e):
                print("⏭️ Unique constraint already exists, skipping")
            else:
                print(f"⚠️ Note: {e}")

        # Step 2: Insert default prices with ON CONFLICT (now safe)
        conn.execute(text("""
            INSERT INTO ad_slot_prices (slot, duration_days, price_cents)
            VALUES 
                ('sidebar', 1, 100),
                ('sidebar', 7, 500),
                ('sidebar', 30, 1500),
                ('top_banner', 1, 200),
                ('top_banner', 7, 1000),
                ('top_banner', 30, 3000),
                ('between_cards', 1, 150),
                ('between_cards', 7, 800),
                ('between_cards', 30, 2400)
            ON CONFLICT (slot, duration_days) DO NOTHING;
        """))
        conn.commit()
        print("✅ Default ad slot prices seeded")

if __name__ == "__main__":
    seed_prices()