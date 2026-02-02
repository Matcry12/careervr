import os
import json
import logging
from typing import Any, List, Dict
from pathlib import Path
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.db = None
        self.is_mongo = False
        
        # 1. Try MongoDB Connection
        mongo_uri = os.getenv("MONGODB_URI")
        if mongo_uri:
            try:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000) # Short timeout
                client.admin.command('ping')
                self.db = client[os.getenv("MONGODB_DB_NAME", "careervr")]
                self.is_mongo = True
                logger.info("✅ Connected to MongoDB Atlas")
            except Exception as e:
                logger.error(f"❌ MongoDB Connection Failed: {e}")
                # Do NOT fallback to local files on Vercel if Mongo was intended but failed.
                # Just stay in 'not mongo' state which will return empty lists/defaults.

        # 2. Local Files Setup (Only relevant if NOT Mongo)
        # We define paths but DO NOT create directories automatically to avoid Read-Only errors on Vercel
        self.data_dir = Path(__file__).parent / "data"
        self.vr_jobs_file = self.data_dir / "vr_jobs.json"
        self.submissions_file = self.data_dir / "submissions.json"

    def get_vr_jobs(self, default_jobs: List[Dict]) -> List[Dict]:
        if self.is_mongo:
            try:
                jobs = list(self.db.vr_jobs.find({}, {"_id": 0}))
                if not jobs and default_jobs:
                    # Seed DB with defaults if empty
                    self.update_vr_jobs(default_jobs)
                    return default_jobs
                return jobs or default_jobs
            except Exception:
                return default_jobs
        
        # Local Fallback
        if self.vr_jobs_file.exists():
            try:
                with open(self.vr_jobs_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return default_jobs

    def update_vr_jobs(self, jobs: List[Dict]):
        if self.is_mongo:
            try:
                self.db.vr_jobs.delete_many({})
                if jobs:
                    self.db.vr_jobs.insert_many(jobs)
            except Exception as e:
                logger.error(f"Mongo Write Error: {e}")
        else:
            # Only write locally if we can (avoids Vercel crashes)
            self._save_local(self.vr_jobs_file, jobs)

    def get_submissions(self) -> List[Dict]:
        if self.is_mongo:
            try:
                return list(self.db.submissions.find({}, {"_id": 0}))
            except Exception:
                return []
        
        # Local Fallback
        if self.submissions_file.exists():
            try:
                with open(self.submissions_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def add_submission(self, submission: Dict):
        if self.is_mongo:
            try:
                self.db.submissions.insert_one(submission)
            except Exception as e:
                logger.error(f"Mongo Insert Error: {e}")
        else:
            current = self.get_submissions()
            current.append(submission)
            self._save_local(self.submissions_file, current)

    def _save_local(self, path: Path, data: Any):
        # STRICT PROTECTION: Never write on Vercel if not Mongo
        if os.getenv("VERCEL"):
            return 
            
        try:
            # Ensure dir exists only when we actually try to write
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Local Write Error: {e}")

# Global instance
db = Database()
