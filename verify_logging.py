
import json
import os
import sys
from unittest.mock import MagicMock, patch

# Import backend modules
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))
import main
from main import start_conversation, StartConversationRequest, recommend_jobs

# Mock dependencies
main.requests = MagicMock()
main.call_dify_api = MagicMock(return_value={"answer": "AI Response", "conversation_id": "123"})

# Mock BackgroundTasks since we are calling the function directly and not via FastAPI wrapper
# In direct call, background_tasks arg is just an object with add_task method
class MockBackgroundTasks:
    def add_task(self, func, *args, **kwargs):
        print(f"✅ Background task added: {func.__name__}")
        func(*args, **kwargs) # Execute immediately for checking

def test_full_flow():
    print("Testing Start Conversation Flow...")
    
    # 1. Create Request with known answers (e.g. High R-I-C for Engineering)
    # R=3, I=4 => Engineering/Tech profiles
    answers = [
        4, 4, 4, 4, # R
        4, 4, 4, 4, # I
        2, 2, 2, 2, # A
        2, 2, 2, 2, # S
        2, 2, 2, 2, # E
        4, 4, 4, 4, # C
        # ... fill rest with 3
    ] 
    answers += [3] * (50 - len(answers))
    
    req = StartConversationRequest(
        name="Test Log User",
        school="High School Test",
        answer=answers,
        **{"class": "12A1"}
    )
    
    # 2. Run
    bg_tasks = MockBackgroundTasks()
    try:
        main.start_conversation(req, bg_tasks)
    except Exception as e:
        print(f"❌ Error: {e}")
        return

    # 3. Verify Google Sheet Request
    # Check if requests.post was called with correct URL and Payload
    args, kwargs = main.requests.post.call_args
    url = args[0]
    json_body = kwargs['json']
    
    print(f"\nURL Called: {url}")
    print("Payload sent to Sheet:")
    print(json.dumps(json_body, indent=2, ensure_ascii=False))
    
    if "script.google.com" in url:
        print("✅ URL Matches Google Script")
    else:
        print("❌ URL Mismatch")
        
    print(f"Recommended Jobs: {json_body['nganh_de_xuat']}")
    if "," in json_body["nganh_de_xuat"]:
        print("✅ Multiple jobs recommended!")
    else:
        print("❌ Only one job or none found (might be okay if filters are strict, but expected multiple for this test)")

if __name__ == "__main__":
    test_full_flow()
