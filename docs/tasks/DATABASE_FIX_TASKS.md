# Database Fix Task Board

Date: 2026-02-18  
Source: `docs/plans/DATABASE_FIX_PLAN.md`  
Status: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`  
Priority: `P0` critical | `P1` high | `P2` medium

---

## Milestone D0 - Write Integrity Contract
Goal: DB layer must return explicit write outcomes.

### DBF-001 - Define write result schema in DB layer
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: none
- Scope:
  - Create consistent return structure for write methods.
  - Include `ok/reason` and operation metadata.
- Acceptance:
  - All write methods use unified result format.

### DBF-002 - Apply result schema to auth and content writes
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: DBF-001
- Scope:
  - `create_user`, `add_post`, `add_comment`, `add_submission`, `update_vr_jobs`.
- Acceptance:
  - Methods no longer return implicit success only.

---

## Milestone D1 - API Fail-Fast Behavior
Goal: APIs never report success when persistence failed.

### DBF-101 - Register path read-back verification
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: DBF-002
- Scope:
  - verify user persistence before issuing token.
- Acceptance:
  - register returns error if user write failed.

### DBF-102 - Community write endpoints fail-fast
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: DBF-002
- Scope:
  - post/comment/report/like/helpful/pin endpoints.
- Acceptance:
  - all write failures surfaced as explicit API errors.

### DBF-103 - Submission and VR write fail-fast
- Status: `DONE`
- Priority: `P1`
- Owner: Backend
- Depends on: DBF-002
- Scope:
  - submission create and VR admin write/import.
- Acceptance:
  - no optimistic success responses on write failure.

---

## Milestone D2 - Environment Mode Safety
Goal: make degraded persistence mode explicit.

### DBF-201 - Add Vercel write guard behavior
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: DBF-101, DBF-102, DBF-103
- Scope:
  - deterministic rejection for writes when `VERCEL=1` and no Mongo.
- Acceptance:
  - clear API errors replace silent no-op.

### DBF-202 - Startup and health diagnostics upgrade
- Status: `DONE`
- Priority: `P1`
- Owner: Backend
- Depends on: DBF-201
- Scope:
  - expose write capability state via startup log and health payload.
- Acceptance:
  - operators can detect degraded mode quickly.

---

## Milestone D3 - Tooling and Consistency
Goal: remove tooling errors and risky update paths.

### DBF-301 - Fix `verify_mongo_ops.py` broken reference
- Status: `DONE`
- Priority: `P2`
- Owner: Backend
- Depends on: none
- Scope:
  - replace invalid `db.db_name` usage.
- Acceptance:
  - script runs without attribute error.

### DBF-302 - Improve VR replace safety checks
- Status: `DONE`
- Priority: `P2`
- Owner: Backend
- Depends on: DBF-103
- Scope:
  - guard against empty/partial destructive replace.
- Acceptance:
  - safer behavior under write exceptions.

---

## Milestone D4 - QA and Release
Goal: validate fixes across DB modes and user flows.

### DBF-QA-01 - DB mode matrix verification
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: D0-D3
- Scope:
  - Mongo connected / local writable / Vercel-noMongo.
- Acceptance:
  - expected behavior documented for each mode.
- Note: live Mongo execution not run in this container; see `docs/reports/DATABASE_MODE_MATRIX_QA_2026-02-18.md`.

### DBF-QA-02 - Critical flow regression pass
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: DBF-QA-01
- Scope:
  - register/login, submissions, community writes, VR admin writes.
- Acceptance:
  - no false-success behavior remains.
- Note: Executed via function-level regression script in this container due socket restrictions; see `docs/reports/DATABASE_CRITICAL_FLOW_QA_2026-02-18.md`.

### DBF-DOC-01 - Update technical docs and ops notes
- Status: `DONE`
- Priority: `P1`
- Owner: Docs/Backend
- Depends on: DBF-QA-02
- Scope:
  - add persistence-mode behavior and troubleshooting guidance.
- Acceptance:
  - docs reflect final DB behavior.
- Note: Added persistence mode diagnostics/troubleshooting to `README.md` and added reproducible QA script `backend/qa_dbf_qa02.py`.
