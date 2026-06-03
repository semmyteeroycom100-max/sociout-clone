from sqlalchemy import text, inspect
from app.database import engine

def add_webhook_columns():
    with engine.connect() as conn:
        # Check which columns already exist
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('campaigns')]
        
        if 'webhook_url' not in existing_columns:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN webhook_url TEXT"))
            conn.commit()
            print("✅ Added column 'webhook_url' to campaigns table")
        else:
            print("⏭️ Column 'webhook_url' already exists")
            
        if 'webhook_secret' not in existing_columns:
            conn.execute(text("ALTER TABLE campaigns ADD COLUMN webhook_secret TEXT"))
            conn.commit()
            print("✅ Added column 'webhook_secret' to campaigns table")
        else:
            print("⏭️ Column 'webhook_secret' already exists")

if __name__ == "__main__":
    add_webhook_columns()