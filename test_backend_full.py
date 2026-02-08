
import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import tempfile
import shutil
from pathlib import Path

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the app and db
# We need to make sure we don't trigger real DB connections during import if possible, 
# although the code tries to connect on init.
# We will patch environment variables before importing if needed, but imports happened at top level.
# So we rely on mocking 'db' after import or during tests.

from backend.main import app, db
from backend.database import Database

client = TestClient(app)

# Test Fixture for Isolated DB
@pytest.fixture(scope="module")
def test_db():
    # Create temp directory for data
    test_dir = tempfile.mkdtemp()
    test_data_path = Path(test_dir)
    
    # Save original state
    original_data_dir = db.data_dir
    original_is_mongo = db.is_mongo
    original_db_obj = db.db

    # Override db state to use local temp files
    db.data_dir = test_data_path
    db.is_mongo = False
    db.db = None
    
    # Update file paths in db instance because they are set in __init__
    db.vr_jobs_file = db.data_dir / "vr_jobs.json"
    db.submissions_file = db.data_dir / "submissions.json"
    db.posts_file = db.data_dir / "posts.json"
    db.users_file = db.data_dir / "users.json"

    yield db

    # Cleanup
    shutil.rmtree(test_dir)
    db.data_dir = original_data_dir
    db.is_mongo = original_is_mongo
    db.db = original_db_obj

# Test Fixture for Mocking Dify API
@pytest.fixture
def mock_dify():
    with patch("backend.main.call_dify_api") as mock:
        mock.return_value = {
            "conversation_id": "test-conv-id",
            "answer": "This is a mock AI response",
            "id": "msg-id"
        }
        yield mock

# Test Fixture for Mocking Background Tasks (Sheets)
@pytest.fixture
def mock_sheets():
    with patch("backend.main.requests.post") as mock:
        mock.return_value.status_code = 200
        yield mock

# ================= TESTS =================

def test_health_check(test_db):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    # assert response.json()["db_type"] == "Local File" 

def test_static_pages(test_db):
    pages = ["/", "/results", "/chatbot", "/vr-mode", "/dashboard", "/community", "/login", "/signup"]
    for page in pages:
        response = client.get(page)
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

