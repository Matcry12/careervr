from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import requests
import json

# ================== APP ==================
app = FastAPI()

# ================== CORS ==================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== DIFY CONFIG ==================
DIFY_API_KEY = "app-5h8jYBFRY7rnaCn0TWc9Ajgu"   # 🔴 THAY BẰNG API KEY DIFY THẬT
DIFY_WORKFLOW_URL = "https://api.dify.ai/v1/workflows/run"

# ================== SCHEMA ==================
class RIASECRequest(BaseModel):
    name: str
    class_: str = Field(alias="class")   # ⚠️ alias để tránh keyword Python
    school: str
    answers_json: List[int]

# ================== API ==================
@app.post("/run-riasec")
def run_riasec(data: RIASECRequest):

    # ===== VALIDATE =====
    if len(data.answers_json) != 50:
        raise HTTPException(
            status_code=400,
            detail="answers_json phải có đúng 50 phần tử"
        )

    # ===== PAYLOAD GỬI DIFY =====
    payload = {
        "inputs": {
            "name": data.name,
            "class": data.class_,          # ⚠️ dùng class_ trong Python
            "school": data.school,
            # Dify BẮT BUỘC text-input → stringify
            "answers_json": json.dumps(data.answers_json, ensure_ascii=False)
        },
        "response_mode": "blocking",
        "user": "student"
    }

    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json"
    }

    # ===== GỌI DIFY =====
    try:
        response = requests.post(
            DIFY_WORKFLOW_URL,
            json=payload,
            headers=headers,
            timeout=90
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi kết nối Dify: {str(e)}"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    return response.json()
