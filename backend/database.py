import os
import json
import logging
from typing import Any, List, Dict
from pathlib import Path
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_mongo = False
        
        # Local file paths (Fallback / Dev without Mongo)
        self.data_dir = Path(__file__).parent / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.vr_jobs_file = self.data_dir / "vr_jobs.json"
        self.submissions_file = self.data_dir / "submissions.json"

        # Try connecting to MongoDB
        mongo_uri = os.getenv("MONGODB_URI")
        if mongo_uri:
            try:
                self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
                # Trigger a connection check
                self.client.admin.command('ping')
                self.db_name = os.getenv("MONGODB_DB_NAME", "careervr")
                self.db = self.client[self.db_name]
                self.is_mongo = True
                logger.info(f"✅ Connected to MongoDB Atlas: {self.db_name}")
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(f"⚠️ Could not connect to MongoDB: {e}. Falling back to local files.")
        else:
            logger.info("ℹ️ No MONGODB_URI found. Using local JSON files.")

    # ===== VR JOBS =====
    def get_vr_jobs(self, default_jobs: List[Dict]) -> List[Dict]:
        if self.is_mongo:
            try:
                jobs = list(self.db.vr_jobs.find({}, {"_id": 0}))
                if not jobs and default_jobs:
                    # Initialize if empty
                    self.update_vr_jobs(default_jobs)
                    return default_jobs
                return jobs
            except Exception as e:
                logger.error(f"Error reading VR jobs from Mongo: {e}")
                return default_jobs
        else:
            # Local File
            if not self.vr_jobs_file.exists():
                return default_jobs
            try:
                with open(self.vr_jobs_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return default_jobs

    def update_vr_jobs(self, jobs: List[Dict]):
        if self.is_mongo:
            try:
                # Replace all jobs (Simple implementation)
                self.db.vr_jobs.delete_many({})
                if jobs:
                    self.db.vr_jobs.insert_many(jobs)
            except Exception as e:
                logger.error(f"Error updating VR jobs in Mongo: {e}")
        else:
            # Local File
            self._save_json(self.vr_jobs_file, jobs)

    # ===== SUBMISSIONS =====
    def get_submissions(self) -> List[Dict]:
        if self.is_mongo:
            try:
                # Exclude internal Mongo ID
                return list(self.db.submissions.find({}, {"_id": 0}))
            except Exception as e:
                logger.error(f"Error reading submissions from Mongo: {e}")
                return []
        else:
            # Local File
            if not self.submissions_file.exists():
                return []
            try:
                with open(self.submissions_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []

    def add_submission(self, submission: Dict):
        if self.is_mongo:
            try:
                self.db.submissions.insert_one(submission)
            except Exception as e:
                logger.error(f"Error adding submission to Mongo: {e}")
        else:
            # Local File
            current = self.get_submissions()
            current.append(submission)
            self._save_json(self.submissions_file, current)

    # ===== HELPER =====
    def _save_json(self, file_path: Path, data: Any):
        # Prevent writes if on Vercel but Mongo failed (Read-only FS protection)
        if os.getenv("VERCEL") == "1":
            logger.warning(f"Attempted to write to {file_path} on Vercel without MongoDB. Skipping.")
            return
            
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error writing local file {file_path}: {e}")

# Global instance
db = Database()
