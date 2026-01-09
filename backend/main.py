from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
import requests
import json
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from riasec_calculator import calculate_riasec, recommend_jobs

# Load environment variables from .env file
load_dotenv()

# ================== APP ==================
app = FastAPI(title="CareerVR", version="1.0.0")

# ================== STATIC FILES ==================
STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(exist_ok=True)

# ================== CORS ==================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== CONFIG ==================
DIFY_API_KEY = os.getenv("DIFY_API_KEY")
if not DIFY_API_KEY:
    raise ValueError("❌ ERROR: DIFY_API_KEY not set. Set it in .env file or environment variables.")

DIFY_CHAT_URL = os.getenv("DIFY_CHAT_URL", "https://api.dify.ai/v1/chat-messages")

# In-memory conversation storage (use Redis/DB in production)
conversations: Dict[str, Any] = {}

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
    return {"status": "ok", "message": "CareerVR backend is running"}

@app.get("/")
def serve_index():
    """Serve main app (index_redesigned_v2.html)"""
    index_file = STATIC_DIR / "index_redesigned_v2.html"
    if index_file.exists():
        return FileResponse(index_file, media_type="text/html")
    return {"error": "Main app not found. Place index_redesigned_v2.html in backend/static/"}

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

