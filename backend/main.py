from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from typing import List
import requests
import json
import os
from pathlib import Path
from dotenv import load_dotenv

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

# ================== DIFY CONFIG ==================
DIFY_API_KEY = os.getenv("DIFY_API_KEY")
if not DIFY_API_KEY:
    raise ValueError("❌ ERROR: DIFY_API_KEY not set. Set it in .env file or environment variables.")
DIFY_CHAT_URL = "https://api.dify.ai/v1/chat-messages"

# ================== SCHEMA ==================
class RIASECRequest(BaseModel):
    name: str
    class_: str = Field(alias="class")
    school: str
    answers_json: List[int]
    
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

# ================== MOUNT STATIC FILES (after routes) ==================
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.post("/run-riasec")
def run_riasec(data: RIASECRequest):

    # ===== VALIDATE =====
    if len(data.answers_json) != 50:
        raise HTTPException(
            status_code=400,
            detail="answers_json phải có đúng 50 phần tử"
        )
    
    # Validate answer values
    if not all(1 <= ans <= 5 for ans in data.answers_json):
        raise HTTPException(
            status_code=400,
            detail="Mỗi câu trả lời phải là số từ 1 đến 5"
        )

    # ===== PAYLOAD GỬI DIFY (CHATBOT) =====
    payload = {
        "inputs": {
            "name": data.name,
            "class": data.class_,
            "school": data.school,
            "answer": json.dumps(
                data.answers_json,
                ensure_ascii=False
            )
        },
        "query": (
            "Dựa trên thông tin học sinh và kết quả trắc nghiệm RIASEC, "
            "hãy phân tích và đưa ra bản tư vấn hướng nghiệp rõ ràng, "
            "phù hợp với học sinh THPT Việt Nam."
        ),
        "response_mode": "blocking",
        "user": data.name.strip() if data.name.strip() else "student"

    }

    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json"
    }

    # ===== GỌI DIFY CHATBOT =====
    try:
        response = requests.post(
            DIFY_CHAT_URL,
            json=payload,
            headers=headers,
            timeout=90
        )
        print(f"Dify response status: {response.status_code}")
        print(f"Dify response: {response.text}")
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

    # ===== XỬ LÝ RESPONSE (SỬA LỖI 4) =====
    dify_result = response.json()
    text_output = dify_result.get("answer", "")

    return {
        "data": {
            "outputs": {
                "text": text_output
            }
        }
    }

