import os
import json
import logging
from typing import Any, List, Dict, Optional
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
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000, tlsAllowInvalidCertificates=True) # Short timeout
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
        self.posts_file = self.data_dir / "posts.json"
        self.users_file = self.data_dir / "users.json"

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

    # ===== AUTH / USERS =====
    def get_user(self, username: str) -> Optional[Dict]:
        if self.is_mongo:
            return self.db.users.find_one({"username": username}, {"_id": 0})
        
        # Local Fallback
        if self.users_file.exists():
            try:
                with open(self.users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
                    for u in users:
                        if u.get("username") == username:
                            return u
            except Exception:
                pass
        return None

    def create_user(self, user_data: Dict):
        if self.is_mongo:
            self.db.users.insert_one(user_data)
        else:
            current = []
            if self.users_file.exists():
                try:
                    with open(self.users_file, "r", encoding="utf-8") as f:
                        current = json.load(f)
                except: pass
            current.append(user_data)
            self._save_local(self.users_file, current)

    def update_user_history(self, username: str, key: str, value: Any):
        """Update user persistent data (e.g., last_riasec_result, chat_history)"""
        if self.is_mongo:
            self.db.users.update_one(
                {"username": username},
                {"$set": {key: value}}
            )
        else:
            users = []
            if self.users_file.exists():
                try:
                    with open(self.users_file, "r", encoding="utf-8") as f:
                        users = json.load(f)
                except: pass
            
            for u in users:
                if u.get("username") == username:
                    u[key] = value
                    break
            self._save_local(self.users_file, users)

    # ===== COMMUNITY POSTS =====
    def get_posts(self) -> List[Dict]:
        if self.is_mongo:
            try:
                # return newest first
                return list(self.db.posts.find({}, {"_id": 0}).sort("timestamp", -1))
            except Exception:
                return []
        
        # Local Fallback
        if self.posts_file.exists():
            try:
                with open(self.posts_file, "r", encoding="utf-8") as f:
                    posts = json.load(f)
                    # Sort by timestamp desc locally too if possible
                    try:
                        posts.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
                    except:
                        pass
                    return posts
            except Exception:
                pass
        return []

    def add_post(self, post: Dict):
        if self.is_mongo:
            try:
                self.db.posts.insert_one(post)
            except Exception as e:
                logger.error(f"Mongo Insert Post Error: {e}")
        else:
            current = self.get_posts()
            current.append(post)
            self._save_local(self.posts_file, current)

    def add_comment(self, post_id: str, comment: Dict):
        if self.is_mongo:
            try:
                self.db.posts.update_one(
                    {"id": post_id},
                    {"$push": {"comments": comment}}
                )
            except Exception as e:
                logger.error(f"Mongo Add Comment Error: {e}")
        else:
            posts = self.get_posts()
            for p in posts:
                if p.get("id") == post_id:
                    if "comments" not in p:
                        p["comments"] = []
                    p["comments"].append(comment)
                    break
            self._save_local(self.posts_file, posts)

# Global instance
db = Database()
