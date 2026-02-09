from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional
import json
import sys

# Copy the model directly from main.py to allow standalone execution
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
    # suggestedMajors: str = "" # removed duplicate
    combinations: str = ""

def test_load():
    try:
        with open("backend/data/submissions.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        
        print(f"Loaded {len(data)} items from JSON.")
        
        for idx, item in enumerate(data):
            try:
                Submission(**item)
                print(f"✅ Item {idx} is valid.")
            except Exception as e:
                print(f"❌ Item {idx} INVALID: {e}")
                print(f"Data: {item}")
                
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    test_load()
