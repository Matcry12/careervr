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
import unicodedata
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
APP_RUNTIME_VERSION = "careervr-api-2026-02-19-r2"

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
    response.headers["X-CareerVR-App-Version"] = APP_RUNTIME_VERSION
    return response


@app.on_event("startup")
async def run_data_migrations():
    write_enabled = bool(db.is_mongo or not os.getenv("VERCEL"))
    logger.info(
        "Persistence mode: is_mongo=%s, vercel=%s, write_enabled=%s",
        db.is_mongo,
        bool(os.getenv("VERCEL")),
        write_enabled,
    )
    try:
        stats = db.normalize_community_posts_schema()
        logger.info(
            "Community schema migration completed: scanned=%s, updated=%s",
            stats.get("scanned", 0),
            stats.get("updated", 0),
        )
    except Exception as exc:
        logger.error(f"Community schema migration failed: {exc}")

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
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)

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


async def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme_optional)):
    if not token:
        return None
    try:
        return await get_current_user(token)
    except HTTPException:
        return None

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
    role = str(current_user.get("role", "")).strip().lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

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
    author_role: str = "user"
    content: str
    timestamp: str
    helpful: bool = False
    reports_count: int = 0

class Post(BaseModel):
    id: str
    title: str = "Bài viết cộng đồng"
    category: str = "general"
    author: str
    author_role: str = "user"
    content: str
    timestamp: str
    comments: List[Comment] = []
    likes_count: int = 0
    liked_by: List[str] = []
    liked_by_me: bool = False
    owner_actor: str = ""
    helpful_comment_id: Optional[str] = None
    can_mark_helpful: bool = False
    reports_count: int = 0
    is_pinned: bool = False
    pinned_at: Optional[str] = None
    can_delete: bool = False
    can_delete_reason: Optional[str] = None

class CreatePostRequest(BaseModel):
    author: str
    title: Optional[str] = None
    category: Optional[str] = None
    content: str
    actor_id: Optional[str] = None

class CreateCommentRequest(BaseModel):
    author: str
    content: str
    actor_id: Optional[str] = None


class ToggleLikeRequest(BaseModel):
    actor_id: str
    liked: Optional[bool] = None


class MarkHelpfulCommentRequest(BaseModel):
    actor_id: str
    helpful: Optional[bool] = None


class ReportContentRequest(BaseModel):
    actor_id: str
    reason: str
    detail: Optional[str] = None

class DeletePostRequest(BaseModel):
    actor_id: Optional[str] = None

class CommunityOwnershipRepairRequest(BaseModel):
    dry_run: bool = True
    limit: int = 5000


class TogglePinRequest(BaseModel):
    pinned: Optional[bool] = None


class CommunitySuggestionsResponse(BaseModel):
    id: str
    title: str
    author: str
    author_role: str = "user"
    category: str = "general"
    timestamp: str
    comments_count: int = 0
    likes_count: int = 0
    is_pinned: bool = False


class RelatedPostResponse(BaseModel):
    id: str
    title: str
    author: str
    category: str
    timestamp: str
    likes_count: int = 0
    comments_count: int = 0
    similarity_score: float = 0.0


class CommunityRagAskRequest(BaseModel):
    question: str
    top_k: int = 3
    riasec: Optional[str] = None


class CommunityRagCitation(BaseModel):
    post_id: str
    title: str
    snippet: str
    category: str
    score: float
    url: str


class CommunityRagAskResponse(BaseModel):
    answer: str
    citations: List[CommunityRagCitation]
    method: str = "extractive-retrieval-v1"


COMMUNITY_ALLOWED_CATEGORIES = {
    "major",
    "skills",
    "admissions",
    "study",
    "mindset",
    "general",
}


def normalize_community_category(raw: Optional[str]) -> str:
    category = (raw or "general").strip().lower()
    return category if category in COMMUNITY_ALLOWED_CATEGORIES else "general"


def normalize_text_search(value: Optional[str]) -> str:
    raw = str(value or "").strip().lower()
    normalized = "".join(
        ch for ch in unicodedata.normalize("NFD", raw)
        if unicodedata.category(ch) != "Mn"
    )
    return normalized


