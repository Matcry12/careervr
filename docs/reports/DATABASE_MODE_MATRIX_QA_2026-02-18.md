# Database Mode Matrix QA

Date: 2026-02-18  
Scope: `DBF-QA-01` from `docs/tasks/DATABASE_FIX_TASKS.md`

## Objective

Verify and document expected behavior across persistence modes:
1. Mongo connected
2. Local writable
3. Vercel + no Mongo

## Results Summary

- Local writable mode: `PASS`
- Vercel + no Mongo mode: `PASS`
- Mongo connected mode: `NOT EXECUTED` in this environment (network/DNS restricted), behavior documented from code path

## Matrix

## 1) Local writable mode (`VERCEL` unset, `is_mongo=False`)

Command evidence:
- `create_user` -> `{ok: True, reason: local_write_ok}`
- `add_post` -> `{ok: True, reason: local_write_ok}`
- `add_submission` -> `{ok: True, reason: local_write_ok}`
- `update_vr_jobs` -> `{ok: True, reason: local_write_ok}`

Conclusion:
- Local file persistence works and returns explicit success contract.

## 2) Vercel + no Mongo mode (`VERCEL=1`, `MONGODB_URI=''`, `is_mongo=False`)

Command evidence:
- `create_user` -> `{ok: False, reason: vercel_local_write_disabled}`
- `add_post` -> `{ok: False, reason: vercel_local_write_disabled}`
- `add_submission` -> `{ok: False, reason: vercel_local_write_disabled}`
- `update_vr_jobs` -> `{ok: False, reason: vercel_local_write_disabled}`

Conclusion:
- Silent writes are eliminated.
- Degraded mode now returns deterministic write failure result.

## 3) Mongo connected mode (`is_mongo=True`)

Execution status:
- Not executed in this container due restricted network/DNS to Mongo endpoints.

Code-path expectation:
- Write methods use Mongo branches and return:
  - success: `ok=True` with `mongo_*_ok` reasons
  - failure: `ok=False` with `mongo_*_error` reasons

Recommended external verification:
- Run `backend/verify_mongo_ops.py` in an environment with valid Mongo connectivity.
- Execute API smoke for register/post/submission/VR update.

## Acceptance Check (DBF-QA-01)

- "Expected behavior documented for each mode": `MET`
- Runtime validation for all three modes: `PARTIAL` (2/3 executed in this environment)

## Notes

- This QA artifact is sufficient for mode-behavior documentation and for closing DBF-QA-01 at planning level.
- Full production readiness should include live Mongo run in deployment-like network.

