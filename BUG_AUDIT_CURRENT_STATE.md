# Bug Audit - Current Project State

Date: 2026-02-16
Scope: frontend UI/UX + auth flow + test->results flow + VR mode + backend/API integration consistency

## Summary
The project is currently in a mixed/partially-merged state: templates and styles are from a newer UI version, while runtime JS is an older monolithic `backend/static/script.js` with duplicated and conflicting logic. This causes visible UI artifacts, broken navigation flow, and admin VR management failures.

## Critical Findings

### 1) Unresolved merge-conflict text is visible in Signup UI
- Severity: Critical
- Symptom:
  - Signup page renders `<<<<<<< HEAD`, `=======`, `>>>>>>> ...` as plain text.
  - Layout is inconsistent in password field section.
- Reproduction:
  1. Open `/signup`
  2. Observe password block area
- Evidence:
  - `backend/templates/signup.html:23`
  - `backend/templates/signup.html:28`
  - `backend/templates/signup.html:32`
- Root cause:
  - Merge markers were committed into template file.
- Impact:
  - Broken UI and potentially broken DOM assumptions for future JS validation.

### 2) Test submission does not navigate to Results page
- Severity: Critical
- Symptom:
  - After finishing exam and submitting, app does not open `/results` page reliably.
- Reproduction:
  1. Open `/test`
  2. Fill answers and click submit
  3. Observe: results route is not navigated as expected
- Evidence:
  - `submitTest()` calls `goPage('results')` in `backend/static/script.js:1184-1185`
  - `goPage()` is SPA-style DOM toggling only (no route redirect): `backend/static/script.js:356-371`
- Root cause:
  - JS uses old SPA page-switch logic while app is now MPA route-based templates.
- Impact:
  - Core student journey is broken.

### 3) VR admin add/edit workflow is incompatible with current template IDs
- Severity: Critical
- Symptom:
  - Admin actions throw runtime errors or fail silently when opening/editing/saving jobs.
- Reproduction:
  1. Login as admin
  2. Open `/vr-mode`
  3. Click edit/add job
- Evidence:
  - JS expects `devJobRIASEC` and `devJobMajors`: `backend/static/script.js:1552-1553`, `1572-1573`, `1626-1627`
  - Template defines `devJobRiasec` (different casing) and has no `devJobMajors`: `backend/templates/vr.html`
- Root cause:
  - Template and script are from different implementations.
- Impact:
  - Admin cannot reliably manage jobs via modal.

### 4) VR save/delete calls non-existent backend endpoints
- Severity: Critical
- Symptom:
  - Save/edit/delete in VR modal fails against API.
- Reproduction:
  1. Open VR editor modal
  2. Save or delete a job
- Evidence:
  - JS calls:
    - `PUT /api/vr-jobs/{id}` and `POST /api/vr-jobs` for single payload: `backend/static/script.js:1590-1605`
    - `DELETE /api/vr-jobs/{id}`: `backend/static/script.js:1639-1642`
  - Backend only exposes bulk `POST /api/vr-jobs` (list payload), no PUT/DELETE item route: `backend/main.py:452-456`
- Root cause:
  - API contract mismatch between frontend and backend.
- Impact:
  - Admin CRUD appears available but fails in practice.

### 5) VR import/template client logic is partially incompatible
- Severity: High
- Symptom:
  - Template download can fail unauthorized; import success path can crash.
- Evidence:
  - `downloadVRTemplate()` does not send Authorization header: `backend/static/script.js:374-390`
  - Backend requires admin for template endpoint: `backend/main.py:465-467`
  - On import success, JS calls undefined `getVRJobs()` instead of `fetchVRJobs()`: `backend/static/script.js:416`
- Root cause:
  - Old helper code not aligned with current secured backend endpoints.
- Impact:
  - Admin import flow unstable/broken.

### 6) Duplicate VR functions in runtime script create ambiguous behavior
- Severity: High
- Symptom:
  - Multiple definitions increase risk of unexpected overrides and regressions.
- Evidence:
  - `fetchVRJobs` defined twice:
    - `backend/static/script.js:1391`
    - `backend/static/script.js:1457`
- Root cause:
  - Merged old and new VR implementations in same file.
- Impact:
  - Hard-to-debug runtime behavior and nondeterministic future edits.

### 7) Admin tools visibility depends on brittle mixed mechanisms
- Severity: High
- Symptom:
  - Admin panel/button visibility appears inconsistent for users.
- Evidence:
  - CSS hides `.admin-only` by default and relies on runtime class toggles.
  - JS toggles both `body.is-admin` and inline `style.display` across multiple locations (`updateAdminUI` + `renderVRJobs`) in `backend/static/script.js`.
- Root cause:
  - Multiple control planes (CSS class + direct inline style + duplicated functions).
- Impact:
  - Admin users may not see controls depending on render order/cache/state.

## Additional Quality/Consistency Issues

### 8) Mixed architecture in repo (module JS + monolithic JS)
- Severity: Medium
- Symptom:
  - Both `backend/static/js/*.js` and `backend/static/script.js` exist, but only one runtime path is active.
- Evidence:
  - Active script in base template: `backend/templates/base.html` -> `/static/script.js?v=2.6`
  - Module files still present: `backend/static/js/*`
- Impact:
  - High confusion and accidental edits to inactive files.

### 9) Possible duplicate data directories
- Severity: Medium
- Symptom:
  - Repo contains `backend/data/*` and `backend/backend/data/*`.
- Evidence:
  - File listing shows both trees.
- Impact:
  - Risk of debugging wrong dataset and inconsistent local behavior.

### 10) UI text/content artifacts from mixed edits
- Severity: Medium
- Symptom:
  - Inconsistent wording and legacy fragments across pages.
- Impact:
  - Perceived instability and reduced trust.

## User-reported Issues Mapping

1. Register page UI broken
- Confirmed by Finding #1 (merge markers in `signup.html`).

2. Exam submission not reaching results
- Confirmed by Finding #2 (SPA `goPage` in MPA app).

3. Clicking jobs to pop video / VR behavior unstable
- Likely affected by Findings #3/#4/#6/#7 (mixed/duplicated VR logic and API mismatch).

4. VR mode UI bad and backend not working
- Confirmed by Findings #3/#4/#5/#6 and API contract mismatch.

## Recommended Fix Order

1. Remove merge markers and normalize `signup.html`.
2. Replace SPA `goPage('results')` submission path with route redirect (`window.location.href='/results'`).
3. Choose one frontend architecture:
   - Either keep monolithic `script.js` and remove conflicting module code paths,
   - Or restore module architecture and remove dead monolith sections.
4. Align VR template IDs with JS expected IDs (or vice versa).
5. Align VR frontend API calls with backend endpoints (bulk update model or add proper item routes).
6. Remove duplicate function definitions in `script.js`.
7. Consolidate admin visibility logic to one mechanism.
8. Clean duplicated data directories and document single source of truth.

## Current Validation Status
- Syntax check currently passes:
  - `python -m py_compile backend/main.py`
  - `node --check backend/static/script.js`
- Runtime behavior remains functionally broken due to logic/contract mismatch above.