def normalize_actor_id(value: Optional[str]) -> str:
    return str(value or "").strip()[:128]


def fallback_owner_actor_from_author(author: Optional[str]) -> str:
    base = normalize_text_search(author)
    slug = re.sub(r"[^a-z0-9]+", "_", base).strip("_")
    if not slug:
        slug = "anonymous"
    return f"author:{slug}"


def resolve_user_role(username: Optional[str]) -> str:
    username = str(username or "").strip()
    if not username:
        return "user"
    user = db.get_user(username)
    role = str((user or {}).get("role") or "").strip().lower()
    return role if role in {"admin", "mentor"} else "user"


def resolve_bound_actor_id(
    requested_actor: Optional[str],
    current_user: Optional[dict],
    allow_guest: bool = True,
) -> str:
    if current_user:
        expected = f"user:{str(current_user.get('username') or '').strip()}"
        raw = normalize_actor_id(requested_actor)
        if raw and raw != expected:
            raise HTTPException(status_code=403, detail="actor_id does not match authenticated user")
        return expected

    if not allow_guest:
        raise HTTPException(status_code=401, detail="Authentication required")

    raw = normalize_actor_id(requested_actor)
    if not raw:
        raise HTTPException(status_code=400, detail="actor_id is required")
    if raw.startswith("user:"):
        raise HTTPException(status_code=403, detail="Guest actor_id cannot claim user identity")
    return raw


def evaluate_post_delete_permission(
    post: Dict[str, Any],
    actor: Optional[str],
    current_user: Optional[dict] = None,
) -> Dict[str, Any]:
    actor_norm = normalize_actor_id(actor)
    owner_actor = str(post.get("owner_actor") or "").strip()
    if not owner_actor:
        owner_actor = fallback_owner_actor_from_author(post.get("author"))

    post_author_username = str(post.get("author_username") or "").strip().lower()
    post_author_name = normalize_text_search(post.get("author"))

    actor_user = ""
    if actor_norm.startswith("user:"):
        actor_user = actor_norm.split(":", 1)[1].strip().lower()

    role = str((current_user or {}).get("role") or "").strip().lower()
    if not role and actor_user:
        role = resolve_user_role(actor_user)
    is_admin = role == "admin"

    if is_admin:
        return {
            "allowed": True,
            "reason": "admin_role",
            "owner_actor": owner_actor,
            "role": role,
            "actor_user": actor_user,
            "post_author_username": post_author_username,
        }

    if actor_norm and actor_norm == owner_actor:
        return {
            "allowed": True,
            "reason": "owner_actor_match",
            "owner_actor": owner_actor,
            "role": role or "guest",
            "actor_user": actor_user,
            "post_author_username": post_author_username,
        }

    if actor_user and post_author_username and post_author_username == actor_user:
        return {
            "allowed": True,
            "reason": "author_username_match",
            "owner_actor": owner_actor,
            "role": role or "user",
            "actor_user": actor_user,
            "post_author_username": post_author_username,
        }

    if actor_user and post_author_name and post_author_name == normalize_text_search(actor_user):
        return {
            "allowed": True,
            "reason": "author_name_match_legacy",
            "owner_actor": owner_actor,
            "role": role or "user",
            "actor_user": actor_user,
            "post_author_username": post_author_username,
        }

    return {
        "allowed": False,
        "reason": "not_authenticated" if not actor_norm else "owner_mismatch",
        "owner_actor": owner_actor,
        "role": role or "guest",
        "actor_user": actor_user,
        "post_author_username": post_author_username,
    }


COMMUNITY_REPORT_REASONS = {
    "spam",
    "abuse",
    "misinformation",
    "offtopic",
    "other",
}


def normalize_report_reason(raw: Optional[str]) -> str:
    reason = str(raw or "").strip().lower()
    return reason if reason in COMMUNITY_REPORT_REASONS else "other"


def post_matches_search(post: Dict[str, Any], keyword: str) -> bool:
    if not keyword:
        return True
    haystack = " ".join([
        str(post.get("title") or ""),
        str(post.get("content") or ""),
        str(post.get("author") or ""),
        str(post.get("category") or ""),
    ])
    return normalize_text_search(haystack).find(keyword) >= 0


