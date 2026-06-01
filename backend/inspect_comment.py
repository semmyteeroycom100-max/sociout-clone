import psycopg2
import json

# 🔁 REPLACE WITH YOUR ACTUAL RENDER POSTGRESQL INTERNAL CONNECTION STRING
DATABASE_URL = "postgresql://sociout_db_user:zs4j5nVs1HWL056cZL8KEa3BmG9l2FLy@dpg-d7ti2regvqtc73cp5f60-a.oregon-postgres.render.com/sociout_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    campaign_id = 20   # use the ID of your comment campaign
    cur.execute("""
        SELECT action_index, youtube_response, error_message
        FROM campaign_actions
        WHERE campaign_id = %s
        ORDER BY action_index
    """, (campaign_id,))
    rows = cur.fetchall()
    if not rows:
        print(f"No actions found for campaign {campaign_id}")
    else:
        for idx, resp, err in rows:
            print(f"\nAction {idx}:")
            if resp:
                try:
                    data = json.loads(resp)
                    print("YouTube API response:")
                    print(json.dumps(data, indent=2))
                    # Look for moderation status in comment response
                    if isinstance(data, dict):
                        # Common structures: direct status or nested in snippet
                        if 'status' in data:
                            print(f"Status field: {data['status']}")
                        # For comment response
                        if 'snippet' in data and 'topLevelComment' in data['snippet']:
                            mod = data['snippet']['topLevelComment']['snippet'].get('moderationStatus')
                            if mod:
                                print(f"Moderation status: {mod}")
                        if 'error' in data:
                            print(f"API Error: {data['error'].get('message')}")
                except json.JSONDecodeError:
                    print("Raw response:", resp)
            if err:
                print(f"Error message: {err}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")