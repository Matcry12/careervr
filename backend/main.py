from dotenv import load_dotenv
load_dotenv() # Load env vars FIRST before other imports use them

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Dict, Any
import os
import requests
import json
from pathlib import Path
import logging
import uuid
import io
import re
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from riasec_calculator import calculate_riasec, get_recommendations_3_plus_1
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================== STATIC FILES & TEMPLATES ==================
# Use absolute paths for Vercel compatibility
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

if not STATIC_DIR.exists():
    os.makedirs(STATIC_DIR)

app = FastAPI() # app initialization moved here to be before app.mount and templates initialization

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    response = await call_next(request)
    return response

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    file_path = STATIC_DIR / "favicon.ico"
    if file_path.exists():
        return FileResponse(file_path)
    return JSONResponse(content={"detail": "Not found"}, status_code=404)

# ================== AUTH SCHEMA ==================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str = "user"
    school: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    last_riasec_result: Optional[Dict[str, Any]] = None

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "user"
    school: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    last_riasec_result: Optional[Dict[str, Any]] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    school: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    last_riasec_result: Optional[Dict[str, Any]] = None

class UserInDB(User):
    hashed_password: str

# ================== CONFIG ==================
DIFY_API_KEY = os.getenv("DIFY_API_KEY")
if not DIFY_API_KEY:
    logger.warning("❌ ERROR: DIFY_API_KEY not set. Chat features will not work.")
    logger.error("DIFY_API_KEY not set")

DIFY_CHAT_URL = os.getenv("DIFY_CHAT_URL", "https://api.dify.ai/v1/chat-messages")

IS_VERCEL = os.getenv("VERCEL") == "1"

# In-memory conversation storage (use Redis/DB in production)
conversations: Dict[str, Any] = {}

# ================== SECURITY CONFIG ==================
SECRET_KEY = os.getenv("SECRET_KEY", "careervr_super_secret_key_2026") # Change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 Days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.get_user(username)
    if user is None:
        raise credentials_exception
    return user