def extract_riasec_letters(raw: Optional[str]) -> List[str]:
    return [ch for ch in str(raw or "").upper() if ch in "RIASEC"]


def derive_suggestion_categories_from_riasec(raw: Optional[str]) -> List[str]:
    mapping = {
        "R": ["major", "study"],
        "I": ["study", "major"],
        "A": ["study", "mindset"],
        "S": ["mindset", "general"],
        "E": ["skills", "admissions"],
        "C": ["admissions", "study"],
    }
    categories: List[str] = []
    for letter in extract_riasec_letters(raw):
        for cat in mapping.get(letter, []):
            if cat not in categories:
                categories.append(cat)
    if not categories:
        categories = ["general", "study", "major"]
    return categories


def raise_for_db_write_result(result: Optional[Dict[str, Any]], action: str = "database_write"):
    if not isinstance(result, dict):
        raise HTTPException(status_code=500, detail=f"{action} failed: invalid write result")
    if result.get("ok", False):
        return

    reason = str(result.get("reason") or "unknown_error")
    detail = f"{action} failed: {reason}"
    if reason == "username_exists":
        raise HTTPException(status_code=400, detail="Username already registered")
    if reason == "post_not_found":
        raise HTTPException(status_code=404, detail=detail)
    if reason == "vercel_local_write_disabled":
        raise HTTPException(status_code=503, detail="Persistence is unavailable in current deployment mode")
    raise HTTPException(status_code=500, detail=detail)


def _post_exists(post_id: str) -> bool:
    return any(str(p.get("id") or "") == str(post_id) for p in db.get_posts())


def _comment_exists(post_id: str, comment_id: str) -> bool:
    for post in db.get_posts():
        if str(post.get("id") or "") != str(post_id):
            continue
        comments = post.get("comments") or []
        return any(str(c.get("id") or "") == str(comment_id) for c in comments)
    return False


STOPWORDS_VI = {
    "va", "la", "cua", "cho", "voi", "nhung", "mot", "nhieu", "nay", "kia",
    "toi", "ban", "minh", "em", "anh", "chi", "neu", "thi", "ma", "do", "duoc",
    "khong", "co", "cac", "trong", "tren", "duoi", "ve", "tai", "tu", "den",
}


def extract_semantic_tokens(text: Optional[str]) -> List[str]:
    normalized = normalize_text_search(text)
    tokens = re.findall(r"[a-z0-9]{2,}", normalized)
    return [tok for tok in tokens if tok not in STOPWORDS_VI]


def semantic_overlap_score(a_tokens: List[str], b_tokens: List[str]) -> float:
    if not a_tokens or not b_tokens:
        return 0.0
    a_set = set(a_tokens)
    b_set = set(b_tokens)
    inter = len(a_set.intersection(b_set))
    union = len(a_set.union(b_set))
    if union == 0:
        return 0.0
    return inter / union


