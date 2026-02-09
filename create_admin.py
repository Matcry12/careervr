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
    print(f"Checking user: {username}...")
    user = db.get_user(username)
    
    hashed_password = get_password_hash(password)
    
    if user:
        print(f"User '{username}' exists. Promoting to ADMIN and updating password.")
        # Update Role
        db.update_user_history(username, "role", "admin")
        # Update Password
        db.update_user_history(username, "hashed_password", hashed_password)
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
        db.create_user(new_user)
        print("✅ Admin account created successfully.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <username> <password>")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    
    create_or_promote_admin(username, password)
