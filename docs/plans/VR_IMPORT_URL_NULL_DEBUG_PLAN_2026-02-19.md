# VR Import Missing Video URL Debug Plan (2026-02-19)

## Problem Statement
User still sees `Missing or invalid Video URL` during Excel import, even after backend logic was updated to fallback for missing/invalid `Video URL`.

## Current Code Reality (Verified)
- In local code, import endpoint now:
  - replaces empty `Video URL` with fallback URL,
  - replaces empty parsed `videoId` with fallback `videoId`,
  - returns warnings instead of skipping for URL issues.
- The exact error text `Missing or invalid Video URL` is no longer present in `backend/` codebase.

Inference:
- The running environment likely does not use the latest backend code path, or error comes from a different stage (frontend cached response, stale server process, different deployment).

## Goals
1. Identify where the stale error message originates.
2. Ensure import always succeeds when `Video URL` is blank/invalid.
3. Surface clear warnings to user (not hard-fail) for auto-filled video fields.

## Hypotheses (Priority Order)
1. **Stale backend process / old deployment** is handling `/api/vr-jobs/import`.
2. **Multiple environments** (local vs deployed) are being mixed by frontend `API_BASE`.
3. **Client caching/service worker** serves old JS/backend expectations.
4. **Different error source** (e.g., validation path or proxy) still returns legacy message.
5. **Excel parsing mismatch** (header mismatch, hidden chars) causes unexpected branch and old message from non-updated environment.

## Debug Plan

### Phase D1 - Runtime Version Verification (must-do first)
- Add a temporary lightweight import-version marker in API response, e.g.:
  - `import_version: "vr-import-fallback-v2-2026-02-19"`
- Trigger import once and inspect response payload in browser network tab.
- Confirm the marker appears.

Expected:
- If marker missing, request is not hitting updated backend.

### Phase D2 - Environment Path Verification
- Inspect frontend `API_BASE` at runtime in browser console.
- Confirm request URL for `/api/vr-jobs/import` in network tab.
- Verify token/session belongs to same environment.

Expected:
- Single consistent environment (local or deployed), not mixed endpoints.

### Phase D3 - Response Payload Audit
- Capture full import response JSON for failing file.
- Check whether response has:
  - `errors[]` from backend,
  - `warnings[]`,
  - `created/updated/skipped` counts,
  - `detail` field from exception.

Expected:
- URL issues should appear in `warnings[]`, not `errors[]`.

### Phase D4 - Excel Input Sanity
- Validate column headers exactly:
  - `Job Title`, `Video URL`, `Description`, `RIASEC_Code`, `Icon_URL`
- Check problematic rows for:
  - truly empty title/code,
  - formulas returning unexpected types,
  - non-printable characters.

Expected:
- Missing title/code should still be errors.
- Missing/invalid URL should be warnings only.

### Phase D5 - Frontend Error Rendering Guard
- Update frontend import UI logic:
  - If `res.ok` and `errors.length === 0`, render warnings separately as info.
  - Do not show failure-style headline when only warnings exist.

Expected:
- Users understand import succeeded with automatic placeholder replacement.

## Implementation Tasks
- `VR-IMP-DBG-01`: Add import runtime marker to backend response.
- `VR-IMP-DBG-02`: Add temporary structured logs for each imported row decision (`fallback_missing_url`, `fallback_invalid_url`, `skip_reason`).
- `VR-IMP-DBG-03`: Improve frontend status block to display warnings distinctly from errors.
- `VR-IMP-DBG-04`: Create a tiny diagnostic script/checklist for user to verify API URL + response marker.
- `VR-IMP-DBG-05`: Remove temporary marker/log verbosity after fix is confirmed.

## Acceptance Criteria
- Import with blank `Video URL` no longer fails.
- Backend response includes warning entries for auto-filled URLs.
- No legacy `Missing or invalid Video URL` failure unless runtime is outdated.
- User can verify environment correctness with one clear marker.

## Quick User Checklist (for next run)
1. Open browser DevTools -> Network.
2. Import file once.
3. Click `/api/vr-jobs/import` response and verify:
   - status 200,
   - `warnings` contains URL fallback notes,
   - marker/version field present.
4. If marker missing, restart/redeploy backend and retest.