def best_snippet_for_query(content: str, query_tokens: List[str]) -> str:
    text = str(content or "").strip()
    if not text:
        return ""
    # Split by sentence-like delimiters and pick the segment with highest token overlap.
    segments = [seg.strip() for seg in re.split(r"[.!?\n]+", text) if seg.strip()]
    if not segments:
        return text[:160]
    best = segments[0]
    best_score = -1.0
    for seg in segments:
        seg_tokens = extract_semantic_tokens(seg)
        score = semantic_overlap_score(query_tokens, seg_tokens)
        if score > best_score:
            best_score = score
            best = seg
    return best[:200]



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
DEFAULT_VIDEO_ID = "M2K7_Gfq8sA"
IMPORT_RUNTIME_VERSION = "vr-import-2026-02-19-r2"


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

    video_id = extract_youtube_video_id(job.get("videoId") or job.get("Video URL") or "")
    if not video_id:
        video_id = DEFAULT_VIDEO_ID

    return {
        "id": str(job.get("id") or f"job_{uuid.uuid4().hex[:8]}"),
        "title": title or "Untitled Job",
        "videoId": video_id,
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
    create_result = db.create_user(user_data)
    raise_for_db_write_result(create_result, action="register_user")
    # Read-after-write check to prevent false-success token issuance.
    verify_user = db.get_user(user.username)
    if not verify_user:
        raise HTTPException(status_code=503, detail="Persistence check failed after registration")
    
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
    write_result = db.update_vr_jobs(normalized_jobs)
    raise_for_db_write_result(write_result, action="update_vr_jobs")
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

    required_columns = ["Job Title", "Description", "RIASEC_Code", "Icon_URL"]
    missing_columns = [column for column in required_columns if column not in df.columns]
    if missing_columns:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing_columns)}")

    jobs = get_normalized_vr_jobs()
    jobs_by_title = {job["title"].strip().lower(): job for job in jobs}
    # DB payload requires non-empty videoId; use a safe placeholder when Excel URL is missing.
    fallback_video_id = DEFAULT_VIDEO_ID
    fallback_video_url = f"https://www.youtube.com/watch?v={fallback_video_id}"
    result = {"created": 0, "updated": 0, "skipped": 0, "errors": [], "warnings": []}
    has_video_url_column = "Video URL" in df.columns
    if not has_video_url_column:
        result["warnings"].append("Input file has no 'Video URL' column. Placeholder video will be used.")

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

        raw_video_url = row.get("Video URL", "") if has_video_url_column else ""
        video_url = "" if pd.isna(raw_video_url) else str(raw_video_url).strip()
        if not video_url:
            video_url = fallback_video_url
            result["warnings"].append(
                f"Row {index + 2}: Missing Video URL, replaced with placeholder video."
            )

        row_job = normalize_vr_job_record({
            "title": title,
            "Video URL": video_url,
            "Description": "" if pd.isna(row.get("Description", "")) else row.get("Description", ""),
            "RIASEC_Code": riasec_code,
            "Icon_URL": "" if pd.isna(row.get("Icon_URL", "")) else row.get("Icon_URL", "🎬"),
        })
        if not row_job["videoId"]:
            row_job["videoId"] = fallback_video_id
            result["warnings"].append(
                f"Row {index + 2}: Invalid Video URL, replaced with placeholder video."
            )

        existing = jobs_by_title.get(title.lower())
        if existing:
            row_job["id"] = existing["id"]
            jobs_by_title[title.lower()] = row_job
            result["updated"] += 1
        else:
            jobs_by_title[title.lower()] = row_job
            result["created"] += 1

    write_result = db.update_vr_jobs(list(jobs_by_title.values()))
    raise_for_db_write_result(write_result, action="import_vr_jobs")
    return {
        "status": "success",
        **result,
        "warnings_count": len(result["warnings"]),
        "errors_count": len(result["errors"]),
        "import_runtime_version": IMPORT_RUNTIME_VERSION,
    }

@app.get("/api/submissions", response_model=List[Submission])
async def get_submissions(current_user: dict = Depends(get_admin_user)):
    return db.get_submissions()


@app.post("/api/submissions")
async def add_submission(sub: Submission):
    write_result = db.add_submission(sub.model_dump(by_alias=True))
    raise_for_db_write_result(write_result, action="add_submission")
    return {"status": "success"}

@app.get("/api/health")
async def api_health_check():
    write_mode = "mongo" if db.is_mongo else ("local" if not os.getenv("VERCEL") else "disabled")
    return {
        "status": "ok",
        "db_type": "MongoDB Atlas" if db.is_mongo else "Local File",
        "db_connected": db.is_mongo,
        "database_name": getattr(db, "db_name", "N/A"),
        "write_mode": write_mode,
        "write_enabled": write_mode != "disabled",
        "degraded": write_mode == "disabled",
        "app_runtime_version": APP_RUNTIME_VERSION,
        "import_runtime_version": IMPORT_RUNTIME_VERSION,
    }

