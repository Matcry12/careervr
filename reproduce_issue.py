import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def reproduce():
    # 1. Login
    username = "matcry"
    password = "123456" # As set by user in previous step
    
    print(f"Logging in as {username}...")
    res = requests.post(f"{BASE_URL}/api/auth/token", data={"username": username, "password": password})
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        sys.exit(1)
        
    token = res.json()["access_token"]
    print("Logged in. Token acquired.")
    
    # 2. Fetch Submissions
    print("Fetching submissions...")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/api/submissions", headers=headers)
    
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text[:500]}...") # Print first 500 chars

if __name__ == "__main__":
    reproduce()
