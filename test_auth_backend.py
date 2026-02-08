import requests
import sys
import time

BASE_URL = "http://127.0.0.1:8000"

def test_register():
    print("Testing Registration...")
    username = f"testuser_{int(time.time())}"
    password = "password123"
    
    payload = {
        "username": username,
        "full_name": "Test User",
        "password": password,
        "role": "user"
    }
    
    try:
        res = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        if res.status_code == 200:
            print(f"✅ Registration Successful: {username}")
            return username, password
        else:
            print(f"❌ Registration Failed: {res.status_code} - {res.text}")
            return None, None
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None, None

def test_login(username, password):
    print("Testing Login...")
    payload = {
        "username": username,
        "password": password
    }
    
    try:
        res = requests.post(f"{BASE_URL}/api/auth/token", data=payload)
        if res.status_code == 200:
            token = res.json().get("access_token")
            print(f"✅ Login Successful. Token: {token[:10]}...")
            return token
        else:
            print(f"❌ Login Failed: {res.status_code} - {res.text}")
            return None
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def test_verify(token):
    print("Testing Token Verification...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        res = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if res.status_code == 200:
            user = res.json()
            print(f"✅ Users Verification Successful: {user['username']}")
            return True
        else:
            print(f"❌ Verification Failed: {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return False

if __name__ == "__main__":
    print(f"--- Backend Auth Test ({BASE_URL}) ---")
    user, pwd = test_register()
    if user:
        token = test_login(user, pwd)
        if token:
            test_verify(token)