def test_auth_flow(test_db):
    # 1. Register
    username = "testuser"
    password = "password123"
    response = client.post("/api/auth/register", json={
        "username": username,
        "password": password,
        "full_name": "Test User",
        "role": "user"
    })
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 2. Login
    response = client.post("/api/auth/token", data={
        "username": username,
        "password": password
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

    # 3. Get Me
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == username
    assert response.json()["role"] == "user"

    # 4. Duplicate Register
    response = client.post("/api/auth/register", json={
        "username": username,
        "password": "newpassword"
    })
    assert response.status_code == 400

def test_vr_jobs(test_db):
    # 1. Get Jobs (should return default even if empty)
    response = client.get("/api/vr-jobs")
    assert response.status_code == 200
    jobs = response.json()
    assert isinstance(jobs, list)
    assert len(jobs) > 0 # Should have defaults

    # 2. Update Jobs (Admin only)
    # Create Admin
    admin_data = {"username": "admin", "password": "adminpass", "role": "admin"}
    client.post("/api/auth/register", json=admin_data)
    login_res = client.post("/api/auth/token", data={"username": "admin", "password": "adminpass"})
    admin_token = login_res.json()["access_token"]
    
    new_jobs = [{"id": "j1", "title": "New Job", "videoId": "v1", "description": "desc", "icon": "x"}]
    res = client.post("/api/vr-jobs", json=new_jobs, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # Verify Update
    res = client.get("/api/vr-jobs")
    assert res.json()[0]["title"] == "New Job"

    # 3. Update as non-admin (fail)
    user_data = {"username": "u2", "password": "p2", "role": "user"}
    client.post("/api/auth/register", json=user_data)
    login_res = client.post("/api/auth/token", data={"username": "u2", "password": "p2"})
    user_token = login_res.json()["access_token"]
    
    res = client.post("/api/vr-jobs", json=new_jobs, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403

def test_community_posts(test_db):
    # 1. Create Post
    post_data = {"author": "Tester", "content": "Hello World"}
    res = client.post("/api/community/posts", json=post_data)
    assert res.status_code == 200
    post_id = res.json()["id"]

    # 2. Get Posts
    res = client.get("/api/community/posts")
    posts = res.json()
    assert len(posts) > 0
    assert posts[0]["id"] == post_id
    assert posts[0]["content"] == "Hello World"

    # 3. Add Comment
    comment_data = {"author": "Commenter", "content": "Nice post"}
    res = client.post(f"/api/community/posts/{post_id}/comments", json=comment_data)
    assert res.status_code == 200
    
    # Verify Comment
    res = client.get("/api/community/posts")
    assert len(res.json()[0]["comments"]) == 1

def test_submissions(test_db):
    # 1. Add Submission
    # "class" is a reserved keyword in python parameters but pydantic alias should handle it
    # The model expects "class" in JSON (mapped to class_ in python)
    sub_data = {
        "name": "Student Submission",
        "class": "12A",
        "school": "Test School",
        "riasec": ["R", "I", "A"],
        "scores": {"R": 10, "I": 8, "A": 5, "S": 2, "E": 1, "C": 0},
        "answers": [5] * 50,
        "time": "2023-01-01",
        "suggestedMajors": "IT",
        "combinations": "A00"
    }
    res = client.post("/api/submissions", json=sub_data)
    assert res.status_code == 200

    # 2. Get Submissions (Admin Only)
    # create admin again or reuse? The DB is shared in module scope, so users persist
    # reuse "admin" from test_vr_jobs if order allows, but better to just login again
    # We created 'admin' in test_vr_jobs. Tests might run in any order if we didn't enforce it?
    # Pytest runs in order of definition usually.
    # To be safe, verify or create.
    
    # Let's just create a new specific admin for this test to be robust
    try:
        client.post("/api/auth/register", json={"username": "sub_admin", "password": "pw", "role": "admin"})
    except:
        pass # maybe already exists
    
    token_res = client.post("/api/auth/token", data={"username": "sub_admin", "password": "pw"})
    token = token_res.json()["access_token"]

    res = client.get("/api/submissions", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    subs = res.json()
    assert len(subs) > 0
    assert subs[-1]["name"] == "Student Submission"

def test_user_data(test_db):
    # 1. Register/Login User
    username = "data_user"
    client.post("/api/auth/register", json={"username": username, "password": "pw", "role": "user"})
    token_res = client.post("/api/auth/token", data={"username": username, "password": "pw"})
    token = token_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update Data
    res = client.post("/api/user/data", json={"key": "last_riasec", "value": "RIA"}, headers=headers)
    assert res.status_code == 200

    # 3. Get Data
    res = client.get("/api/user/data", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["last_riasec"] == "RIA"


def test_start_conversation(test_db, mock_dify, mock_sheets):
    payload = {
        "name": "Student A",
        "class": "12A",
        "school": "High School",
        "answer": [5] * 50 # 50 answers of '5'
    }
    
    # We need to mock calculate_riasec inside backend.main because it might fail or be slow
    # But let's try to let it run if it's pure logic.
    # The payload requires 'answer' as list of ints.
    
    res = client.post("/start-conversation", json=payload)
    if res.status_code != 200:
        print(f"Start Conv Failed: {res.text}")
        
    assert res.status_code == 200
    data = res.json()
    assert "conversation_id" in data
    assert "riasec_scores" in data
    assert "ai_response" in data
    assert data["ai_response"] == "This is a mock AI response"

def test_chat(test_db, mock_dify):
    # Need a valid conversation first
    # Or we can just manually insert one into the backend's memory if we can access it
    # 'conversations' is a global in backend.main
    from backend.main import conversations
    
    conv_id = "manual-test-id"
    conversations[conv_id] = {
        "name": "Test",
        "class": "10",
        "school": "Sch",
        "riasec_scores": {},
        "top_3_types": ["R", "I", "A"],
        "dify_conversation_id": "dify-id",
        "messages": []
    }

    res = client.post("/chat", json={"conversation_id": conv_id, "message": "hello"})
    assert res.status_code == 200
    assert res.json()["ai_response"] == "This is a mock AI response"

def test_run_riasec_legacy(test_db, mock_dify):
    payload = {
        "name": "Student B",
        "class": "11B",
        "school": "School B",
        "answer": [1] * 50
    }
    res = client.post("/run-riasec", json=payload)
    assert res.status_code == 200
    assert "text" in res.json()
    assert res.json()["text"] == "This is a mock AI response"

