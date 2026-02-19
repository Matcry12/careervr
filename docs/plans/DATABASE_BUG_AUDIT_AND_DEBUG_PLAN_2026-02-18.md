# Database Bug Audit and Debug Plan

Date: 2026-02-18  
Scope: all database-related functions in `backend/database.py` and their API usage in `backend/main.py`

## Executive Summary

The highest-impact issue is a persistence black hole when running with `VERCEL=1` and no working MongoDB connection. In that mode, write operations silently no-op, but APIs often still return success. This explains repeated "feature related to DB got error / not working" behavior (register/login, community write actions, submissions, VR admin updates).

## Confirmed Bugs

## 1) Silent no-write mode on Vercel fallback (Critical)
- Location:
  - `backend/database.py:101`
  - `backend/database.py:103`
- Problem:
  - `_save_local(...)` returns immediately when `VERCEL` is set.
  - All local fallback writes become no-op.
- Impact:
  - registration appears successful but user is not stored;
  - posts/comments/submissions/VR updates do not persist;
  - APIs can return success while nothing is saved.
- Evidence (reproduced):
  - With `VERCEL=1 MONGODB_URI=''`:
    - `user_persisted False`
    - `post_persisted False`
    - `submission_persisted False`

## 2) API success without persistence verification (Critical)
- Locations:
  - `backend/main.py:674` (`db.create_user(user_data)` then token returned unconditionally)
  - `backend/main.py:824` (`db.add_submission(...)` always returns success)
  - `backend/main.py:952` (`db.add_post(...)` always returns created object)
  - `backend/main.py:972` (`db.add_comment(...)` always returns comment object)
  - `backend/main.py:723`, `backend/main.py:814` (`db.update_vr_jobs(...)` returns success regardless of DB write outcome)
- Problem:
  - DB layer methods usually don't return success/failure; API layer assumes success.
- Impact:
  - User sees success message but data is absent; follow-up actions fail.

## 3) Register->Login failure pattern under degraded DB (High)
- Locations:
  - `backend/main.py:661` register path checks duplicate via `db.get_user`
  - `backend/main.py:674` create user
  - `backend/main.py:684` login checks `db.get_user`
- Problem:
  - If create_user did not persist (Bug #1), login immediately fails.
- User-visible symptom:
  - "Register succeeded but cannot login."

## 4) Comment creation can report success even when post not found (High)
- Locations:
  - `backend/database.py:400` local add_comment
  - `backend/database.py:403` mongo add_comment
  - `backend/main.py:972` API always returns created comment
- Problem:
  - DB update does not surface whether target post matched.
- Impact:
  - UI receives success but comment never appears.

## 5) Mongo verify utility crashes due missing attribute (Low)
- Location:
  - `backend/verify_mongo_ops.py:19`
- Problem:
  - references `db.db_name` which does not exist on `Database`.
- Impact:
  - tooling script fails despite valid DB connection.

## 6) Non-atomic full replacement write for VR jobs (Medium)
- Locations:
  - `backend/database.py:65` delete_many then insert_many
- Problem:
  - two-step replace is not atomic.
- Impact:
  - transient empty collection or partial failure window.

## 7) Limited operational diagnostics for DB mode mismatch (Medium)
- Locations:
  - `backend/database.py:29`
  - `backend/main.py:829` health endpoint uses `db.is_mongo` only
- Problem:
  - app can run in fallback mode without explicit hard-fail policy or actionable error surface.
- Impact:
  - troubleshooting takes longer; behavior appears random from UI perspective.

## Debug Plan

## Phase 0 - Safety and observability (first)

1. Add explicit DB write result objects
- Update DB methods to return `{ok: bool, reason: str, ...}`:
  - `create_user`, `add_post`, `add_comment`, `add_submission`, `update_vr_jobs`.

2. Stop silent success in API layer
- If DB write result is not `ok`, return `503` (or `500`) with clear detail.
- Do not return optimistic success payloads when persistence failed.

3. Add startup guard policy
- In production/Vercel:
  - if Mongo is required but unavailable, fail fast or expose explicit degraded mode banner.
- Add structured logs with one-line "DB mode" summary on startup.

## Phase 1 - Fix critical user paths

1. Auth flow hardening
- In register endpoint, verify user read-back after `create_user`.
- If read-back fails, return error (do not issue token).

2. Community write integrity
- `add_comment` must check post existence and return 404 on not found.
- `add_post`/`report`/`like` should include persisted confirmation where applicable.

3. VR/submission write integrity
- Return explicit failure when write path unavailable.

## Phase 2 - Data consistency improvements

1. Make VR job replacement safer
- Use transactional/atomic pattern where possible (or staged collection swap).

2. Add write-mode compatibility checks
- If `VERCEL=1` and `is_mongo=False`, disable write endpoints with clear error.

3. Tooling cleanup
- Fix `verify_mongo_ops.py` (`db.db_name` -> actual DB name source).

## Phase 3 - Regression and QA closure

1. Add DB mode test matrix
- Cases:
  - Mongo connected
  - local writable (non-Vercel)
  - Vercel + no Mongo (must return explicit failures, not silent success)

2. Smoke test checklist
- register/login
- post/comment
- submissions
- VR admin update/import

3. Update QA reports/boards
- Close DB-related blockers only after runtime verification.

## Immediate Priority Order

1. Fix Bug #1 and #2 first (silent no-write + optimistic API success).  
2. Then Bug #3 and #4 (auth and comment false-success).  
3. Then medium/low issues.

