import psycopg2
import os

# 🔁 REPLACE THIS WITH YOUR ACTUAL RENDER POSTGRES CONNECTION STRING
DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT u.email, t.refresh_token IS NOT NULL AS has_refresh 
        FROM oauth_tokens t 
        JOIN users u ON t.user_id = u.id 
        WHERE u.email = 'semmyteeroycom100@gmail.com';
    """)
    rows = cur.fetchall()
    for row in rows:
        print(f"Email: {row[0]}, Has refresh token: {row[1]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")