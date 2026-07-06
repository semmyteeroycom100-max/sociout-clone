from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS pool_accounts CASCADE"))
    conn.commit()
    print("✅ Table 'pool_accounts' dropped.")