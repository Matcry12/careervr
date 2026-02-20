import sys
import os
from datetime import datetime
from passlib.context import CryptContext

# Add current directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import db

# Setup password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_or_promote_admin(username, password):
    if not username or not password:
        print("❌ Username and password are required.")
        return

    write_mode = "mongo" if db.is_mongo else ("local" if not os.getenv("VERCEL") else "disabled")
    print(f"Write mode: {write_mode}")
    print(f"DB name: {getattr(db, 'db_name', 'N/A')}")
    if not db.is_mongo:
        print("⚠️ MongoDB is NOT connected in this runtime. This command may write to local JSON only.")

    print(f"Checking user: {username}...")
    user = db.get_user(username)
    
    hashed_password = get_password_hash(password)
    
    if user:
        print(f"User '{username}' exists. Promoting to ADMIN and updating password.")
        result = db.update_user_profile(username, {
            "role": "admin",
            "hashed_password": hashed_password
        })
        if not isinstance(result, dict) or not result.get("ok"):
            print(f"❌ Failed to promote admin. Result: {result}")
            return
        verify = db.get_user(username) or {}
        if str(verify.get("role") or "").lower() != "admin":
            print("❌ Promote reported success but verification failed (role is not admin).")
            return
        print("✅ User promoted to Admin successfully.")
    else:
        print(f"User '{username}' does not exist. Creating new ADMIN account.")
        new_user = {
            "username": username,
            "full_name": "Admin User",
            "role": "admin",
            "hashed_password": hashed_password,
            "created_at": datetime.now().isoformat()
        }
        result = db.create_user(new_user)
        if not isinstance(result, dict) or not result.get("ok"):
            print(f"❌ Failed to create admin. Result: {result}")
            return
        verify = db.get_user(username) or {}
        if str(verify.get("role") or "").lower() != "admin":
            print("❌ Create reported success but verification failed (user/role not found).")
            return
        print("✅ Admin account created successfully.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <username> <password>")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    
    create_or_promote_admin(username, password)
