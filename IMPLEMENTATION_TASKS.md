# Implementation Task Board - Recommendation System & VR Upgrade

Status legend: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`  
Priority legend: `P0` (critical) | `P1` (high) | `P2` (normal)

---

## Milestone M0 - Alignment and Baseline
Target outcome: team aligned on API contract, rollout order, and non-breaking strategy.

### TSK-0001 - Finalize API contract for recommendations
- Status: `TODO`
- Priority: `P0`
- Owner: Backend Lead
- Depends on: none
- Deliverables:
  - Final JSON schema for `recommendations.priority`, `recommendations.backup`, `recommendations.all_sorted_jobs`
  - Backward-compatibility notes for existing frontend
- Acceptance criteria:
  - Schema published in repo docs and referenced by backend/frontend tasks

### TSK-0002 - Define rollout + fallback policy
- Status: `TODO`
- Priority: `P1`
- Owner: Tech Lead
- Depends on: TSK-0001
- Deliverables:
  - Rollout order (backend first, then frontend)
  - Behavior for invalid/missing `riasec_code`
- Acceptance criteria:
  - Written policy committed and shared with team

---

## Milestone M1 - Backend Recommendation Core
Target outcome: backend computes deterministic 3+1 recommendations with robust fallback.

### TSK-1001 - Add weighted relevance scoring function
- Status: `TODO`
- Priority: `P0`
- Owner: Backend
- Depends on: TSK-0001
- Files:
  - `backend/riasec_calculator.py`
- Deliverables:
  - `calculate_relevance(student_code, jobs)` implementation
  - Deterministic sorting/tie-break logic
- Acceptance criteria:
  - Unit tests pass for scoring rules and tie-breaks

### TSK-1002 - Implement `3+1` recommendation selector
- Status: `TODO`
- Priority: `P0`
- Owner: Backend
- Depends on: TSK-1001
- Files:
  - `backend/riasec_calculator.py`
- Deliverables:
  - `get_recommendations_3_plus_1(...)` returning structured object
  - Zero-match fallback behavior
- Acceptance criteria:
  - Returns 3 priority + 1 backup whenever possible
  - No blank recommendation response in fallback tests

### TSK-1003 - Extend VRJob model with `riasec_code`
- Status: `TODO`
- Priority: `P0`
- Owner: Backend
- Depends on: TSK-0002
- Files:
  - `backend/main.py`
- Deliverables:
  - Required `riasec_code` validation (`^[RIASEC]{3}$`, uppercase)
- Acceptance criteria:
  - Invalid values rejected with 4xx and clear error message

### TSK-1004 - Integrate recommendation object into API responses
- Status: `TODO`
- Priority: `P0`
- Owner: Backend
- Depends on: TSK-1002, TSK-1003
- Files:
  - `backend/main.py`
- Deliverables:
  - `run-riasec` and conversation bootstrap responses include structured recommendations
- Acceptance criteria:
  - Contract matches TSK-0001 schema
  - Existing non-upgraded pages do not crash

---

## Milestone M2 - AI Guardrails (Dify)
Target outcome: chatbot recommendations restricted to allowed top-4 jobs.

### TSK-2001 - Inject allowed job list into Dify prompt
- Status: `TODO`
- Priority: `P0`
- Owner: Backend
- Depends on: TSK-1004
- Files:
  - `backend/main.py`
- Deliverables:
  - Prompt context includes top-4 jobs (ID + title)
  - Explicit "recommend only from allowed list" instruction
- Acceptance criteria:
  - Prompt payload contains allowed list fields in integration tests

### TSK-2002 - Add hallucination validation tests
- Status: `TODO`
- Priority: `P1`
- Owner: QA/Backend
- Depends on: TSK-2001
- Files:
  - `test_backend_full.py`
  - `test_backend_features.py`
- Deliverables:
  - Test cases that fail if AI suggests out-of-list jobs (mocked or controlled)
- Acceptance criteria:
  - Tests pass with constrained recommendation outputs

---

## Milestone M3 - Teacher Excel Tools
Target outcome: teachers can download template and bulk import VR jobs safely.

### TSK-3001 - Add Excel dependencies
- Status: `TODO`
- Priority: `P1`
- Owner: Backend
- Depends on: none
- Files:
  - `requirements.txt`
- Deliverables:
  - Add `pandas`, `openpyxl`
- Acceptance criteria:
  - Environment installs successfully

### TSK-3002 - Implement template download endpoint
- Status: `TODO`
- Priority: `P1`
- Owner: Backend
- Depends on: TSK-3001
- Files:
  - `backend/main.py`
- Deliverables:
  - `GET /api/vr-jobs/template` returns valid `.xlsx` with required headers
- Acceptance criteria:
  - Downloaded file opens correctly and headers match spec

### TSK-3003 - Implement import endpoint with validation report
- Status: `TODO`
- Priority: `P0`
- Owner: Backend
- Depends on: TSK-3001, TSK-1003
- Files:
  - `backend/main.py`
  - `backend/database.py` (if needed)
- Deliverables:
  - `POST /api/vr-jobs/import` multipart upload
  - Validation for required columns and non-empty `RIASEC_Code`
  - Structured result: `created`, `updated`, `skipped`, `errors`
- Acceptance criteria:
  - Bad files return 4xx (not 500)
  - Valid file imports complete and persist

### TSK-3004 - Add import endpoint tests
- Status: `TODO`
- Priority: `P1`
- Owner: QA/Backend
- Depends on: TSK-3003
- Files:
  - `test_backend_full.py`
  - new focused import tests if needed
- Acceptance criteria:
  - Missing-column and empty-code tests pass with expected 4xx

---

## Milestone M4 - Frontend Integration
Target outcome: frontend fully consumes backend-ranked recommendations and supports click-to-play workflow.

### TSK-4001 - Render 3+1 sections on Results page
- Status: `TODO`
- Priority: `P0`
- Owner: Frontend
- Depends on: TSK-1004
- Files:
  - `backend/static/script.js`
  - `backend/templates/results.html`
- Deliverables:
  - Distinct Priority and Backup sections
  - Fallback rendering for empty/legacy payload
- Acceptance criteria:
  - Result UI shows 3 priority + 1 backup with clear visual distinction

### TSK-4002 - Add recommendation click -> modal playback
- Status: `TODO`
- Priority: `P0`
- Owner: Frontend
- Depends on: TSK-4001
- Files:
  - `backend/static/script.js`
  - `backend/templates/results.html`
- Deliverables:
  - Click action opens video modal directly from Results page
- Acceptance criteria:
  - No navigation required to VR page to play recommended video

### TSK-4003 - Update VR ordering from backend payload
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Depends on: TSK-1004
- Files:
  - `backend/static/script.js`
- Deliverables:
  - Use backend `all_sorted_jobs`; remove client-side resorting logic
  - Top-4 "Highly Recommended" badge
- Acceptance criteria:
  - VR ordering matches backend ranking in manual checks

### TSK-4004 - Add teacher import UI controls
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Depends on: TSK-3002, TSK-3003
- Files:
  - `backend/templates/vr.html`
  - `backend/static/script.js`
- Deliverables:
  - Download template button
  - Upload Excel input/action
  - Tooltip guidance for `riasec_code`
  - UI import result display
- Acceptance criteria:
  - Teachers can complete template -> upload -> get clear success/error feedback

---

## Milestone M5 - Migration, QA, and Hardening
Target outcome: safe rollout with stable behavior and no core regressions.

### TSK-5001 - Legacy data migration handling
- Status: `TODO`
- Priority: `P1`
- Owner: Backend
- Depends on: TSK-1003
- Files:
  - `backend/database.py`
  - `backend/main.py`
- Deliverables:
  - Strategy for jobs missing `riasec_code` (infer/skip/report)
- Acceptance criteria:
  - System does not crash when legacy records are present

### TSK-5002 - Regression tests for existing features
- Status: `TODO`
- Priority: `P0`
- Owner: QA
- Depends on: M1-M4
- Files:
  - `test_backend_full.py`
  - `test_backend_features.py`
  - `test_auth_backend.py`
- Deliverables:
  - Re-run and update tests for auth, submissions, community, dashboard compatibility
- Acceptance criteria:
  - No high-severity regressions in existing feature set

### TSK-5003 - Documentation update
- Status: `TODO`
- Priority: `P2`
- Owner: Tech Writer/Dev
- Depends on: M1-M4
- Files:
  - `README.md`
  - `PROJECT_SUMMARY.md`
- Deliverables:
  - Updated endpoint docs and teacher import instructions
- Acceptance criteria:
  - New setup and usage steps are reproducible from docs

---

## Dependency Map (Quick View)
1. M0 -> M1
2. M1 -> M2 and M4
3. M1 + M3 -> M4 teacher import UI
4. M1/M2/M3/M4 -> M5

---

## Suggested Delivery Sequence (Sprints)
### Sprint 1
- TSK-0001, TSK-0002, TSK-1001, TSK-1002, TSK-1003, TSK-1004

### Sprint 2
- TSK-2001, TSK-2002, TSK-3001, TSK-3002, TSK-3003, TSK-3004

### Sprint 3
- TSK-4001, TSK-4002, TSK-4003, TSK-4004, TSK-5001, TSK-5002, TSK-5003

---

## Release Gate Checklist
- [ ] Recommendation API contract stable and documented
- [ ] 3+1 logic tested (including zero-match fallback)
- [ ] AI guardrails validated against hallucination scenarios
- [ ] Excel import/template fully operational with clear validation errors
- [ ] Results click-to-modal interaction verified
- [ ] No regressions in auth/submissions/community/dashboard
- [ ] Docs updated before production deployment

