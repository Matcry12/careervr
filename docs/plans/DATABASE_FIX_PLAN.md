# Database Reliability Fix Plan

Date: 2026-02-18  
Source: `docs/plans/DATABASE_BUG_AUDIT_AND_DEBUG_PLAN_2026-02-18.md`

## Goal

Eliminate silent persistence failures and make all DB-backed features fail explicitly (with actionable errors) instead of returning false success.

## Scope

Applies to DB-related behavior in:
- `backend/database.py`
- `backend/main.py`
- selected diagnostics/utilities

## Non-Goals

- No schema redesign outside reliability and write-integrity needs.
- No advanced optimization (transactions/index tuning) unless required for correctness.

## Milestones

## D0 - Write Integrity Contract

1. Introduce DB write result contract in `database.py`:
- every write method returns structured result:
  - `ok: bool`
  - `reason: str`
  - optional metadata (`matched`, `modified`, etc.)

2. Target methods:
- `create_user`
- `update_vr_jobs`
- `add_submission`
- `add_post`
- `add_comment`
- moderation write methods where needed

3. Success criteria:
- API layer can reliably detect write failure.

## D1 - API Fail-Fast Behavior

1. Update API endpoints to honor DB result contract:
- if `ok=false`, return 5xx/4xx with explicit reason.
- never return success payload on failed persistence.

2. Critical endpoints:
- auth register/login path integrity
- community post/comment/report/like/helpful/pin
- submission writes
- VR admin writes/import writes

3. Success criteria:
- no optimistic success responses when DB write failed.

## D2 - Environment Mode Safety

1. Add explicit mode guard:
- if `VERCEL=1` and `is_mongo=false`, write endpoints return deterministic error (not silent no-op).

2. Add startup mode logs:
- one-line summary of persistence mode and write capability.

3. Success criteria:
- operators/users can immediately see degraded write mode.

## D3 - Data Consistency and Tooling

1. Fix DB utility script issues:
- `backend/verify_mongo_ops.py` invalid attribute usage.

2. Improve update semantics where risky:
- VR full replacement path safety checks.

3. Success criteria:
- support tooling runs without crashing.

## D4 - QA and Closure

1. Execute DB-mode test matrix:
- Mongo connected
- local writable
- Vercel+noMongo

2. Validate critical flows:
- register/login
- test->submission
- community CRUD/moderation
- VR admin writes/import

3. Success criteria:
- all write-related flows either persist or fail explicitly with clear message.

## Risks

- Broad endpoint touch surface can introduce regressions.
- Existing frontend assumes optimistic success in some areas.
- Environment-specific behavior (Vercel vs local) must be tested separately.

## Rollout Strategy

1. Implement D0+D1 first, smallest safe diff.
2. Verify with compile + targeted API checks.
3. Implement D2 (mode guards).
4. Finalize D3+D4 and update reports/boards.

