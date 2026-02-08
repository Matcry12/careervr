from passlib.context import CryptContext
import sys

try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    print("Hashing password...")
    hash_ = pwd_context.hash("testpassword")
    print(f"Hash created: {hash_}")
    print("Verifying password...")
    valid = pwd_context.verify("testpassword", hash_)
    print(f"Password valid: {valid}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
