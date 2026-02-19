import json
import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from database import Database
from main import get_password_hash, verify_password


def _configure_temp_paths(db: Database, root: Path) -> None:
    db.data_dir = root
    db.vr_jobs_file = root / "vr_jobs.json"
    db.submissions_file = root / "submissions.json"
    db.posts_file = root / "posts.json"
    db.users_file = root / "users.json"


def run_local_mode() -> dict:
    os.environ.pop("VERCEL", None)
    os.environ.pop("MONGODB_URI", None)

    with tempfile.TemporaryDirectory(prefix="qa_dbf_qa02_local_") as tmp:
        db = Database()
        _configure_temp_paths(db, Path(tmp))

        result = {
            "mode": "local",
            "checks": {},
        }

        username = "qa_local_user"
        password = "123456"
        user_payload = {
            "username": username,
            "full_name": "QA Local",
            "role": "user",
            "hashed_password": get_password_hash(password),
            "created_at": datetime.now().isoformat(),
        }

        create = db.create_user(user_payload)
        stored = db.get_user(username)
        login_ok = bool(stored and verify_password(password, stored.get("hashed_password", "")))

        result["checks"]["register_write_ok"] = bool(create.get("ok") is True)
        result["checks"]["register_readback_ok"] = bool(stored is not None)
        result["checks"]["login_verify_ok"] = login_ok
        result["checks"]["register_reason"] = create.get("reason")

        submission_payload = {
            "name": "QA Student",
            "class": "12A",
            "school": "QA School",
            "riasec": ["R", "I", "A"],
            "scores": {"R": 10, "I": 9, "A": 8, "S": 7, "E": 6, "C": 5},
            "answers": [1] * 50,
            "time": datetime.now().isoformat(),
            "suggestedMajors": "IT",
            "combinations": "A00",
        }
        sub_write = db.add_submission(submission_payload)
        submissions = db.get_submissions()
        result["checks"]["submission_write_ok"] = bool(sub_write.get("ok") is True)
        result["checks"]["submission_persisted"] = bool(any(s.get("name") == "QA Student" for s in submissions))
        result["checks"]["submission_reason"] = sub_write.get("reason")

        vr_jobs = [
            {
                "id": "qa_job_1",
                "title": "QA Job",
                "videoId": "M2K7_Gfq8sA",
                "riasec_code": "IRC",
                "description": "QA",
                "icon": "X",
            }
        ]
        vr_write = db.update_vr_jobs(vr_jobs)
        vr_read = db.get_vr_jobs([])
        result["checks"]["vr_write_ok"] = bool(vr_write.get("ok") is True)
        result["checks"]["vr_persisted"] = bool(vr_read and vr_read[0].get("id") == "qa_job_1")
        result["checks"]["vr_reason"] = vr_write.get("reason")

        post = {
            "id": "qa_post_1",
            "title": "QA Post",
            "category": "study",
            "author": "QA",
            "owner_actor": "user:qa_local_user",
            "content": "content",
            "timestamp": datetime.now().isoformat(),
            "comments": [],
            "likes_count": 0,
            "liked_by": [],
            "helpful_comment_id": None,
            "is_pinned": False,
            "pinned_at": None,
        }
        post_write = db.add_post(post)

        comment = {
            "id": "qa_comment_1",
            "author": "QA",
            "content": "comment",
            "timestamp": datetime.now().isoformat(),
            "helpful": False,
            "author_actor": "user:qa_local_user",
        }
        comment_write = db.add_comment("qa_post_1", comment)

        like_result = db.toggle_post_like("qa_post_1", "user:qa_local_user", True)
        report_result = db.report_post("qa_post_1", "guest:qa", "spam", "detail")
        pin_result = db.set_post_pin("qa_post_1", True)
        helpful_result = db.set_helpful_comment("qa_post_1", "qa_comment_1", "user:qa_local_user", True)

        posts = db.get_posts()
        target = next((p for p in posts if p.get("id") == "qa_post_1"), {})

        result["checks"]["post_write_ok"] = bool(post_write.get("ok") is True)
        result["checks"]["comment_write_ok"] = bool(comment_write.get("ok") is True)
        result["checks"]["like_ok"] = bool(isinstance(like_result, dict) and like_result.get("liked") is True)
        result["checks"]["report_ok"] = bool(isinstance(report_result, dict) and report_result.get("reports_count", 0) >= 1)
        result["checks"]["pin_ok"] = bool(isinstance(pin_result, dict) and pin_result.get("is_pinned") is True)
        result["checks"]["helpful_ok"] = bool(isinstance(helpful_result, dict) and helpful_result.get("helpful_comment_id") == "qa_comment_1")
        result["checks"]["community_persisted"] = bool(target.get("likes_count", 0) >= 1 and target.get("is_pinned") is True)

        result["pass"] = all(v is True for k, v in result["checks"].items() if k.endswith("_ok") or k.endswith("_persisted"))
        return result


def run_vercel_disabled_mode() -> dict:
    os.environ["VERCEL"] = "1"
    os.environ["MONGODB_URI"] = ""

    with tempfile.TemporaryDirectory(prefix="qa_dbf_qa02_disabled_") as tmp:
        db = Database()
        _configure_temp_paths(db, Path(tmp))

        checks = {}

        checks["create_user_disabled"] = db.create_user({"username": "u", "hashed_password": "x"})
        checks["add_submission_disabled"] = db.add_submission({"name": "s"})
        checks["update_vr_jobs_disabled"] = db.update_vr_jobs([
            {
                "id": "qa_job_1",
                "title": "QA Job",
                "videoId": "M2K7_Gfq8sA",
                "riasec_code": "IRC",
                "description": "QA",
                "icon": "X",
            }
        ])
        checks["add_post_disabled"] = db.add_post({"id": "p1", "title": "t", "content": "c"})
        checks["add_comment_disabled"] = db.add_comment("p1", {"id": "c1", "content": "c"})

        # Optional-return methods should return None in disabled mode.
        checks["toggle_like_disabled"] = db.toggle_post_like("p1", "actor", True)
        checks["report_post_disabled"] = db.report_post("p1", "actor", "spam", "d")
        checks["set_pin_disabled"] = db.set_post_pin("p1", True)

        disabled_reason_ok = all(
            isinstance(v, dict) and v.get("ok") is False and v.get("reason") == "vercel_local_write_disabled"
            for k, v in checks.items()
            if k.endswith("_disabled") and isinstance(v, dict)
        )
        none_for_optional_ok = all(checks[k] is None for k in ["toggle_like_disabled", "report_post_disabled", "set_pin_disabled"])

        return {
            "mode": "vercel_no_mongo",
            "checks": checks,
            "pass": bool(disabled_reason_ok and none_for_optional_ok),
            "disabled_reason_ok": disabled_reason_ok,
            "none_for_optional_ok": none_for_optional_ok,
        }


def main() -> None:
    local = run_local_mode()
    disabled = run_vercel_disabled_mode()

    report = {
        "qa_id": "DBF-QA-02",
        "timestamp": datetime.now().isoformat(),
        "environment_limitations": [
            "Socket creation is blocked in this sandbox, so HTTP endpoint smoke (TestClient/requests) is not executable.",
            "Validation is done at DB + auth utility layer with deterministic flow simulation.",
        ],
        "results": [local, disabled],
        "pass": bool(local.get("pass") and disabled.get("pass")),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