@app.put("/api/auth/me", response_model=User)
async def update_profile(profile: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    # Filter out None values to avoid overwriting with nulls if partial update
    updates = {k: v for k, v in profile.model_dump(by_alias=True).items() if v is not None}
    
    if not updates:
        return current_user

    db.update_user_profile(current_user["username"], updates)
    
    # Fetch updated user to return
    updated_data = db.get_user(current_user["username"])
    return User(**updated_data)

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    return current_user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# ... existing CORS ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== PERSISTENCE SETUP =====
# ===== PERSISTENCE SETUP =====
# (Managed by database.py now)

# Models
class VRJob(BaseModel):
    id: str
    title: str
    videoId: str
    riasec_code: str
    description: str = ""
    icon: str = "🎬"

    @field_validator("riasec_code")
    @classmethod
    def validate_riasec_code(cls, value: str):
        normalized = "".join(ch for ch in str(value).upper() if ch in "RIASEC")
        if len(normalized) != 3:
            raise ValueError("riasec_code must contain exactly 3 letters from RIASEC")
        return normalized

class Submission(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = "Ẩn danh"
    class_name: str = Field(alias="class", default="-")
    school: str = "-"
    riasec: List[str]
    scores: Dict[str, int]
    answers: List[int]
    time: str
    suggestedMajors: str = ""
    combinations: str = ""

class Comment(BaseModel):
    id: str
    author: str
    content: str
    timestamp: str

class Post(BaseModel):
    id: str
    author: str
    content: str
    timestamp: str
    comments: List[Comment] = []

class CreatePostRequest(BaseModel):
    author: str
    content: str

class CreateCommentRequest(BaseModel):
    author: str
    content: str



# Data Manager
# Data Manager Removed - Replaced by database.py


# Default VR Jobs (Fallback/Initial)
DEFAULT_VR_JOBS = [
      {
        "id": 'job_1',
        "title": 'Phi công',
        "videoId": 'W0ixQ59o-iI',
        "riasec_code": "RIE",
        "description": 'Trải nghiệm buồng lái máy bay và quy trình cất cánh.',
        "icon": '✈️'
      },
      {
        "id": 'job_2',
        "title": 'Bác sĩ phẫu thuật',
        "videoId": 'L_H6gA2Fq8A',
        "riasec_code": "ISR",
        "description": 'Quan sát ca phẫu thuật tim trong môi trường phòng mổ vô trùng.',
        "icon": '👨‍⚕️'
      },
      {
        "id": 'job_3',
        "title": 'Kiến trúc sư',
        "videoId": '7J0i7Q3kZ8c',
        "riasec_code": "AIR",
        "description": 'Tham quan công trình xây dựng và quy trình thiết kế nhà ở.',
        "icon": '🏗️'
      },
      {
        "id": 'job_4',
        "title": 'Lập trình viên',
        "videoId": 'M2K7_Gfq8sA', # Placeholder valid ID
        "riasec_code": "IRC",
        "description": 'Một ngày làm việc tại công ty công nghệ lớn.',
        "icon": '💻'
      },
      {
        "id": 'job_5',
        "title": 'Luật sư',
        "videoId": 'M2K7_Gfq8sA',
        "riasec_code": "IEC",
        "description": 'Tham gia phiên tòa giả định và tìm hiểu quy trình tranh tụng, tư vấn pháp lý.',
        "icon": '⚖️'
      }
]

# Defaults handled in database.py



VALID_RIASEC_LETTERS = set("RIASEC")
DEFAULT_RIASEC_CODE = "RIC"


def normalize_riasec_code(raw_code: Any) -> Optional[str]:
    normalized = "".join(ch for ch in str(raw_code or "").upper() if ch in VALID_RIASEC_LETTERS)
    if len(normalized) == 3:
        return normalized
    return None


def infer_riasec_code_from_title(title: str) -> Optional[str]:
    from job_data import MAJORS_DB

    title_norm = (title or "").strip().lower()
    for major in MAJORS_DB:
        major_name = major.get("name", "").strip().lower()
        major_code = normalize_riasec_code(major.get("code", ""))
        if title_norm == major_name and major_code:
            return major_code
    return None


def extract_youtube_video_id(url_or_id: str) -> str:
    if not url_or_id:
        return ""
    value = str(url_or_id).strip()
    if "youtube.com" not in value and "youtu.be" not in value:
        return value

    patterns = [
        r"v=([A-Za-z0-9_-]{11})",
        r"youtu\.be/([A-Za-z0-9_-]{11})",
        r"embed/([A-Za-z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return match.group(1)
    return value


def normalize_vr_job_record(job: Dict[str, Any]) -> Dict[str, Any]:
    title = (job.get("title") or job.get("Job Title") or "").strip()
    normalized_code = normalize_riasec_code(
        job.get("riasec_code") or job.get("RIASEC_Code") or job.get("code")
    )
    if not normalized_code:
        normalized_code = infer_riasec_code_from_title(title) or DEFAULT_RIASEC_CODE

    return {
        "id": str(job.get("id") or f"job_{uuid.uuid4().hex[:8]}"),
        "title": title or "Untitled Job",
        "videoId": extract_youtube_video_id(job.get("videoId") or job.get("Video URL") or ""),
        "riasec_code": normalized_code,
        "description": (job.get("description") or job.get("Description") or "").strip(),
        "icon": (job.get("icon") or job.get("Icon_URL") or "🎬").strip() or "🎬",
    }


def get_normalized_vr_jobs() -> List[Dict[str, Any]]:
    raw_jobs = db.get_vr_jobs(DEFAULT_VR_JOBS)
    normalized_jobs = [normalize_vr_job_record(job) for job in raw_jobs]
    return [job for job in normalized_jobs if job.get("videoId")]


def build_recommendation_bundle(scores: Dict[str, int], jobs: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    jobs = jobs if jobs is not None else get_normalized_vr_jobs()
    return get_recommendations_3_plus_1(scores=scores, all_jobs=jobs)


def build_allowed_jobs_text(recommendations: Dict[str, Any]) -> str:
    allowed = recommendations.get("top_4", [])
    if not allowed:
        return "No allowed jobs available."
    return "; ".join(f"{item.get('title')} ({item.get('riasec_code')})" for item in allowed)


def trim_recommendation_for_response(recommendations: Dict[str, Any]) -> Dict[str, Any]:
    fields = ("id", "title", "videoId", "riasec_code", "description", "icon", "relevance_score")

    def project(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [{k: item.get(k) for k in fields} for item in items]

    return {
        "student_code": recommendations.get("student_code"),
        "primary_trait": recommendations.get("primary_trait"),
        "secondary_trait": recommendations.get("secondary_trait"),
        "priority": project(recommendations.get("priority", [])),
        "backup": project(recommendations.get("backup", [])),
        "top_4": project(recommendations.get("top_4", [])),
        "all_sorted_jobs": project(recommendations.get("all_sorted_jobs", [])),
    }


class UserDataUpdate(BaseModel):
    key: str
    value: Any


class RecommendationRequest(BaseModel):
    scores: Dict[str, int]

# ================== AUTH API ==================
@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate):
    db_user = db.get_user(user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_data = {
        "username": user.username,
        "full_name": user.full_name,
        # Prevent privilege escalation through public self-registration.
        "role": "user",
        "hashed_password": hashed_password,
        "created_at": datetime.now().isoformat()
    }
    db.create_user(user_data)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.get_user(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    return current_user

@app.post("/api/user/data")
async def update_user_data(data: UserDataUpdate, current_user: dict = Depends(get_current_active_user)):
    db.update_user_history(current_user["username"], data.key, data.value)
    return {"status": "success"}

@app.get("/api/user/data")
async def get_user_data(current_user: dict = Depends(get_current_active_user)):
    # Return full user object (excluding password)
    safe_user = current_user.copy()
    safe_user.pop("hashed_password", None)
    safe_user.pop("_id", None) # Remove mongo ID if exists
    return safe_user

# ===== API ROUTES =====

@app.get("/api/vr-jobs", response_model=List[VRJob])
async def get_vr_jobs():
    return get_normalized_vr_jobs()

@app.post("/api/vr-jobs")
async def update_vr_jobs(jobs: List[VRJob], current_user: dict = Depends(get_admin_user)):
    normalized_jobs = [normalize_vr_job_record(job.model_dump(by_alias=True)) for job in jobs]
    db.update_vr_jobs(normalized_jobs)
    return {"status": "success", "count": len(jobs)}


@app.post("/api/recommendations")
async def get_recommendations(payload: RecommendationRequest):
    recommendations = build_recommendation_bundle(payload.scores)
    return {"recommendations": trim_recommendation_for_response(recommendations)}


@app.get("/api/vr-jobs/template")
async def download_vr_template(current_user: dict = Depends(get_admin_user)):
    from openpyxl import Workbook

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "VR Jobs Template"
    headers = ["Job Title", "Video URL", "Description", "RIASEC_Code", "Icon_URL"]
    sheet.append(headers)
    sheet.append(["Lập trình viên", "https://www.youtube.com/watch?v=M2K7_Gfq8sA", "Mô tả ngắn", "IRC", "💻"])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=vr_jobs_template.xlsx"}
    )


@app.post("/api/vr-jobs/import")
async def import_vr_jobs(file: UploadFile = File(...), current_user: dict = Depends(get_admin_user)):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")

    try:
        import pandas as pd
        df = pd.read_excel(file.file)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {exc}")

    required_columns = ["Job Title", "Video URL", "Description", "RIASEC_Code", "Icon_URL"]
    missing_columns = [column for column in required_columns if column not in df.columns]
    if missing_columns:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_columns)}")

    jobs = get_normalized_vr_jobs()
    jobs_by_title = {job["title"].strip().lower(): job for job in jobs}
    result = {"created": 0, "updated": 0, "skipped": 0, "errors": []}

    for index, row in df.iterrows():
        raw_title = row.get("Job Title", "")
        title = "" if pd.isna(raw_title) else str(raw_title).strip()
        if not title:
            result["skipped"] += 1
            result["errors"].append(f"Row {index + 2}: Missing Job Title")
            continue

        raw_code = row.get("RIASEC_Code", "")
        riasec_code = None if pd.isna(raw_code) else normalize_riasec_code(raw_code)
        if not riasec_code:
            result["skipped"] += 1
            result["errors"].append(f"Row {index + 2}: Missing or invalid RIASEC_Code")
            continue

        raw_video_url = row.get("Video URL", "")
        video_url = "" if pd.isna(raw_video_url) else str(raw_video_url).strip()

        row_job = normalize_vr_job_record({
            "title": title,
            "Video URL": video_url,
            "Description": "" if pd.isna(row.get("Description", "")) else row.get("Description", ""),
            "RIASEC_Code": riasec_code,
            "Icon_URL": "" if pd.isna(row.get("Icon_URL", "")) else row.get("Icon_URL", "🎬"),
        })
        if not row_job["videoId"]:
            result["skipped"] += 1
            result["errors"].append(f"Row {index + 2}: Missing or invalid Video URL")
            continue

        existing = jobs_by_title.get(title.lower())
        if existing:
            row_job["id"] = existing["id"]
            jobs_by_title[title.lower()] = row_job
            result["updated"] += 1
        else:
            jobs_by_title[title.lower()] = row_job
            result["created"] += 1

    db.update_vr_jobs(list(jobs_by_title.values()))
    return {"status": "success", **result}

@app.get("/api/submissions", response_model=List[Submission])
async def get_submissions(current_user: dict = Depends(get_admin_user)):
    return db.get_submissions()


@app.post("/api/submissions")
async def add_submission(sub: Submission):
    db.add_submission(sub.model_dump(by_alias=True))
    return {"status": "success"}

@app.get("/api/health")
async def api_health_check():
    return {
        "status": "ok",
        "db_type": "MongoDB Atlas" if db.is_mongo else "Local File",
        "db_connected": db.is_mongo,
        "database_name": getattr(db, "db_name", "N/A")
    }

# ================== COMMUNITY API ==================
@app.get("/api/community/posts", response_model=List[Post])
async def get_posts():
    return db.get_posts()

@app.post("/api/community/posts")
async def create_post(req: CreatePostRequest):
    new_post = {
        "id": str(uuid.uuid4()),
        "author": req.author.strip() or "Ẩn danh",
        "content": req.content,
        "timestamp": datetime.now().isoformat(),
        "comments": []
    }
    db.add_post(new_post)
    return new_post

@app.post("/api/community/posts/{post_id}/comments")
async def add_comment(post_id: str, req: CreateCommentRequest):
    new_comment = {
        "id": str(uuid.uuid4()),
        "author": req.author.strip() or "Ẩn danh",
        "content": req.content,
        "timestamp": datetime.now().isoformat()
    }
    db.add_comment(post_id, new_comment)
    return new_comment

# ================== HELPERS ==================
def call_dify_api(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to call Dify API with error handling"""
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            DIFY_CHAT_URL,
            json=payload,
            headers=headers,
            timeout=90
        )
    except Exception as e:
        print(f"Dify request error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi kết nối Dify: {str(e)}"
        )
    
    if response.status_code != 200:
        print(f"Dify error {response.status_code}: {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )
        
    return response.json()

def send_log_to_sheet(data: Dict[str, Any]):
    """Background task to send data to Google Sheet"""
    # Google Script URL provided by user
    GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzclNQP90TSF7MuQ_Y6a4TUAmSJjeiu_wLw-DvfamwnB51Rk8JUMDYo_xm9jgsZuflG/exec"
    
    try:
        # Construct payload matching the Google Apps Script expectation
        payload = {
            "name": data.get("name"),
            "class": data.get("class"),
            "school": data.get("school"),
            "R": data.get("riasec_scores", {}).get("R"),
            "I": data.get("riasec_scores", {}).get("I"),
            "A": data.get("riasec_scores", {}).get("A"),
            "S": data.get("riasec_scores", {}).get("S"),
            "E": data.get("riasec_scores", {}).get("E"),
            "C": data.get("riasec_scores", {}).get("C"),
            "top_riasec": ",".join(data.get("top_3_types", [])),
            "nganh_de_xuat": data.get("nganh_de_xuat"),
            "khoi_thi": "A00, A01" # Placeholder or logic for khoi_thi could be added later
        }
        
        requests.post(GOOGLE_SCRIPT_URL, json=payload, timeout=10)
        print(f"✅ Logged to Google Sheet: {data.get('name')}")
    except Exception as e:
        print(f"❌ Failed to log to Google Sheet: {str(e)}")

# ================== SCHEMA ==================
class RIASECRequest(BaseModel):
    name: str
    class_: str = Field(alias="class")
    school: str
    answers_json: List[int] = Field(alias="answer")
    
    @field_validator("name", "class_", "school")
    @classmethod
    def check_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Tên, lớp, trường không được để trống")
        return v.strip()
    
    @field_validator("answers_json")
    @classmethod
    def validate_answers(cls, v):
        if len(v) != 50:
            raise ValueError("Phải trả lời đủ 50 câu")
        if not all(1 <= ans <= 5 for ans in v):
            raise ValueError("Các câu trả lời phải từ 1 đến 5")
        return v

class StartConversationRequest(RIASECRequest):
    initial_question: str = "Hãy giới thiệu về các hướng nghiệp phù hợp cho tôi"

class ChatMessage(BaseModel):
    conversation_id: str
    message: str

# ================== API ==================
@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "CareerGo - Hành trình hướng nghiệp số backend is running"}

@app.get("/")
def serve_index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"active_page": "home"})

@app.get("/test")
def serve_test(request: Request):
    return templates.TemplateResponse(request=request, name="test.html", context={"active_page": "test"})

@app.get("/results")
def serve_results(request: Request):
    return templates.TemplateResponse(request=request, name="results.html", context={"active_page": "results"})

@app.get("/chatbot")
def serve_chatbot(request: Request):
    return templates.TemplateResponse(request=request, name="chatbot.html", context={"active_page": "chatbot"})

@app.get("/vr-mode")
def serve_vr(request: Request):
    return templates.TemplateResponse(request=request, name="vr.html", context={"active_page": "vr"})

@app.get("/dashboard")
def serve_dashboard(request: Request):
    # API data is protected. Page just shows empty or login prompt if API fails.
    return templates.TemplateResponse(request=request, name="dashboard.html", context={"active_page": "dashboard"})



@app.get("/community")
def serve_community(request: Request):
    return templates.TemplateResponse(request=request, name="community.html", context={"active_page": "community"})

@app.get("/profile")
def serve_profile(request: Request):
    return templates.TemplateResponse(request=request, name="profile.html", context={"active_page": "profile"})

@app.get("/login")
def serve_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html", context={"active_page": "login"})

@app.get("/signup")
def serve_signup(request: Request):
    return templates.TemplateResponse(request=request, name="signup.html", context={"active_page": "signup"})

@app.post("/start-conversation")
def start_conversation(data: StartConversationRequest, background_tasks: BackgroundTasks):
    """Start a new conversation session"""
    
    # Calculate RIASEC scores
    try:
        riasec_result = calculate_riasec(json.dumps(data.answers_json))
        jobs = get_normalized_vr_jobs()
        recommendations = build_recommendation_bundle(riasec_result["full_scores"], jobs=jobs)
        recommended_job = ", ".join(item["title"] for item in recommendations.get("priority", []))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tính toán RIASEC: {str(e)}")
    
    allowed_jobs_text = build_allowed_jobs_text(recommendations)

    # Prepare Dify payload with added RIASEC type
    scores_for_dify = riasec_result["full_scores"].copy()
    scores_for_dify["riasec_type"] = "-".join(riasec_result["top_3_list"])
    
    # Send initial message to Dify
    payload = {
        "inputs": {
            "name": data.name,
            "class": data.class_,
            "school": data.school,
            "answer": json.dumps(scores_for_dify, ensure_ascii=False),
            "riasec_scores": json.dumps(scores_for_dify, ensure_ascii=False),
            "top_3_types": ",".join(riasec_result["top_3_list"]),
            "allowed_jobs": allowed_jobs_text
        },
        "query": (
            f"{data.initial_question}\n\n"
            f"ALLOWED JOBS: {allowed_jobs_text}\n"
            "Only recommend jobs from the allowed list above. Do not invent job titles."
        ),
        "response_mode": "blocking",
        "user": data.name.strip() or "student"
    }
    
    # Trigger Background Logging
    log_data = {
        "name": data.name,
        "class": data.class_,
        "school": data.school,
        "riasec_scores": riasec_result["full_scores"],
        "top_3_types": riasec_result["top_3_list"],
        "nganh_de_xuat": recommended_job
    }
    background_tasks.add_task(send_log_to_sheet, log_data)
    
    try:
        dify_result = call_dify_api(payload)
    except Exception:
        # If Dify fails here, we shouldn't create the conversation
        raise

    ai_message = dify_result.get("answer", "")
    dify_conv_id = dify_result.get("conversation_id")
    
    # Create and store conversation session
    conversation_id = str(uuid.uuid4())
    conversations[conversation_id] = {
        "name": data.name,
        "class": data.class_,
        "school": data.school,
        "riasec_scores": riasec_result["full_scores"],
        "top_3_types": riasec_result["top_3_list"],
        "top_1_type": riasec_result["top_1_type"],
        "recommendations": trim_recommendation_for_response(recommendations),
        "allowed_jobs_text": allowed_jobs_text,
        "answers_json": data.answers_json,
        "messages": [
            {"role": "user", "content": data.initial_question},
            {"role": "assistant", "content": ai_message}
        ],
        "dify_conversation_id": dify_conv_id
    }
    
    return {
        "conversation_id": conversation_id,
        "riasec_scores": riasec_result["full_scores"],
        "top_3_types": riasec_result["top_3_list"],
        "recommendations": trim_recommendation_for_response(recommendations),
        "ai_response": ai_message
    }

@app.post("/chat")
def chat(data: ChatMessage):
    """Continue conversation"""
    conversation_id = data.conversation_id
    
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation không tồn tại")
    
    conv = conversations[conversation_id]
    
    # Prepare Dify payload with added RIASEC type
    scores_for_dify = conv["riasec_scores"].copy()
    scores_for_dify["riasec_type"] = "-".join(conv["top_3_types"])
    
    # Send message to Dify
    payload = {
        "inputs": {
            "name": conv["name"],
            "class": conv["class"],
            "school": conv["school"],
            "riasec_scores": json.dumps(scores_for_dify, ensure_ascii=False),
            "top_3_types": ",".join(conv["top_3_types"]),
            "answer": json.dumps(scores_for_dify, ensure_ascii=False),
            "allowed_jobs": conv.get("allowed_jobs_text", "")
        },
        "query": (
            f"{data.message}\n\n"
            f"ALLOWED JOBS: {conv.get('allowed_jobs_text', '')}\n"
            "Only recommend jobs from the allowed list above. Do not invent job titles."
        ),
        "response_mode": "blocking",
        "conversation_id": conv["dify_conversation_id"],
        "user": conv["name"].strip() or "student"
    }
    
    dify_result = call_dify_api(payload)
    ai_message = dify_result.get("answer", "")
    
    # Store messages
    conv["messages"].append({"role": "user", "content": data.message})
    conv["messages"].append({"role": "assistant", "content": ai_message})
    
    return {
        "conversation_id": conversation_id,
        "ai_response": ai_message,
        "messages": conv["messages"]
    }

@app.post("/run-riasec")
def run_riasec(data: RIASECRequest):
    """
    Legacy endpoint for RIASEC calculation + Dify Analysis.
    Standardized to match other endpoints.
    """
    
    # Calculate RIASEC scores
    try:
        riasec_result = calculate_riasec(json.dumps(data.answers_json))
        recommendations = build_recommendation_bundle(riasec_result["full_scores"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tính toán RIASEC: {str(e)}")

    # Prepare Dify payload with added RIASEC type
    scores_for_dify = riasec_result["full_scores"].copy()
    scores_for_dify["riasec_type"] = "-".join(riasec_result["top_3_list"])

    # Send to Dify
    payload = {
        "inputs": {
            "name": data.name,
            "class": data.class_,
            "school": data.school,
            "answer": json.dumps(scores_for_dify, ensure_ascii=False),
            "riasec_scores": json.dumps(scores_for_dify, ensure_ascii=False),
            "top_3_types": ",".join(riasec_result["top_3_list"]),
            "allowed_jobs": build_allowed_jobs_text(recommendations)
        },
        "query": (
            "Dựa trên thông tin học sinh và kết quả trắc nghiệm RIASEC, "
            "hãy phân tích và đưa ra bản tư vấn hướng nghiệp rõ ràng, "
            "phù hợp với học sinh THPT Việt Nam."
        ),
        "response_mode": "blocking",
        "user": data.name.strip() or "student"
    }

    dify_result = call_dify_api(payload)
    text_output = dify_result.get("answer", "")

    # Standardized flat response (removes nested "data.outputs")
    return {
        "text": text_output,
        "riasec_scores": riasec_result["full_scores"],
        "top_3_types": riasec_result["top_3_list"],
        "top_1_type": riasec_result["top_1_type"],
        "recommendations": trim_recommendation_for_response(recommendations)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
