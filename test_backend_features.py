import requests
import time
import json

BASE_URL = "http://127.0.0.1:8000"

def get_token(username, password):
    res = requests.post(f"{BASE_URL}/api/auth/token", data={"username": username, "password": password})
    if res.status_code == 200:
        return res.json()["access_token"]
    return None

def register_user(username, password, role="user"):
    payload = {
        "username": username,
        "full_name": f"Test {role.capitalize()}",
        "password": password,
        "role": role
    }
    requests.post(f"{BASE_URL}/api/auth/register", json=payload)
    return get_token(username, password)

def test_health():
    print("\n--- Testing Health Check ---")
    try:
        res = requests.get(f"{BASE_URL}/api/health")
        if res.status_code == 200:
            print("✅ Health Check Passed")
            print(f"   DB Connected: {res.json().get('db_connected')}")
        else:
            print(f"❌ Health Check Failed: {res.status_code}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def test_vr_jobs(admin_token, user_token):
    print("\n--- Testing VR Jobs ---")
    # 1. Public Get
    res = requests.get(f"{BASE_URL}/api/vr-jobs")
    if res.status_code == 200:
        print(f"✅ Public Get VR Jobs Passed (Count: {len(res.json())})")
    else:
        print(f"❌ Public Get VR Jobs Failed: {res.status_code}")

    # 2. User Post (Should Fail)
    new_jobs = [{"id": "test_job", "title": "Test Job", "videoId": "123", "riasec_code": "RIC", "description": "Desc", "icon": "T"}]
    res = requests.post(f"{BASE_URL}/api/vr-jobs", json=new_jobs, headers={"Authorization": f"Bearer {user_token}"})
    if res.status_code in [401, 403]:
        print("✅ User Post VR Jobs Correctly Rejected (403/401)")
    else:
        print(f"❌ User Post VR Jobs Unexpected: {res.status_code}")

    # 3. Admin Post (Should Succeed)
    res = requests.post(f"{BASE_URL}/api/vr-jobs", json=new_jobs, headers={"Authorization": f"Bearer {admin_token}"})
    if res.status_code == 200:
        print("✅ Admin Post VR Jobs Passed")
    else:
        print(f"❌ Admin Post VR Jobs Failed: {res.status_code} - {res.text}")

def test_submissions(admin_token, user_token):
    print("\n--- Testing Submissions ---")
    # 1. Public Submit
    sub = {
        "name": "Test Student",
        "class": "12A",
        "school": "Test School",
        "riasec": ["R", "I", "A"],
        "scores": {"R": 10},
        "answers": [1]*50,
        "time": "2023-01-01T00:00:00",
        "suggestedMajors": "IT",
        "combinations": "A00"
    }
    res = requests.post(f"{BASE_URL}/api/submissions", json=sub)
    if res.status_code == 200:
        print("✅ Public Submission Passed")
    else:
        print(f"❌ Public Submission Failed: {res.status_code} - {res.text}")

    # 2. User Get (Should Fail/Forbidden) - Actually API might be admin only
    res = requests.get(f"{BASE_URL}/api/submissions", headers={"Authorization": f"Bearer {user_token}"})
    if res.status_code in [401, 403]:
        print("✅ User Get Submissions Correctly Rejected (403/401)")
    else:
        print(f"❌ User Get Submissions Unexpected: {res.status_code}")

    # 3. Admin Get (Should Succeed)
    res = requests.get(f"{BASE_URL}/api/submissions", headers={"Authorization": f"Bearer {admin_token}"})
    if res.status_code == 200:
        data = res.json()
        found = any(s['name'] == "Test Student" for s in data)
        print(f"✅ Admin Get Submissions Passed (Found submitted: {found})")
    else:
        print(f"❌ Admin Get Submissions Failed: {res.status_code}")

def test_user_data(user_token):
    print("\n--- Testing User Data Persistence ---")
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 1. Save Data
    payload = {"key": "test_key", "value": {"some": "data"}}
    res = requests.post(f"{BASE_URL}/api/user/data", json=payload, headers=headers)
    if res.status_code == 200:
        print("✅ Save User Data Passed")
    else:
        print(f"❌ Save User Data Failed: {res.status_code} - {res.text}")

    # 2. Load Data
    res = requests.get(f"{BASE_URL}/api/user/data", headers=headers)
    if res.status_code == 200:
        data = res.json()
        if data.get("test_key", {}).get("some") == "data":
            print("✅ Load User Data Passed (Data Matched)")
        else:
            print(f"❌ Load User Data Mismatch: {data}")
    else:
        print(f"❌ Load User Data Failed: {res.status_code}")


if __name__ == "__main__":
    ts = int(time.time())
    admin_user = f"admin_{ts}"
    normal_user = f"user_{ts}"
    pwd = "password123"

    print(f"Creating Admin: {admin_user}")
    admin_token = register_user(admin_user, pwd, "admin")
    
    print(f"Creating User: {normal_user}")
    user_token = register_user(normal_user, pwd, "user")

    if admin_token and user_token:
        test_health()
        test_vr_jobs(admin_token, user_token)
        test_submissions(admin_token, user_token)
        test_user_data(user_token)
    else:
        print("❌ Failed to create users/tokens. Aborting.")