# ================== COMMUNITY API ==================
@app.get("/api/community/posts", response_model=List[Post])
async def get_posts(
    search: Optional[str] = None,
    category: str = "all",
    sort: str = "newest",
    limit: int = 100,
    offset: int = 0,
    actor_id: Optional[str] = None,
):
    posts = db.get_posts()
    actor = normalize_actor_id(actor_id)

    for post in posts:
        if not post.get("title"):
            content = str(post.get("content") or "").strip()
            post["title"] = (content[:80] + "...") if len(content) > 80 else (content or "Bài viết cộng đồng")
        post["category"] = normalize_community_category(post.get("category"))
        post["author_role"] = "user"
        derived_post_role = resolve_user_role(post.get("author_username"))
        if derived_post_role in {"admin", "mentor"}:
            post["author_role"] = derived_post_role
        if "comments" not in post or not isinstance(post.get("comments"), list):
            post["comments"] = []
        if "liked_by" not in post or not isinstance(post.get("liked_by"), list):
            post["liked_by"] = []
        if "likes_count" not in post or not isinstance(post.get("likes_count"), int):
            post["likes_count"] = len(post.get("liked_by") or [])
        post_reports = post.get("reports") or []
        if not isinstance(post_reports, list):
            post_reports = []
        post["reports_count"] = len(post_reports)
        post["is_pinned"] = bool(post.get("is_pinned", False))
        post["pinned_at"] = post.get("pinned_at")
        helpful_comment_id = str(post.get("helpful_comment_id") or "").strip() or None
        post["helpful_comment_id"] = helpful_comment_id
        for comment in post["comments"]:
            comment_id = str(comment.get("id") or "").strip()
            if not comment_id:
                comment_id = str(uuid.uuid4())
                comment["id"] = comment_id
            comment["helpful"] = bool(helpful_comment_id and comment_id == helpful_comment_id)
            comment["author_role"] = "user"
            derived_comment_role = resolve_user_role(comment.get("author_username"))
            if derived_comment_role in {"admin", "mentor"}:
                comment["author_role"] = derived_comment_role
            comment_reports = comment.get("reports") or []
            if not isinstance(comment_reports, list):
                comment_reports = []
            comment["reports_count"] = len(comment_reports)
        delete_eval = evaluate_post_delete_permission(post, actor, current_user=None)
        post["owner_actor"] = delete_eval["owner_actor"]
        post["can_mark_helpful"] = bool(actor and actor == str(post.get("owner_actor") or ""))
        post["liked_by_me"] = bool(actor and actor in (post.get("liked_by") or []))
        post["can_delete"] = bool(delete_eval["allowed"])
        post["can_delete_reason"] = str(delete_eval["reason"])

    category_filter = str(category or "all").strip().lower()
    if category_filter != "all":
        posts = [p for p in posts if p.get("category") == category_filter]

    keyword = normalize_text_search(search)
    if keyword:
        posts = [p for p in posts if post_matches_search(p, keyword)]

    sort_mode = str(sort or "newest").strip().lower()
    if sort_mode == "oldest":
        posts.sort(key=lambda p: p.get("timestamp", ""))
    elif sort_mode == "most_commented":
        posts.sort(
            key=lambda p: (
                -len(p.get("comments") or []),
                p.get("timestamp", "")
            )
        )
    else:
        posts.sort(key=lambda p: p.get("timestamp", ""), reverse=True)
    posts.sort(key=lambda p: 0 if bool(p.get("is_pinned")) else 1)

    safe_limit = max(1, min(int(limit), 200))
    safe_offset = max(0, int(offset))
    return posts[safe_offset:safe_offset + safe_limit]

