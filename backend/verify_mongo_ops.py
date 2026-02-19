import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Ensure backend module can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env
load_dotenv()

from database import db

def verify_ops():
    if not db.is_mongo:
        print("❌ Not connected to MongoDB. Check MONGODB_URI.")
        return

    db_name = getattr(getattr(db, "db", None), "name", os.getenv("MONGODB_DB_NAME", "careervr"))
    print(f"✅ Connected to: {db_name}")

    # 1. Test Submission Write
    test_sub = {
        "name": "TEST_USER_VERIFY",
        "time": datetime.now().isoformat(),
        "riasec": ["R", "I", "A"],
        "scores": {"R": 10},
        "answers": [1]*50,
        "is_test": True
    }
    
    print("\n1. Testing Insert Submission...")
    try:
        db.db.submissions.insert_one(test_sub)
        print("   ✅ Insert Successful")
    except Exception as e:
        print(f"   ❌ Insert Failed: {e}")
        return

    # 2. Test Submission Read
    print("\n2. Testing Read Submission...")
    found = db.db.submissions.find_one({"name": "TEST_USER_VERIFY"})
    if found:
        print(f"   ✅ Read Successful: Found user {found.get('name')}")
    else:
        print("   ❌ Read Failed: Could not find inserted document")
        return

    # 3. Test Delete
    print("\n3. Testing Delete...")
    try:
        result = db.db.submissions.delete_one({"name": "TEST_USER_VERIFY"})
        if result.deleted_count > 0:
            print("   ✅ Delete Successful")
        else:
            print("   ⚠️ Delete ran but no document found (Already deleted?)")
    except Exception as e:
        print(f"   ❌ Delete Failed: {e}")

if __name__ == "__main__":
    verify_ops()
