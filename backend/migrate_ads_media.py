from sqlalchemy import text
from app.database import engine

def upgrade():
    with engine.connect() as conn:
        # Rename image_url to media_url
        try:
            conn.execute(text("ALTER TABLE ads RENAME COLUMN image_url TO media_url"))
            print("Renamed image_url to media_url")
        except Exception as e:
            print("Column image_url may not exist or already renamed:", e)

        # Add media_type column if not exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='ads' AND column_name='media_type'
        """))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE ads ADD COLUMN media_type VARCHAR DEFAULT 'image'"))
            print("Added media_type column")
        else:
            print("media_type already exists")

        conn.commit()

if __name__ == "__main__":
    upgrade()