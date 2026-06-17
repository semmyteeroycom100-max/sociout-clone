from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Drop tables (cascade to remove dependencies)
    conn.execute(text("DROP TABLE IF EXISTS ads CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS ad_slot_prices CASCADE"))
    # Drop the enum type if it exists
    conn.execute(text("DROP TYPE IF EXISTS adslot CASCADE"))
    conn.execute(text("DROP TYPE IF EXISTS adstatus CASCADE"))
    conn.commit()
    print("Tables and enum types dropped")