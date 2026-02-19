# Database Critical Flow QA

Date: 2026-02-18
Scope: `DBF-QA-02` from `docs/tasks/DATABASE_FIX_TASKS.md`

## Objective

Validate critical persistence flows and ensure no false-success behavior remains for:
- register/login persistence path
- submissions write/read path
- VR jobs admin write path
- community write path (post/comment/like/report/pin/helpful)
- degraded mode behavior (`VERCEL=1`, no Mongo)

## Environment Constraint

This container blocks socket creation (`PermissionError: [Errno 1] Operation not permitted`), so endpoint-level smoke via `requests`/`TestClient` is not executable here.

Validation was executed with deterministic function-level flow simulation using:
- `backend/qa_dbf_qa02.py`

## Execution

Command:

```bash
python backend/qa_dbf_qa02.py
```

Result: `PASS`

## Evidence Summary

## 1) Local writable mode

- `create_user` -> `ok=true`, reason `local_write_ok`
- read-after-write user lookup succeeded
- password verification succeeded (`verify_password`)
- `add_submission` persisted successfully
- `update_vr_jobs` persisted successfully
- community write chain succeeded:
  - `add_post`
  - `add_comment`
  - `toggle_post_like`
  - `report_post`
  - `set_post_pin`
  - `set_helpful_comment`

Conclusion: critical write flows persist and report success only when persistence succeeds.

## 2) Vercel + no Mongo mode

- `create_user`, `add_submission`, `update_vr_jobs`, `add_post`, `add_comment`
  - all returned `{ok:false, reason:"vercel_local_write_disabled"}`
- optional-return moderation writes (`toggle_post_like`, `report_post`, `set_post_pin`) returned `None` as designed for API fail-fast wrappers.

Conclusion: degraded mode explicitly blocks writes and avoids false-success behavior.

## Acceptance Check (DBF-QA-02)

- No false-success behavior remains in validated DB/auth critical flows: `MET`
- Endpoint HTTP-path execution in this container: `NOT EXECUTED` (socket restricted)

## Follow-up

Recommended in deployment-like environment:
- run full HTTP regression against `/api/auth/*`, `/api/submissions`, `/api/vr-jobs*`, `/api/community/*`
- run same checks with live Mongo connectivity
