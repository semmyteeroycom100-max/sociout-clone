import psycopg2

DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"  # replace with your actual Render PostgreSQL URL

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("""
    DELETE FROM oauth_tokens
    WHERE user_id = (SELECT id FROM users WHERE email = 'semmyteeroycom100@gmail.com');
""")
conn.commit()
print("Token revoked. You can now reconnect YouTube.")
cur.close()
conn.close()