@app.post("/api/community/posts")
async def create_post(req: CreatePostRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    title = (req.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Post title is required")
    if len(title) > 100:
        raise HTTPException(status_code=400, detail="Post title must be <= 100 characters")

    content = (req.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Post content is required")

    owner_actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=True)
    author = req.author.strip() or "Ẩn danh"
    if not owner_actor:
        owner_actor = fallback_owner_actor_from_author(author)
    author_username = str((current_user or {}).get("username") or "").strip() or None
    author_role = resolve_user_role(author_username)

    new_post = {
        "id": str(uuid.uuid4()),
        "title": title,
        "category": normalize_community_category(req.category),
        "author": author,
        "author_role": author_role,
        "author_username": author_username,
        "owner_actor": owner_actor,
        "content": content,
        "timestamp": datetime.now().isoformat(),
        "comments": [],
        "likes_count": 0,
        "liked_by": [],
        "helpful_comment_id": None,
        "is_pinned": False,
        "pinned_at": None
    }
    write_result = db.add_post(new_post)
    raise_for_db_write_result(write_result, action="create_post")
    return new_post

@app.post("/api/community/posts/{post_id}/comments")
async def add_comment(post_id: str, req: CreateCommentRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    content = (req.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content is required")
    actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=True)
    author_username = str((current_user or {}).get("username") or "").strip() or None
    new_comment = {
        "id": str(uuid.uuid4()),
        "author": req.author.strip() or "Ẩn danh",
        "author_role": resolve_user_role(author_username),
        "author_username": author_username,
        "content": content,
        "timestamp": datetime.now().isoformat(),
        "helpful": False,
        "author_actor": actor
    }
    write_result = db.add_comment(post_id, new_comment)
    raise_for_db_write_result(write_result, action="add_comment")
    return new_comment


@app.post("/api/community/posts/{post_id}/like")
async def toggle_post_like(post_id: str, req: ToggleLikeRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=True)
    result = db.toggle_post_like(post_id=post_id, actor_id=actor, liked=req.liked)
    if result is None:
        if _post_exists(post_id):
            raise HTTPException(status_code=500, detail="toggle_like failed due to persistence error")
        raise HTTPException(status_code=404, detail="Post not found")
    return {"status": "success", **result}


@app.post("/api/community/posts/{post_id}/comments/{comment_id}/helpful")
async def mark_helpful_comment(post_id: str, comment_id: str, req: MarkHelpfulCommentRequest, current_user: dict = Depends(get_current_active_user)):
    actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=False)
    result = db.set_helpful_comment(
        post_id=post_id,
        comment_id=comment_id,
        actor_id=actor,
        helpful=req.helpful
    )
    if result is None:
        if _comment_exists(post_id, comment_id):
            raise HTTPException(status_code=500, detail="mark_helpful failed due to persistence error")
        raise HTTPException(status_code=404, detail="Post or comment not found")
    if result.get("error") == "forbidden":
        raise HTTPException(status_code=403, detail="Only post owner can mark helpful comment")
    return {"status": "success", **result}


@app.post("/api/community/posts/{post_id}/report")
async def report_post(post_id: str, req: ReportContentRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=True)
    result = db.report_post(
        post_id=post_id,
        actor_id=actor,
        reason=normalize_report_reason(req.reason),
        detail=(req.detail or "").strip()
    )
    if result is None:
        if _post_exists(post_id):
            raise HTTPException(status_code=500, detail="report_post failed due to persistence error")
        raise HTTPException(status_code=404, detail="Post not found")
    return {"status": "success", **result}


@app.post("/api/community/posts/{post_id}/comments/{comment_id}/report")
async def report_comment(post_id: str, comment_id: str, req: ReportContentRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=True)
    result = db.report_comment(
        post_id=post_id,
        comment_id=comment_id,
        actor_id=actor,
        reason=normalize_report_reason(req.reason),
        detail=(req.detail or "").strip()
    )
    if result is None:
        if _comment_exists(post_id, comment_id):
            raise HTTPException(status_code=500, detail="report_comment failed due to persistence error")
        raise HTTPException(status_code=404, detail="Post or comment not found")
    return {"status": "success", **result}


@app.delete("/api/community/posts/{post_id}")
async def delete_post(post_id: str, req: DeletePostRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    actor = resolve_bound_actor_id(req.actor_id, current_user=current_user, allow_guest=True)
    posts = db.get_posts()
    target_post = next((p for p in posts if str(p.get("id") or "") == str(post_id)), None)
    if not target_post:
        logger.info("community_delete denied: post_not_found post_id=%s actor=%s", post_id, actor)
        raise HTTPException(status_code=404, detail="Post not found")
    delete_eval = evaluate_post_delete_permission(target_post, actor, current_user=current_user)
    if not delete_eval["allowed"]:
        logger.info(
            "community_delete denied: actor=%s role=%s owner_actor=%s post_author_username=%s post_author=%s reason=%s",
            actor,
            delete_eval.get("role") or "guest",
            delete_eval.get("owner_actor") or "",
            delete_eval.get("post_author_username") or "-",
            str(target_post.get("author") or ""),
            delete_eval.get("reason") or "owner_mismatch",
        )
        raise HTTPException(status_code=403, detail="Only owner or admin can delete this post")

    logger.info(
        "community_delete allowed: post_id=%s actor=%s role=%s owner_actor=%s reason=%s",
        post_id,
        actor,
        delete_eval.get("role") or "guest",
        delete_eval.get("owner_actor") or "",
        delete_eval.get("reason") or "owner_actor_match",
    )
    write_result = db.delete_post(post_id)
    raise_for_db_write_result(write_result, action="delete_post")
    return {"status": "success", "post_id": post_id}


@app.get("/api/community/reports")
async def get_community_reports(current_user: dict = Depends(get_admin_user)):
    return {"reports": db.get_community_reports()}

@app.post("/api/community/admin/repair-ownership")
async def repair_community_ownership(
    req: CommunityOwnershipRepairRequest,
    current_user: dict = Depends(get_admin_user),
):
    result = db.repair_post_ownership(dry_run=bool(req.dry_run), limit=int(req.limit))
    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=f"Ownership repair failed: {result.get('reason', 'unknown_error')}")
    return result


@app.get("/api/community/metrics")
async def get_community_metrics():
    return db.get_community_metrics()


@app.get("/api/community/suggestions", response_model=List[CommunitySuggestionsResponse])
async def get_community_suggestions(
    riasec: Optional[str] = None,
    limit: int = 4
):
    posts = db.get_posts()
    preferred_categories = derive_suggestion_categories_from_riasec(riasec)
    preferred_set = set(preferred_categories)

    scored = []
    for post in posts:
        category = normalize_community_category(post.get("category"))
        comments = post.get("comments") or []
        comments_count = len(comments) if isinstance(comments, list) else 0
        likes_count = int(post.get("likes_count") or 0)
        is_pinned = bool(post.get("is_pinned"))
        derived_role = resolve_user_role(post.get("author_username"))
        author_role = derived_role if derived_role in {"admin", "mentor"} else "user"
        score = 0.0
        if category in preferred_set:
            score += 8.0
        score += min(4.0, comments_count * 0.5)
        score += min(4.0, likes_count * 0.25)
        if is_pinned:
            score += 2.5

        scored.append({
            "id": str(post.get("id") or ""),
            "title": str(post.get("title") or "Bài viết cộng đồng"),
            "author": str(post.get("author") or "Ẩn danh"),
            "author_role": author_role,
            "category": category,
            "timestamp": str(post.get("timestamp") or ""),
            "comments_count": comments_count,
            "likes_count": likes_count,
            "is_pinned": is_pinned,
            "_score": score,
        })

    scored.sort(key=lambda p: (p["_score"], p["timestamp"]), reverse=True)
    safe_limit = max(1, min(int(limit), 8))
    return [{k: v for k, v in item.items() if k != "_score"} for item in scored[:safe_limit]]


@app.get("/api/community/related", response_model=List[RelatedPostResponse])
async def get_related_posts(
    post_id: Optional[str] = None,
    text: Optional[str] = None,
    category: Optional[str] = None,
    riasec: Optional[str] = None,
    limit: int = 5,
):
    posts = db.get_posts()
    base_post = None
    if post_id:
        for post in posts:
            if str(post.get("id") or "") == post_id:
                base_post = post
                break

    base_title = str((base_post or {}).get("title") or "")
    base_content = str((base_post or {}).get("content") or "")
    base_category = normalize_community_category((base_post or {}).get("category") or category)
    query_text = " ".join([base_title, base_content, str(text or "")]).strip()
    query_tokens = extract_semantic_tokens(query_text)
    preferred_categories = set(derive_suggestion_categories_from_riasec(riasec))

    scored = []
    for post in posts:
        pid = str(post.get("id") or "")
        if base_post and pid == str(base_post.get("id") or ""):
            continue
        p_title = str(post.get("title") or "")
        p_content = str(post.get("content") or "")
        p_category = normalize_community_category(post.get("category"))
        p_tokens = extract_semantic_tokens(f"{p_title} {p_content}")
        semantic = semantic_overlap_score(query_tokens, p_tokens)
        comments = post.get("comments") or []
        comments_count = len(comments) if isinstance(comments, list) else 0
        likes_count = int(post.get("likes_count") or 0)

        score = semantic * 10.0
        if base_category and p_category == base_category:
            score += 2.0
        if p_category in preferred_categories:
            score += 1.5
        score += min(2.0, comments_count * 0.2)
        score += min(1.5, likes_count * 0.1)
        if bool(post.get("is_pinned")):
            score += 1.0

        if query_tokens and semantic <= 0:
            continue
        scored.append({
            "id": pid,
            "title": p_title or "Bài viết cộng đồng",
            "author": str(post.get("author") or "Ẩn danh"),
            "category": p_category,
            "timestamp": str(post.get("timestamp") or ""),
            "likes_count": likes_count,
            "comments_count": comments_count,
            "similarity_score": round(score, 4),
        })

    scored.sort(key=lambda x: (x["similarity_score"], x["timestamp"]), reverse=True)
    safe_limit = max(1, min(int(limit), 8))
    return scored[:safe_limit]


@app.post("/api/community/rag/ask", response_model=CommunityRagAskResponse)
async def ask_community_rag(req: CommunityRagAskRequest):
    question = (req.question or "").strip()
    if len(question) < 4:
        raise HTTPException(status_code=400, detail="Question is too short")

    posts = db.get_posts()
    q_tokens = extract_semantic_tokens(question)
    preferred_categories = set(derive_suggestion_categories_from_riasec(req.riasec))
    scored = []
    for post in posts:
        title = str(post.get("title") or "")
        content = str(post.get("content") or "")
        category = normalize_community_category(post.get("category"))
        base_tokens = extract_semantic_tokens(f"{title} {content}")
        semantic = semantic_overlap_score(q_tokens, base_tokens)
        if q_tokens and semantic <= 0:
            continue
        comments = post.get("comments") or []
        comments_count = len(comments) if isinstance(comments, list) else 0
        likes_count = int(post.get("likes_count") or 0)
        score = semantic * 12.0
        if category in preferred_categories:
            score += 1.5
        score += min(2.0, comments_count * 0.2)
        score += min(1.5, likes_count * 0.1)
        if bool(post.get("is_pinned")):
            score += 1.0
        scored.append({
            "post_id": str(post.get("id") or ""),
            "title": title or "Bài viết cộng đồng",
            "category": category,
            "content": content,
            "score": round(score, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top_k = max(1, min(int(req.top_k or 3), 5))
    top = scored[:top_k]

    citations: List[CommunityRagCitation] = []
    for item in top:
        snippet = best_snippet_for_query(item["content"], q_tokens)
        citations.append(CommunityRagCitation(
            post_id=item["post_id"],
            title=item["title"],
            snippet=snippet or item["content"][:200],
            category=item["category"],
            score=float(item["score"]),
            url=f"/community#post-{item['post_id']}",
        ))

    if not citations:
        return CommunityRagAskResponse(
            answer="Hiện chưa tìm thấy thảo luận phù hợp trong cộng đồng cho câu hỏi này. Hãy thử diễn đạt cụ thể hơn.",
            citations=[],
        )

    top_titles = ", ".join(c.title for c in citations[:2])
    answer = (
        f"Dựa trên thảo luận cộng đồng, các bài viết liên quan nhất là: {top_titles}. "
        f"Bạn nên mở các nguồn trích dẫn bên dưới để xem ngữ cảnh đầy đủ trước khi quyết định."
    )
    return CommunityRagAskResponse(answer=answer, citations=citations)


@app.post("/api/community/posts/{post_id}/pin")
async def toggle_post_pin(post_id: str, req: TogglePinRequest, current_user: dict = Depends(get_admin_user)):
    result = db.set_post_pin(post_id=post_id, pinned=req.pinned)
    if result is None:
        if _post_exists(post_id):
            raise HTTPException(status_code=500, detail="set_post_pin failed due to persistence error")
        raise HTTPException(status_code=404, detail="Post not found")
    return {"status": "success", **result}

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
