import os
import json
import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, List, Dict, Optional
from pathlib import Path
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, ConfigurationError

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.db = None
        self.is_mongo = False
        self.db_name = os.getenv("MONGODB_DB_NAME", "careervr")
        
        # 1. Try MongoDB Connection
        mongo_uri = os.getenv("MONGODB_URI")
        if mongo_uri:
            try:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000, tlsAllowInvalidCertificates=True) # Short timeout
                client.admin.command('ping')
                self.db = client[self.db_name]
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

    @staticmethod
    def _write_result(ok: bool, reason: str = "", **extra) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"ok": bool(ok), "reason": str(reason or "")}
        payload.update(extra)
        return payload

    def _writes_disabled(self) -> bool:
        if self.is_mongo:
            return False
        # Escape hatch for local/dev debugging when deployment-like env flags are present.
        allow_local_writes = str(os.getenv("ALLOW_LOCAL_WRITES", "")).strip().lower() in {"1", "true", "yes", "on"}
        if allow_local_writes:
            return False
        return bool(os.getenv("VERCEL"))

    def _disabled_write_result(self) -> Dict[str, Any]:
        return self._write_result(False, "vercel_local_write_disabled")

    @staticmethod
    def _validate_vr_jobs_payload(jobs: Any, allow_empty: bool = False) -> Dict[str, Any]:
        if not isinstance(jobs, list):
            return {"ok": False, "reason": "invalid_payload_type"}
        if not jobs and not allow_empty:
            return {"ok": False, "reason": "empty_payload_disallowed"}

        seen_ids = set()
        for idx, job in enumerate(jobs):
            if not isinstance(job, dict):
                return {"ok": False, "reason": f"invalid_job_record_at_{idx}"}
            job_id = str(job.get("id") or "").strip()
            title = str(job.get("title") or "").strip()
            video_id = str(job.get("videoId") or "").strip()
            riasec_code = str(job.get("riasec_code") or "").strip()
            if not job_id:
                return {"ok": False, "reason": f"missing_id_at_{idx}"}
            if not title:
                return {"ok": False, "reason": f"missing_title_at_{idx}"}
            if not video_id:
                return {"ok": False, "reason": f"missing_video_id_at_{idx}"}
            if not riasec_code:
                return {"ok": False, "reason": f"missing_riasec_code_at_{idx}"}
            if job_id in seen_ids:
                return {"ok": False, "reason": f"duplicate_id_{job_id}"}
            seen_ids.add(job_id)
        return {"ok": True, "reason": "validated"}

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

    def update_vr_jobs(self, jobs: List[Dict], allow_empty: bool = False) -> Dict[str, Any]:
        if self._writes_disabled():
            return self._disabled_write_result()
        payload_check = self._validate_vr_jobs_payload(jobs, allow_empty=allow_empty)
        if not payload_check.get("ok"):
            return self._write_result(False, payload_check.get("reason", "invalid_payload"))
        if self.is_mongo:
            try:
                new_ids = [str(job.get("id")) for job in jobs]
                for job in jobs:
                    self.db.vr_jobs.replace_one({"id": str(job.get("id"))}, job, upsert=True)
                if new_ids:
                    self.db.vr_jobs.delete_many({"id": {"$nin": new_ids}})
                elif allow_empty:
                    self.db.vr_jobs.delete_many({})
                return self._write_result(True, "mongo_write_ok", count=len(jobs), mode="replace_upsert")
            except Exception as e:
                logger.error(f"Mongo Write Error: {e}")
                return self._write_result(False, "mongo_write_error", error=str(e))
        else:
            # Only write locally if we can (avoids Vercel crashes)
            return self._save_local(self.vr_jobs_file, jobs)

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

    def add_submission(self, submission: Dict) -> Dict[str, Any]:
        if self._writes_disabled():
            return self._disabled_write_result()
        if self.is_mongo:
            try:
                self.db.submissions.insert_one(submission)
                return self._write_result(True, "mongo_insert_ok")
            except Exception as e:
                logger.error(f"Mongo Insert Error: {e}")
                return self._write_result(False, "mongo_insert_error", error=str(e))
        else:
            current = self.get_submissions()
            current.append(submission)
            return self._save_local(self.submissions_file, current)

    def _save_local(self, path: Path, data: Any) -> Dict[str, Any]:
        # STRICT PROTECTION: Never write in deployment-mode without explicit local-write override.
        if self._writes_disabled():
            return self._disabled_write_result()
            
        try:
            # Ensure dir exists only when we actually try to write
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return self._write_result(True, "local_write_ok", path=str(path))
        except Exception as e:
            logger.error(f"Local Write Error: {e}")
            return self._write_result(False, "local_write_error", error=str(e), path=str(path))

    # ===== AUTH / USERS =====
    def get_user(self, username: str) -> Optional[Dict]:
        if self.is_mongo:
            try:
                return self.db.users.find_one({"username": username}, {"_id": 0})
            except Exception as e:
                logger.error(f"Mongo Get User Error: {e}")
                # Fallback to local
        
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

    def create_user(self, user_data: Dict) -> Dict[str, Any]:
        if self._writes_disabled():
            return self._disabled_write_result()
        success = False
        if self.is_mongo:
            try:
                self.db.users.insert_one(user_data)
                success = True
            except Exception as e:
                 msg = str(e)
                 logger.error(f"Mongo Create User Error: {msg}")
                 if "E11000" in msg or "duplicate key" in msg.lower():
                     return self._write_result(False, "username_exists", error=msg)
                 return self._write_result(False, "mongo_insert_error", error=msg)

        if not success:
            current = []
            if self.users_file.exists():
                try:
                    with open(self.users_file, "r", encoding="utf-8") as f:
                        current = json.load(f)
                except: pass
            current.append(user_data)
            return self._save_local(self.users_file, current)
        return self._write_result(True, "mongo_insert_ok")

    def update_user_history(self, username: str, key: str, value: Any) -> Dict[str, Any]:
        """Update user persistent data (e.g., last_riasec_result, chat_history)"""
        if self._writes_disabled():
            return self._disabled_write_result()
        success = False
        if self.is_mongo:
            try:
                self.db.users.update_one(
                    {"username": username},
                    {"$set": {key: value}}
                )
                success = True
            except Exception as e:
                logger.error(f"Mongo Update History Error: {e}")
                return self._write_result(False, "mongo_update_error", error=str(e))

        if not success:
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
            return self._save_local(self.users_file, users)
        return self._write_result(True, "mongo_update_ok")

    def update_user_profile(self, username: str, updates: Dict) -> Dict[str, Any]:
        """Update multiple user fields (e.g. full_name, school, class)"""
        if self._writes_disabled():
            return self._disabled_write_result()
        success = False
        if self.is_mongo:
            try:
                self.db.users.update_one(
                    {"username": username},
                    {"$set": updates}
                )
                success = True
            except Exception as e:
                logger.error(f"Mongo Update Profile Error: {e}")
                return self._write_result(False, "mongo_update_error", error=str(e))

        if not success:
            users = []
            if self.users_file.exists():
                try:
                    with open(self.users_file, "r", encoding="utf-8") as f:
                        users = json.load(f)
                except: pass
            
            for u in users:
                if u.get("username") == username:
                    for k, v in updates.items():
                        u[k] = v
                    break
            return self._save_local(self.users_file, users)
        return self._write_result(True, "mongo_update_ok")

    # ===== COMMUNITY POSTS =====
    @staticmethod
    def _derive_post_title(post: Dict) -> str:
        raw_title = str(post.get("title") or "").strip()
        if raw_title:
            return raw_title[:100]
        content = str(post.get("content") or "").strip()
        if not content:
            return "Bài viết cộng đồng"
        return (content[:80] + "...") if len(content) > 80 else content

    @staticmethod
    def _derive_owner_actor(author: str) -> str:
        base = str(author or "").strip().lower()
        slug = re.sub(r"[^a-z0-9]+", "_", base).strip("_")
        if not slug:
            slug = "anonymous"
        return f"author:{slug}"

    @staticmethod
    def _normalize_username_actor(username: str) -> str:
        raw = str(username or "").strip()
        return f"user:{raw}" if raw else ""

    def _compute_post_ownership_patch(self, post: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        owner_actor = str(post.get("owner_actor") or "").strip()
        author_username = str(post.get("author_username") or "").strip()
        patch: Dict[str, Any] = {}

        if author_username and (not owner_actor or owner_actor.startswith("author:")):
            patch["owner_actor"] = self._normalize_username_actor(author_username)
        elif not owner_actor:
            patch["owner_actor"] = self._derive_owner_actor(str(post.get("author") or ""))

        if not author_username and owner_actor.startswith("user:"):
            patch["author_username"] = owner_actor.split(":", 1)[1].strip() or None

        return patch if patch else None

    def repair_post_ownership(self, dry_run: bool = True, limit: int = 5000) -> Dict[str, Any]:
        safe_limit = max(1, min(int(limit or 5000), 20000))
        summary: Dict[str, Any] = {
            "ok": True,
            "dry_run": bool(dry_run),
            "scanned": 0,
            "candidates": 0,
            "updated": 0,
            "reasons": {
                "missing_owner_actor": 0,
                "owner_actor_legacy_author": 0,
                "author_username_backfilled_from_owner_actor": 0,
            },
            "samples": [],
        }

        if self.is_mongo:
            try:
                posts = list(self.db.posts.find({}, {"_id": 0}).limit(safe_limit))
                summary["scanned"] = len(posts)
                for post in posts:
                    patch = self._compute_post_ownership_patch(post)
                    if not patch:
                        continue
                    summary["candidates"] += 1
                    owner_actor = str(post.get("owner_actor") or "").strip()
                    if not owner_actor:
                        summary["reasons"]["missing_owner_actor"] += 1
                    elif owner_actor.startswith("author:"):
                        summary["reasons"]["owner_actor_legacy_author"] += 1
                    if "author_username" in patch and patch.get("author_username"):
                        summary["reasons"]["author_username_backfilled_from_owner_actor"] += 1
                    if len(summary["samples"]) < 20:
                        summary["samples"].append({
                            "post_id": str(post.get("id") or ""),
                            "before": {
                                "owner_actor": owner_actor,
                                "author_username": post.get("author_username"),
                            },
                            "after": patch,
                        })
                    if not dry_run:
                        self.db.posts.update_one({"id": post.get("id")}, {"$set": patch})
                        summary["updated"] += 1
                return summary
            except Exception as e:
                logger.error(f"Mongo Repair Post Ownership Error: {e}")
                summary["ok"] = False
                summary["reason"] = "mongo_repair_error"
                summary["error"] = str(e)
                return summary

        if self._writes_disabled() and not dry_run:
            return {
                **summary,
                "ok": False,
                "reason": "vercel_local_write_disabled",
            }

        posts = self.get_posts()
        summary["scanned"] = min(len(posts), safe_limit)
        changed = False
        for idx, post in enumerate(posts):
            if idx >= safe_limit:
                break
            patch = self._compute_post_ownership_patch(post)
            if not patch:
                continue
            summary["candidates"] += 1
            owner_actor = str(post.get("owner_actor") or "").strip()
            if not owner_actor:
                summary["reasons"]["missing_owner_actor"] += 1
            elif owner_actor.startswith("author:"):
                summary["reasons"]["owner_actor_legacy_author"] += 1
            if "author_username" in patch and patch.get("author_username"):
                summary["reasons"]["author_username_backfilled_from_owner_actor"] += 1
            if len(summary["samples"]) < 20:
                summary["samples"].append({
                    "post_id": str(post.get("id") or ""),
                    "before": {
                        "owner_actor": owner_actor,
                        "author_username": post.get("author_username"),
                    },
                    "after": patch,
                })
            if not dry_run:
                for key, value in patch.items():
                    post[key] = value
                summary["updated"] += 1
                changed = True

        if changed and not dry_run:
            save_result = self._save_local(self.posts_file, posts)
            if not save_result.get("ok"):
                return {
                    **summary,
                    "ok": False,
                    "reason": save_result.get("reason", "local_save_error"),
                }
        return summary

    def normalize_community_posts_schema(self) -> Dict[str, int]:
        """
        Backfill legacy community post fields in storage.
        Ensures each post has: title, category, owner_actor, comments(list), likes_count,
        liked_by(list), helpful_comment_id, reports(list), and comment ids/reports.
        """
        stats = {"scanned": 0, "updated": 0}

        if self.is_mongo:
            try:
                posts = list(self.db.posts.find({}, {"_id": 0}))
                stats["scanned"] = len(posts)
                for post in posts:
                    updates = {}
                    if not str(post.get("title") or "").strip():
                        updates["title"] = self._derive_post_title(post)
                    if not str(post.get("category") or "").strip():
                        updates["category"] = "general"
                    if str(post.get("author_role") or "").strip().lower() not in {"admin", "mentor", "user"}:
                        updates["author_role"] = "user"
                    if "author_username" not in post:
                        updates["author_username"] = None
                    if not isinstance(post.get("comments"), list):
                        updates["comments"] = []
                    if not str(post.get("owner_actor") or "").strip():
                        updates["owner_actor"] = self._derive_owner_actor(str(post.get("author") or ""))
                    if "helpful_comment_id" not in post:
                        updates["helpful_comment_id"] = None
                    if not isinstance(post.get("reports"), list):
                        updates["reports"] = []
                    if "is_pinned" not in post:
                        updates["is_pinned"] = False
                    if "pinned_at" not in post:
                        updates["pinned_at"] = None
                    if not isinstance(post.get("liked_by"), list):
                        updates["liked_by"] = []
                    if not isinstance(post.get("likes_count"), int):
                        updates["likes_count"] = len(post.get("liked_by") or [])
                    comments = post.get("comments") or []
                    comments_changed = False
                    for comment in comments:
                        if not str(comment.get("id") or "").strip():
                            comment["id"] = str(uuid.uuid4())
                            comments_changed = True
                        if "helpful" not in comment:
                            comment["helpful"] = False
                            comments_changed = True
                        if str(comment.get("author_role") or "").strip().lower() not in {"admin", "mentor", "user"}:
                            comment["author_role"] = "user"
                            comments_changed = True
                        if "author_username" not in comment:
                            comment["author_username"] = None
                            comments_changed = True
                        if not isinstance(comment.get("reports"), list):
                            comment["reports"] = []
                            comments_changed = True
                    if comments_changed:
                        updates["comments"] = comments
                    if updates:
                        self.db.posts.update_one({"id": post.get("id")}, {"$set": updates})
                        stats["updated"] += 1
                return stats
            except Exception as e:
                logger.error(f"Mongo Normalize Posts Error: {e}")
                return stats

        # Local fallback
        posts = []
        if self.posts_file.exists():
            try:
                with open(self.posts_file, "r", encoding="utf-8") as f:
                    posts = json.load(f)
            except Exception:
                posts = []

        stats["scanned"] = len(posts)
        changed = False
        for post in posts:
            if not str(post.get("title") or "").strip():
                post["title"] = self._derive_post_title(post)
                changed = True
            if not str(post.get("category") or "").strip():
                post["category"] = "general"
                changed = True
            if str(post.get("author_role") or "").strip().lower() not in {"admin", "mentor", "user"}:
                post["author_role"] = "user"
                changed = True
            if "author_username" not in post:
                post["author_username"] = None
                changed = True
            if not isinstance(post.get("comments"), list):
                post["comments"] = []
                changed = True
            if not str(post.get("owner_actor") or "").strip():
                post["owner_actor"] = self._derive_owner_actor(str(post.get("author") or ""))
                changed = True
            if "helpful_comment_id" not in post:
                post["helpful_comment_id"] = None
                changed = True
            if not isinstance(post.get("reports"), list):
                post["reports"] = []
                changed = True
            if "is_pinned" not in post:
                post["is_pinned"] = False
                changed = True
            if "pinned_at" not in post:
                post["pinned_at"] = None
                changed = True
            if not isinstance(post.get("liked_by"), list):
                post["liked_by"] = []
                changed = True
            if not isinstance(post.get("likes_count"), int):
                post["likes_count"] = len(post.get("liked_by") or [])
                changed = True
            for comment in post.get("comments", []):
                if not str(comment.get("id") or "").strip():
                    comment["id"] = str(uuid.uuid4())
                    changed = True
                if "helpful" not in comment:
                    comment["helpful"] = False
                    changed = True
                if str(comment.get("author_role") or "").strip().lower() not in {"admin", "mentor", "user"}:
                    comment["author_role"] = "user"
                    changed = True
                if "author_username" not in comment:
                    comment["author_username"] = None
                    changed = True
                if not isinstance(comment.get("reports"), list):
                    comment["reports"] = []
                    changed = True
            if changed:
                stats["updated"] += 1
                changed = False

        if stats["updated"] > 0:
            self._save_local(self.posts_file, posts)
        return stats

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

    def add_post(self, post: Dict) -> Dict[str, Any]:
        if self._writes_disabled():
            return self._disabled_write_result()
        if self.is_mongo:
            try:
                self.db.posts.insert_one(post)
                return self._write_result(True, "mongo_insert_ok")
            except Exception as e:
                logger.error(f"Mongo Insert Post Error: {e}")
                return self._write_result(False, "mongo_insert_error", error=str(e))
        else:
            current = self.get_posts()
            current.append(post)
            return self._save_local(self.posts_file, current)

    def add_comment(self, post_id: str, comment: Dict) -> Dict[str, Any]:
        if self._writes_disabled():
            return self._disabled_write_result()
        if self.is_mongo:
            try:
                result = self.db.posts.update_one(
                    {"id": post_id},
                    {"$push": {"comments": comment}}
                )
                if result.matched_count == 0:
                    return self._write_result(False, "post_not_found")
                return self._write_result(True, "mongo_update_ok", matched=result.matched_count, modified=result.modified_count)
            except Exception as e:
                logger.error(f"Mongo Add Comment Error: {e}")
                return self._write_result(False, "mongo_update_error", error=str(e))
        else:
            posts = self.get_posts()
            found = False
            for p in posts:
                if p.get("id") == post_id:
                    if "comments" not in p:
                        p["comments"] = []
                    p["comments"].append(comment)
                    found = True
                    break
            if not found:
                return self._write_result(False, "post_not_found")
            return self._save_local(self.posts_file, posts)

    def delete_post(self, post_id: str) -> Dict[str, Any]:
        if self._writes_disabled():
            return self._disabled_write_result()
        if self.is_mongo:
            try:
                result = self.db.posts.delete_one({"id": post_id})
                if result.deleted_count == 0:
                    return self._write_result(False, "post_not_found")
                return self._write_result(True, "mongo_delete_ok", deleted=result.deleted_count)
            except Exception as e:
                logger.error(f"Mongo Delete Post Error: {e}")
                return self._write_result(False, "mongo_delete_error", error=str(e))

        posts = self.get_posts()
        next_posts = [p for p in posts if str(p.get("id") or "") != str(post_id)]
        if len(next_posts) == len(posts):
            return self._write_result(False, "post_not_found")
        return self._save_local(self.posts_file, next_posts)

    @staticmethod
    def _upsert_report(reports: List[Dict], actor_id: str, reason: str, detail: str) -> List[Dict]:
        now = datetime.now().isoformat()
        clean_detail = (detail or "")[:300]
        for entry in reports:
            if str(entry.get("actor_id") or "").strip() == actor_id:
                entry["reason"] = reason
                entry["detail"] = clean_detail
                entry["timestamp"] = now
                entry["status"] = "open"
                return reports
        reports.append({
            "actor_id": actor_id,
            "reason": reason,
            "detail": clean_detail,
            "timestamp": now,
            "status": "open",
        })
        return reports

    def report_post(self, post_id: str, actor_id: str, reason: str, detail: str = "") -> Optional[Dict]:
        if self._writes_disabled():
            return None
        if self.is_mongo:
            try:
                post = self.db.posts.find_one({"id": post_id}, {"_id": 0})
                if not post:
                    return None
                reports = post.get("reports") or []
                if not isinstance(reports, list):
                    reports = []
                reports = self._upsert_report(reports, actor_id, reason, detail)
                self.db.posts.update_one({"id": post_id}, {"$set": {"reports": reports}})
                return {"reports_count": len(reports)}
            except Exception as e:
                logger.error(f"Mongo Report Post Error: {e}")
                return None

        posts = self.get_posts()
        result = None
        for post in posts:
            if post.get("id") != post_id:
                continue
            reports = post.get("reports") or []
            if not isinstance(reports, list):
                reports = []
            reports = self._upsert_report(reports, actor_id, reason, detail)
            post["reports"] = reports
            result = {"reports_count": len(reports)}
            break
        if result is not None:
            self._save_local(self.posts_file, posts)
        return result

    def report_comment(self, post_id: str, comment_id: str, actor_id: str, reason: str, detail: str = "") -> Optional[Dict]:
        if self._writes_disabled():
            return None
        if self.is_mongo:
            try:
                post = self.db.posts.find_one({"id": post_id}, {"_id": 0})
                if not post:
                    return None
                comments = post.get("comments") or []
                found = False
                count = 0
                for comment in comments:
                    if str(comment.get("id") or "").strip() != comment_id:
                        continue
                    reports = comment.get("reports") or []
                    if not isinstance(reports, list):
                        reports = []
                    reports = self._upsert_report(reports, actor_id, reason, detail)
                    comment["reports"] = reports
                    count = len(reports)
                    found = True
                    break
                if not found:
                    return None
                self.db.posts.update_one({"id": post_id}, {"$set": {"comments": comments}})
                return {"reports_count": count}
            except Exception as e:
                logger.error(f"Mongo Report Comment Error: {e}")
                return None

        posts = self.get_posts()
        result = None
        for post in posts:
            if post.get("id") != post_id:
                continue
            comments = post.get("comments") or []
            for comment in comments:
                if str(comment.get("id") or "").strip() != comment_id:
                    continue
                reports = comment.get("reports") or []
                if not isinstance(reports, list):
                    reports = []
                reports = self._upsert_report(reports, actor_id, reason, detail)
                comment["reports"] = reports
                result = {"reports_count": len(reports)}
                break
            break
        if result is not None:
            self._save_local(self.posts_file, posts)
        return result

    def get_community_reports(self) -> List[Dict]:
        posts = self.get_posts()
        report_items = []
        for post in posts:
            post_id = str(post.get("id") or "")
            post_title = str(post.get("title") or "")
            post_author = str(post.get("author") or "")
            for entry in (post.get("reports") or []):
                report_items.append({
                    "type": "post",
                    "post_id": post_id,
                    "comment_id": None,
                    "post_title": post_title,
                    "target_author": post_author,
                    "reason": entry.get("reason"),
                    "detail": entry.get("detail"),
                    "timestamp": entry.get("timestamp"),
                    "status": entry.get("status", "open"),
                })
            for comment in (post.get("comments") or []):
                comment_id = str(comment.get("id") or "")
                comment_author = str(comment.get("author") or "")
                for entry in (comment.get("reports") or []):
                    report_items.append({
                        "type": "comment",
                        "post_id": post_id,
                        "comment_id": comment_id,
                        "post_title": post_title,
                        "target_author": comment_author,
                        "reason": entry.get("reason"),
                        "detail": entry.get("detail"),
                        "timestamp": entry.get("timestamp"),
                        "status": entry.get("status", "open"),
                    })
        report_items.sort(key=lambda x: str(x.get("timestamp") or ""), reverse=True)
        return report_items

    def get_community_metrics(self) -> Dict[str, Any]:
        posts = self.get_posts()
        now = datetime.now()
        window_7d = now - timedelta(days=7)
        window_30d = now - timedelta(days=30)

        total_posts = len(posts)
        total_comments = 0
        total_likes = 0
        total_reports = 0
        pinned_posts = 0
        helpful_marked = 0
        posts_7d = 0
        comments_7d = 0
        active_authors_30d = set()

        def parse_dt(raw: Any) -> Optional[datetime]:
            try:
                return datetime.fromisoformat(str(raw))
            except Exception:
                return None

        for post in posts:
            post_dt = parse_dt(post.get("timestamp"))
            if post_dt and post_dt >= window_7d:
                posts_7d += 1
            if post_dt and post_dt >= window_30d:
                author = str(post.get("author") or "").strip()
                if author:
                    active_authors_30d.add(author.lower())

            likes = post.get("likes_count")
            total_likes += int(likes if isinstance(likes, int) else 0)

            if bool(post.get("is_pinned")):
                pinned_posts += 1

            if str(post.get("helpful_comment_id") or "").strip():
                helpful_marked += 1

            post_reports = post.get("reports") or []
            if isinstance(post_reports, list):
                total_reports += len(post_reports)

            comments = post.get("comments") or []
            if isinstance(comments, list):
                total_comments += len(comments)
                for comment in comments:
                    comment_dt = parse_dt(comment.get("timestamp"))
                    if comment_dt and comment_dt >= window_7d:
                        comments_7d += 1
                    if comment_dt and comment_dt >= window_30d:
                        c_author = str(comment.get("author") or "").strip()
                        if c_author:
                            active_authors_30d.add(c_author.lower())
                    comment_reports = comment.get("reports") or []
                    if isinstance(comment_reports, list):
                        total_reports += len(comment_reports)

        engagement_actions = total_comments + total_likes + helpful_marked
        engagement_per_post = round((engagement_actions / total_posts), 2) if total_posts else 0.0

        return {
            "total_posts": total_posts,
            "total_comments": total_comments,
            "total_likes": total_likes,
            "total_reports": total_reports,
            "pinned_posts": pinned_posts,
            "helpful_marked_posts": helpful_marked,
            "active_authors_30d": len(active_authors_30d),
            "posts_7d": posts_7d,
            "comments_7d": comments_7d,
            "engagement_actions": engagement_actions,
            "engagement_per_post": engagement_per_post,
            "generated_at": now.isoformat(),
        }

    def set_post_pin(self, post_id: str, pinned: Optional[bool] = None) -> Optional[Dict]:
        if self._writes_disabled():
            return None
        if self.is_mongo:
            try:
                post = self.db.posts.find_one({"id": post_id}, {"_id": 0})
                if not post:
                    return None
                current = bool(post.get("is_pinned", False))
                next_state = (not current) if pinned is None else bool(pinned)
                pinned_at = datetime.now().isoformat() if next_state else None
                self.db.posts.update_one(
                    {"id": post_id},
                    {"$set": {"is_pinned": next_state, "pinned_at": pinned_at}}
                )
                return {"is_pinned": next_state, "pinned_at": pinned_at}
            except Exception as e:
                logger.error(f"Mongo Set Post Pin Error: {e}")
                return None

        posts = self.get_posts()
        result = None
        for post in posts:
            if post.get("id") != post_id:
                continue
            current = bool(post.get("is_pinned", False))
            next_state = (not current) if pinned is None else bool(pinned)
            post["is_pinned"] = next_state
            post["pinned_at"] = datetime.now().isoformat() if next_state else None
            result = {"is_pinned": next_state, "pinned_at": post["pinned_at"]}
            break
        if result is not None:
            self._save_local(self.posts_file, posts)
        return result

    def set_helpful_comment(
        self,
        post_id: str,
        comment_id: str,
        actor_id: str,
        helpful: Optional[bool] = None
    ) -> Optional[Dict]:
        if self._writes_disabled():
            return None
        actor = str(actor_id or "").strip()
        if not actor:
            return None

        if self.is_mongo:
            try:
                post = self.db.posts.find_one({"id": post_id}, {"_id": 0})
                if not post:
                    return None

                owner_actor = str(post.get("owner_actor") or "").strip()
                if not owner_actor:
                    owner_actor = self._derive_owner_actor(str(post.get("author") or ""))
                    self.db.posts.update_one({"id": post_id}, {"$set": {"owner_actor": owner_actor}})
                if actor != owner_actor:
                    return {"error": "forbidden"}

                comments = post.get("comments") or []
                matched = any(str(c.get("id") or "").strip() == comment_id for c in comments)
                if not matched:
                    return None

                current_helpful = str(post.get("helpful_comment_id") or "").strip()
                should_mark = (current_helpful != comment_id) if helpful is None else bool(helpful)
                next_helpful_id = comment_id if should_mark else None

                for comment in comments:
                    comment["helpful"] = bool(next_helpful_id and str(comment.get("id") or "").strip() == next_helpful_id)

                self.db.posts.update_one(
                    {"id": post_id},
                    {"$set": {"helpful_comment_id": next_helpful_id, "comments": comments}}
                )
                return {"helpful_comment_id": next_helpful_id, "helpful": should_mark}
            except Exception as e:
                logger.error(f"Mongo Mark Helpful Comment Error: {e}")
                return None

        # Local fallback
        posts = self.get_posts()
        updated = None
        for post in posts:
            if post.get("id") != post_id:
                continue

            owner_actor = str(post.get("owner_actor") or "").strip()
            if not owner_actor:
                owner_actor = self._derive_owner_actor(str(post.get("author") or ""))
                post["owner_actor"] = owner_actor
            if actor != owner_actor:
                return {"error": "forbidden"}

            comments = post.get("comments") or []
            matched = any(str(c.get("id") or "").strip() == comment_id for c in comments)
            if not matched:
                return None

            current_helpful = str(post.get("helpful_comment_id") or "").strip()
            should_mark = (current_helpful != comment_id) if helpful is None else bool(helpful)
            next_helpful_id = comment_id if should_mark else None
            post["helpful_comment_id"] = next_helpful_id

            for comment in comments:
                cid = str(comment.get("id") or "").strip()
                comment["helpful"] = bool(next_helpful_id and cid == next_helpful_id)

            updated = {"helpful_comment_id": next_helpful_id, "helpful": should_mark}
            break

        if updated is not None:
            self._save_local(self.posts_file, posts)
        return updated

    def toggle_post_like(self, post_id: str, actor_id: str, liked: Optional[bool] = None) -> Optional[Dict]:
        if self._writes_disabled():
            return None
        actor = str(actor_id or "").strip()
        if not actor:
            return None

        if self.is_mongo:
            try:
                post = self.db.posts.find_one({"id": post_id}, {"_id": 0})
                if not post:
                    return None
                liked_by = post.get("liked_by") or []
                if not isinstance(liked_by, list):
                    liked_by = []
                is_liked = actor in liked_by
                should_like = (not is_liked) if liked is None else bool(liked)

                if should_like and actor not in liked_by:
                    liked_by.append(actor)
                if not should_like and actor in liked_by:
                    liked_by = [x for x in liked_by if x != actor]

                likes_count = len(liked_by)
                self.db.posts.update_one(
                    {"id": post_id},
                    {"$set": {"liked_by": liked_by, "likes_count": likes_count}}
                )
                return {"likes_count": likes_count, "liked": actor in liked_by}
            except Exception as e:
                logger.error(f"Mongo Toggle Like Error: {e}")
                return None

        # Local fallback
        posts = self.get_posts()
        updated = None
        for p in posts:
            if p.get("id") != post_id:
                continue
            liked_by = p.get("liked_by") or []
            if not isinstance(liked_by, list):
                liked_by = []
            is_liked = actor in liked_by
            should_like = (not is_liked) if liked is None else bool(liked)
            if should_like and actor not in liked_by:
                liked_by.append(actor)
            if not should_like and actor in liked_by:
                liked_by = [x for x in liked_by if x != actor]
            p["liked_by"] = liked_by
            p["likes_count"] = len(liked_by)
            updated = {"likes_count": p["likes_count"], "liked": actor in liked_by}
            break
        if updated is not None:
            self._save_local(self.posts_file, posts)
        return updated

# Global instance
db = Database()
