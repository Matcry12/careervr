# UI/UX Focused Task Board

Date: 2026-02-18
Source: `docs/plans/UI_UX_FOCUSED_IMPROVEMENT_PLAN_2026-02-18.md`
Status: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`
Priority: `P0` critical | `P1` high | `P2` medium

---

## Milestone F0 - Baseline and Safety
Goal: prepare safe implementation path with minimal regression risk.

### UIF-001 - Lock current selectors and IDs before layout changes
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: none
- Scope:
  - Verify IDs used by JS remain unchanged after template refactor.
  - Record required IDs for test/community scripts.
- Files:
  - `backend/templates/test.html`
  - `backend/templates/community.html`
  - `backend/static/js/test-results-dashboard.js`
  - `backend/static/js/community-profile.js`
- Acceptance:
  - No JS selector break due to layout movement/splitting.
- Note:
  - Verified key IDs (`chunkIndicator`, `btnChunkPrev`, `btnChunkNext`, `communitySearch`, `postTitle`, `communityDraftRelated`, `communityAdminReports`) remain intact.

---

## Milestone F1 - Community Visual Separation
Goal: make major community sections visually distinct.

### UIF-101 - Increase spacing between major community panels
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIF-001
- Scope:
  - Improve vertical rhythm between related/view/admin sections.
- Files:
  - `backend/static/style.css`
- Acceptance:
  - Adjacent major blocks no longer look merged.

### UIF-102 - Distinct visual style for admin moderation section
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIF-101
- Scope:
  - Add clear admin-only section identity (accent/border/title tone).
- Files:
  - `backend/templates/community.html`
  - `backend/static/style.css`
- Acceptance:
  - `communityAdminReports` is clearly separate from user-facing content.

---

## Milestone F2 - Community Information Architecture
Goal: reduce cognitive overload in community composer area.

### UIF-201 - Split discovery controls from post creation form
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UIF-001
- Scope:
  - Create panel: "Khám phá thảo luận" for search/filter/sort.
  - Create separate panel: "Tạo bài viết mới" for author/title/content/post.
- Files:
  - `backend/templates/community.html`
  - `backend/static/style.css`
- Acceptance:
  - User can immediately distinguish browse vs create actions.

### UIF-202 - Reframe draft-related suggestions as create sub-section
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIF-201
- Scope:
  - Keep draft-related suggestions under create panel with softer hierarchy.
- Files:
  - `backend/templates/community.html`
  - `backend/static/style.css`
- Acceptance:
  - Suggestions support writing flow without competing with primary actions.

### UIF-203 - Validate community JS bindings after template split
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UIF-201, UIF-202
- Scope:
  - Ensure existing IDs/events still work.
  - Adjust only if binding breaks.
- Files:
  - `backend/static/js/community-profile.js`
- Acceptance:
  - Search/filter/post/report/like/helpful/pin behaviors unchanged functionally.

---

## Milestone F3 - Test Flow Usability
Goal: reduce unnecessary student scrolling during chunk-based test.

### UIF-301 - Move chunk toolbar below questions container
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UIF-001
- Scope:
  - Move `test-chunk-toolbar` to lower position (near submit actions).
- Files:
  - `backend/templates/test.html`
  - `backend/static/style.css`
- Acceptance:
  - Student can switch chunk from bottom area after answering.

### UIF-302 - Re-check chunk indicator update logic after relocation
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UIF-301
- Scope:
  - Validate indicator and nav button state updates remain correct.
- Files:
  - `backend/static/js/test-results-dashboard.js`
- Acceptance:
  - Indicator text and prev/next button states stay accurate per chunk.

---

## Milestone F4 - QA and Sign-off
Goal: prove UX improvements without functional regression.

### UIF-QA-01 - Community regression smoke
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: F1, F2
- Scope:
  - Test student/admin community interactions and panel clarity.
- Acceptance:
  - No interaction regressions; layout clarity improved.
- Note:
  - Completed code-level regression and binding checks; report: `docs/reports/UI_UX_FOCUSED_QA_2026-02-18.md`.

### UIF-QA-02 - Test page chunk navigation regression smoke
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: F3
- Scope:
  - Validate chunk flow, submit flow, and mobile behavior.
- Acceptance:
  - No chunk-navigation regressions and reduced scroll friction.
- Note:
  - Completed code-level regression and structure checks; report: `docs/reports/UI_UX_FOCUSED_TEST_CHUNK_QA_2026-02-18.md`.

### UIF-DOC-01 - Update UI/UX report with before/after evidence
- Status: `DONE`
- Priority: `P2`
- Owner: Docs/Frontend
- Depends on: UIF-QA-01, UIF-QA-02
- Scope:
  - Add concise evidence and final status.
- Acceptance:
  - Report reflects completed focused improvements.
- Note:
  - Completed evidence file: `docs/reports/UI_UX_FOCUSED_BEFORE_AFTER_2026-02-18.md`.

---

## Suggested Execution Order
1. UIF-001
2. UIF-101
3. UIF-102
4. UIF-201
5. UIF-202
6. UIF-203
7. UIF-301
8. UIF-302
9. UIF-QA-01
10. UIF-QA-02
11. UIF-DOC-01
