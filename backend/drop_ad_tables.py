from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS ads CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS ad_slot_prices"))
    conn.commit()
    print("Tables dropped")