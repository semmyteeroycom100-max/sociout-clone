import os
import sys
import json

# For SQLite (local)
import sqlite3

# For PostgreSQL (Render) – uncomment and fill in your connection string
# import psycopg2
# DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"

def check_local_sqlite():
    conn = sqlite3.connect('sociout.db')
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, campaign_id, action_index, success, youtube_response, error_message
        FROM campaign_actions
        WHERE campaign_id = ?
        ORDER BY action_index
    """, (int(sys.argv[1]) if len(sys.argv) > 1 else 0,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def check_remote_postgres():
    # Fill in your Render PostgreSQL internal connection string
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, campaign_id, action_index, success, youtube_response, error_message
        FROM campaign_actions
        WHERE campaign_id = %s
        ORDER BY action_index
    """, (sys.argv[1],))
    rows = cursor.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_comment_response.py <campaign_id>")
        sys.exit(1)

    # Choose which database you're using
    rows = check_local_sqlite()   # or check_remote_postgres()
    if not rows:
        print("No actions found for campaign", sys.argv[1])
        sys.exit(0)

    for row in rows:
        action_id, campaign_id, idx, success, resp, err = row
        print(f"\nAction {idx}: success={success}")
        if resp:
            try:
                parsed = json.loads(resp)
                print("YouTube API response:")
                print(json.dumps(parsed, indent=2))
                # Check for moderation status
                if isinstance(parsed, dict):
                    if 'status' in parsed:
                        print(f"Status field: {parsed['status']}")
                    if 'error' in parsed:
                        print(f"Error: {parsed['error'].get('message')}")
            except:
                print("Raw response:", resp)
        if err:
            print(f"Error message: {err}")