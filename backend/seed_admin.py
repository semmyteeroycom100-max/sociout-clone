"""
Create admin user (run once)
"""
from app.database import SessionLocal
from app.models.user import User
from app.core.auth import get_password_hash

db = SessionLocal()

# Check if admin exists
admin = db.query(User).filter(User.email == "admin@sociout.com").first()
if not admin:
    admin = User(
        email="admin@sociout.com",
        username="admin",
        hashed_password=get_password_hash("Admin123!"),
        is_admin=True  # Add this column to User model
    )
    db.add(admin)
    db.commit()
    print("✅ Admin user created: admin@sociout.com / Admin123!")
else:
    print("Admin user already exists")

db.close()