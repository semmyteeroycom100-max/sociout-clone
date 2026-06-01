import os
import psycopg2

# Your Render PostgreSQL internal connection string (copy from Render dashboard)
DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"

# Your email address
YOUR_EMAIL = "tijanisemilore21@gmail.com"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("UPDATE users SET is_admin = true WHERE email = %s", (YOUR_EMAIL,))
    conn.commit()
    print(f"✅ Admin privileges granted to {YOUR_EMAIL}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")