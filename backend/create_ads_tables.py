from app.models.user import User   # <-- add this
from sqlalchemy import text
from app.database import engine
from app.models.ad import Ad, AdSlotPrice

def create_tables():
    with engine.connect() as conn:
        # Create tables if they don't exist
        Ad.__table__.create(bind=engine, checkfirst=True)
        AdSlotPrice.__table__.create(bind=engine, checkfirst=True)
        print("Tables created (or already exist).")

        # Insert default slot prices
        result = conn.execute(text("SELECT COUNT(*) FROM ad_slot_prices"))
        count = result.scalar()
        if count == 0:
            conn.execute(text("""
                INSERT INTO ad_slot_prices (slot, duration_days, price_cents) VALUES
                ('sidebar', 7, 500),
                ('sidebar', 30, 1500),
                ('top_banner', 7, 1000),
                ('top_banner', 30, 3000),
                ('between_cards', 7, 800),
                ('between_cards', 30, 2400)
            """))
            conn.commit()
            print("Default slot prices inserted.")
        else:
            print("Slot prices already exist.")

if __name__ == "__main__":
    create_tables()