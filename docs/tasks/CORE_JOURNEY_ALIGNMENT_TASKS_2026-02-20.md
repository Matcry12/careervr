# Core Journey Alignment Tasks (2026-02-20)

Source request:
- Fix AI job-advice mismatch (recommended jobs vs generated guidance)
- Make `journey-step` clickable for direct page navigation
- Show chunk actions at top and bottom of test page
- Make dashboard view available to all accounts (while keeping admin-only actions protected)

## Task List

### CJA-101 - Harden AI recommendation constraints in backend payload
- Priority: P0
- Owner: Backend
- Status: DONE
- Description: Ensure Dify prompts and inputs always carry structured allowed-job constraints from computed recommendations.
- Deliverables:
  - Include explicit priority/backup job list in `inputs`
  - Keep and standardize `allowed_jobs` text contract
  - Ensure both `/start-conversation` and `/chat` use same constraint contract
- Dependencies: None
- Files:
  - `backend/main.py`
- Done when:
  - AI payload always includes normalized allowed jobs from recommendation bundle.
- Notes: Added structured constraint payload (`allowed_jobs_json`, `priority_jobs_json`, `backup_jobs_json`) and shared scoped query builder in `backend/main.py`.

### CJA-102 - Add AI response mismatch guard and correction retry
- Priority: P0
- Owner: Backend
- Status: DONE
- Description: Detect when AI answers outside allowed jobs and trigger one correction pass.
- Deliverables:
  - Response validator against allowed job titles
  - Single retry with stricter correction prompt
  - Safe fallback error if correction fails
- Dependencies: CJA-101
- Files:
  - `backend/main.py`
- Done when:
  - Out-of-list job suggestions are corrected or blocked before returning to UI.
- Notes: Added scope-violation detection and single correction retry path via `call_dify_with_scope_guard` in `backend/main.py`.

### CJA-103 - Surface recommended-job guardrails in chat context
- Priority: P1
- Owner: Frontend
- Status: DONE
- Description: Show constrained recommendation list in chatbot context so users see what AI is expected to follow.
- Deliverables:
  - Context section for allowed jobs/recommendations
  - Graceful empty state if recommendations missing
- Dependencies: CJA-101
- Files:
  - `backend/static/js/chat.js`
  - `backend/templates/chatbot.html`
- Done when:
  - Chat page visibly shows recommendation scope used by AI.
- Notes: Added `chatJobGuardrails` rendering from `recommendations.top_4` in `backend/static/js/chat.js` and `backend/templates/chatbot.html`.

### CJA-201 - Make journey stepper items interactive
- Priority: P0
- Owner: Frontend
- Status: DONE
- Description: Convert static `journey-step` blocks into clickable navigation controls.
- Deliverables:
  - Interactive step controls for test/results/vr/chatbot/community
  - Active step remains visually distinct and non-disruptive
  - Keyboard accessibility (Enter/Space)
- Dependencies: None
- Files:
  - `backend/templates/test.html`
  - `backend/templates/results.html`
  - `backend/templates/vr.html`
  - `backend/templates/chatbot.html`
  - `backend/templates/community.html`
  - `backend/static/js/test-results-dashboard.js`
  - `backend/static/style.css`
- Done when:
  - Clicking any non-active step routes to its page reliably.
- Notes: Converted stepper items to keyboard-focusable controls with `data-page` and added shared navigation binding in `backend/static/js/test-results-dashboard.js`.

### CJA-301 - Add top test chunk toolbar (keep bottom toolbar)
- Priority: P0
- Owner: Frontend
- Status: DONE
- Description: Add a second chunk navigation toolbar above the question list for convenience.
- Deliverables:
  - Top toolbar markup near `questionsContainer`
  - Existing bottom toolbar retained
- Dependencies: None
- Files:
  - `backend/templates/test.html`
  - `backend/static/style.css`
- Done when:
  - Users can navigate chunks from both top and bottom controls.
- Notes: Added a second toolbar above `questionsContainer` in `backend/templates/test.html` and matching styles in `backend/static/style.css`.

### CJA-302 - Sync multi-toolbar chunk control logic
- Priority: P0
- Owner: Frontend
- Status: DONE
- Description: Refactor chunk state updates to support multiple toolbars without duplicate-ID conflicts.
- Deliverables:
  - Shared selector-based update logic for indicators/buttons
  - Prev/Next disabled states synchronized across toolbars
- Dependencies: CJA-301
- Files:
  - `backend/static/js/test-results-dashboard.js`
- Done when:
  - Both toolbars always show correct chunk label and button states.
- Notes: Replaced single-ID chunk sync with selector-based updates (`data-chunk-*`) in `backend/static/js/test-results-dashboard.js`.

### CJA-401 - Remove frontend dashboard admin routing block
- Priority: P0
- Owner: Frontend
- Status: DONE
- Description: Allow non-admin users to navigate to dashboard page without forced redirect.
- Deliverables:
  - Remove non-admin redirect from `goPage('dashboard')`
  - Update CTA/nav visibility rules aligned with new access policy
- Dependencies: None
- Files:
  - `backend/static/js/test-results-dashboard.js`
  - `backend/static/js/core.js`
  - `backend/templates/base.html`
- Done when:
  - Logged-in non-admin can open `/dashboard` from UI navigation.
- Notes: Removed client-side admin redirect guard and exposed dashboard nav link to authenticated users.

### CJA-402 - Open dashboard data API to target audience with safety controls
- Priority: P0
- Owner: Backend
- Status: DONE
- Description: Change `/api/submissions` access policy from admin-only to agreed audience while preserving sensitive operations as admin-only.
- Deliverables:
  - Update dependency from `get_admin_user` to chosen policy gate
  - Keep destructive/admin endpoints restricted
  - Return sanitized fields if non-admin access requires privacy guard
- Dependencies: CJA-401
- Files:
  - `backend/main.py`
  - `backend/static/js/test-results-dashboard.js`
- Done when:
  - Dashboard data loads for permitted non-admin users without exposing protected admin actions.
- Notes: Changed `/api/submissions` to authenticated-user access and added server-side PII masking for non-admin responses in `backend/main.py`.

### CJA-501 - Regression and role-based QA evidence
- Priority: P1
- Owner: QA
- Status: DONE
- Description: Validate AI scope, journey navigation, chunk controls, and dashboard permissions across guest/user/admin roles.
- Deliverables:
  - Manual test matrix and pass/fail evidence
  - Notes for residual risks
  - QA report in `docs/reports/`
- Dependencies: CJA-102, CJA-201, CJA-302, CJA-402
- Done when:
  - QA report committed and all critical regressions addressed.
- Notes: QA report completed at `docs/reports/CORE_JOURNEY_ALIGNMENT_QA_2026-02-20.md` with role matrix and syntax/test evidence.

## Suggested Sprint Order
1. CJA-101
2. CJA-102
3. CJA-201
4. CJA-301
5. CJA-302
6. CJA-401
7. CJA-402
8. CJA-103
9. CJA-501
