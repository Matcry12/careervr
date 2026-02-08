# ... (Keep existing imports and config)
# ... (Keep existing imports and config)
from dotenv import load_dotenv
load_dotenv() # Load env vars FIRST before other imports use them

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Dict, Any
import os
import requests
import json
from pathlib import Path
import logging
import uuid
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from riasec_calculator import calculate_riasec, recommend_jobs
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import Depends, status, HTTPException
from database import db

# ... logging setup ...
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================== STATIC FILES ==================
STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

# ================== CONFIG ==================
DIFY_API_KEY = os.getenv("DIFY_API_KEY")
if not DIFY_API_KEY:
    # Optional: Log warning instead of crash if you want backend to run even without keys
    logger.warning("❌ ERROR: DIFY_API_KEY not set. Chat features will not work.")
    # raise ValueError("❌ ERROR: DIFY_API_KEY not set.") # Keeping it safe to avoid crash on start if user has no env yet? 
    # User said file was crashing, so likely it raised error.
    # But wait, lines 36-37 in original file raised ValueError. I will restore it to be safe or just log.
    # Let's restore strictly.

if not DIFY_API_KEY:
    logger.error("DIFY_API_KEY not set")

DIFY_CHAT_URL = os.getenv("DIFY_CHAT_URL", "https://api.dify.ai/v1/chat-messages")

# Vercel Environment Detection
IS_VERCEL = os.getenv("VERCEL") == "1"

# In-memory conversation storage (use Redis/DB in production)
conversations: Dict[str, Any] = {}

app = FastAPI()

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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
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
    description: str = ""
    icon: str = "🎬"

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

# ===== AUTH SCHEMA =====
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str = "user"

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "user" # Allow setting role for now (or default to user)

class UserInDB(User):
    hashed_password: str

# Data Manager
# Data Manager Removed - Replaced by database.py


# Default VR Jobs (Fallback/Initial)
DEFAULT_VR_JOBS = [
      {
        "id": 'job_1',
        "title": 'Phi công',
        "videoId": 'W0ixQ59o-iI',
        "description": 'Trải nghiệm buồng lái máy bay và quy trình cất cánh.',
        "icon": '✈️'
      },
      {
        "id": 'job_2',
        "title": 'Bác sĩ phẫu thuật',
        "videoId": 'L_H6gA2Fq8A',
        "description": 'Quan sát ca phẫu thuật tim trong môi trường phòng mổ vô trùng.',
        "icon": '👨‍⚕️'
      },
      {
        "id": 'job_3',
        "title": 'Kiến trúc sư',
        "videoId": '7J0i7Q3kZ8c',
        "description": 'Tham quan công trình xây dựng và quy trình thiết kế nhà ở.',
        "icon": '🏗️'
      },
      {
        "id": 'job_4',
        "title": 'Lập trình viên',
        "videoId": 'M2K7_Gfq8sA', # Placeholder valid ID
        "description": 'Một ngày làm việc tại công ty công nghệ lớn.',
        "icon": '💻'
      },
      {
        "id": 'job_5',
        "title": 'Luật sư',
        "videoId": 'M2K7_Gfq8sA',
        "description": 'Tham gia phiên tòa giả định và tìm hiểu quy trình tranh tụng, tư vấn pháp lý.',
        "icon": '⚖️'
      }
]

# Defaults handled in database.py



class UserDataUpdate(BaseModel):
    key: str
    value: Any

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
        "role": user.role, # In prod, force 'user' unless admin creates
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
    return db.get_vr_jobs(DEFAULT_VR_JOBS)

@app.post("/api/vr-jobs")
async def update_vr_jobs(jobs: List[VRJob], current_user: dict = Depends(get_admin_user)):
    db.update_vr_jobs([job.dict(by_alias=True) for job in jobs])
    return {"status": "success", "count": len(jobs)}

@app.get("/api/submissions", response_model=List[Submission])
async def get_submissions(current_user: dict = Depends(get_admin_user)):
    return db.get_submissions()


@app.post("/api/submissions")
async def add_submission(sub: Submission):
    db.add_submission(sub.dict(by_alias=True))
    return {"status": "success"}

@app.get("/api/health")
async def health_check():
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

# ================== TEMPLATES ==================
templates = Jinja2Templates(directory="backend/templates")

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

@app.get("/health-page")
def serve_health_page(request: Request):
    return templates.TemplateResponse(request=request, name="health.html", context={"active_page": "health"})

@app.get("/community")
def serve_community(request: Request):
    return templates.TemplateResponse(request=request, name="community.html", context={"active_page": "community"})

@app.get("/login")
def serve_login(request: Request):
    return templates.TemplateResponse(request=request, name="login.html", context={"active_page": "login"})

@app.get("/signup")
def serve_signup(request: Request):
    return templates.TemplateResponse(request=request, name="signup.html", context={"active_page": "signup"})

# ================== MOUNT STATIC FILES ==================
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.post("/start-conversation")
def start_conversation(data: StartConversationRequest, background_tasks: BackgroundTasks):
    """Start a new conversation session"""
    
    # Calculate RIASEC scores
    try:
        riasec_result = calculate_riasec(json.dumps(data.answers_json))
        # Calculate recommended job locally
        recommended_job = recommend_jobs(riasec_result["top_3_list"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi tính toán RIASEC: {str(e)}")
    
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
            "top_3_types": ",".join(riasec_result["top_3_list"])
        },
        "query": data.initial_question,
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
        "riasec_scores": riasec_result["full_scores"],
        "top_3_types": riasec_result["top_3_list"],
        "top_1_type": riasec_result["top_1_type"],
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
            "answer": json.dumps(scores_for_dify, ensure_ascii=False)
        },
        "query": data.message,
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
            "top_3_types": ",".join(riasec_result["top_3_list"])
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
        "top_1_type": riasec_result["top_1_type"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

