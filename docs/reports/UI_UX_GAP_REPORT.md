# UI/UX Gap Report (Plan vs Current Code)

Date: 2026-02-16  
Scope compared:
- `docs/plans/UI_UX_PLAN.md`
- `docs/tasks/UI_UX_TASKS.md`
- `docs/kanban/UI_UX_KANBAN.md`
- active runtime implementation in `backend/templates/*`, `backend/static/style.css`, `backend/static/script.js`

## Executive Summary
The UI/UX planning artifacts currently overstate completion. The board marks all UI/UX items `DONE`, but the active frontend still runs a mixed legacy implementation with significant gaps:
- Mobile nav toggle behavior is not wired in the active JS.
- Alert/confirm-heavy flows are still present across auth, test, chat, community, VR, and profile.
- Many templates and JS-rendered blocks still use inline styles, contrary to the class-driven contract.
- The active script path is monolithic (`/static/script.js`) while modular files (`/static/js/*.js`) are present but not loaded.

## Key Evidence
1. Active JS loader is still monolithic:
- `backend/templates/base.html:63` loads `/static/script.js`.
- No template currently loads `/static/js/*` modules.

2. Alert/confirm patterns remain widespread:
- `backend/static/script.js:101`, `backend/static/script.js:130`, `backend/static/script.js:420`, `backend/static/script.js:570`, `backend/static/script.js:1146`, `backend/static/script.js:1364`, `backend/static/script.js:1881` (and many more).

3. Inline styles remain common in templates:
- `backend/templates/vr.html:12`, `backend/templates/vr.html:61`
- `backend/templates/results.html:9`, `backend/templates/results.html:18`
- `backend/templates/dashboard.html:7`, `backend/templates/dashboard.html:19`
- `backend/templates/login.html:8`, `backend/templates/signup.html:8`

4. Legacy/duplicated VR logic still dominates active script:
- VR function block still embedded in `backend/static/script.js:1406` onward.
- UI rendering in this block still injects heavy inline styles.

## Corrected Ticket Status (Reality Check)

## Milestone U0
- `UX-0001` Create page-by-page UX spec: `DONE`
- `UX-0002` Define component style contract: `PARTIAL`
  - Contract exists in docs and CSS utilities, but implementation is not consistently following it.

## Milestone U1
- `UX-1001` Responsive header/nav redesign: `PARTIAL`
  - CSS for toggle exists, but active JS wiring for nav toggle behavior is missing in `/static/script.js` runtime path.
- `UX-1002` Global typography and spacing normalization: `PARTIAL`
  - Base typography improved, but many pages still rely on ad-hoc inline styles.
- `UX-1003` Accessibility baseline pass: `PARTIAL`
  - Some focus/modal improvements exist, but alert-driven flows and inconsistent keyboard semantics remain.

## Milestone U2
- `UX-2001` Test page fatigue reduction: `PARTIAL`
  - Progress context exists, but validation UX still includes blocking alert usage.
- `UX-2002` Results hierarchy and interaction polish: `PARTIAL`
  - Visual structure improved somewhat, but card rendering still uses inline styling and lacks clean interaction contract consistency.
- `UX-2003` Chatbot conversation UX improvements: `PARTIAL`
  - Chat shell exists, but errors still surface raw technical messages (e.g., `HTTP xxx`) and alert flows remain.
- `UX-2004` VR recommendation emphasis cleanup: `PARTIAL`
  - Recommendation emphasis exists, but rendering still mixes inline markup styles and duplicated logic.

## Milestone U3
- `UX-3001` Teacher import panel redesign: `PARTIAL`
  - Panel is present in `vr.html`, but implementation quality is mixed due legacy JS overlap.
- `UX-3002` Import feedback and error rendering improvements: `PARTIAL`
  - Status blocks exist, but broader flow still contains legacy alert patterns and inconsistent UX behavior.
- `UX-3003` Dashboard readability pass: `PARTIAL`
  - Card structure exists; hierarchy/clarity still inconsistent and partly inline.

## Milestone U4
- `UX-4001` Auth forms inline validation messaging: `PARTIAL`
  - Field error containers exist in templates, but active login/register handlers still rely on blocking alerts for key outcomes.
- `UX-4002` Profile save feedback and lock behavior refinement: `MISSING`
  - Profile save still uses blocking alerts (`backend/static/script.js:1881`, `backend/static/script.js:1896`).

## Milestone U5
- `UX-5001` Responsive regression test pass: `NOT_VERIFIED / SHOULD BE REOPENED`
- `UX-5002` Accessibility smoke checks: `NOT_VERIFIED / SHOULD BE REOPENED`
- `UX-5003` Docs updated for UX changes: `DONE` (docs exist), but they do not reflect true runtime quality.

## Why the Board Is Inaccurate
1. Documentation status moved to `DONE` before runtime consolidation was complete.
2. Old and new frontend approaches coexist in the same active script, causing regressions and inconsistent behavior.
3. QA report reflects smoke-level checks, but current runtime evidence shows unresolved gaps in core acceptance criteria.

## Recommended Immediate Board Update
1. Move all `PARTIAL` and `MISSING` items out of `DONE` in `docs/tasks/UI_UX_TASKS.md` and `docs/kanban/UI_UX_KANBAN.md`.
2. Reopen `UX-5001` and `UX-5002` until post-fix verification is complete.
3. Add one stabilization ticket:
- `UX-9001` Frontend runtime consolidation
  - Remove/retire legacy code paths in `backend/static/script.js`
  - Enforce one JS architecture path (either modular `/static/js/*` or cleaned monolith)
  - Eliminate inline-style HTML generation in JS for key flows

## Suggested Next Execution Order
1. Consolidate JS runtime path and remove duplicate/legacy logic.
2. Replace alert/confirm flows with inline status components across auth/test/chat/community/profile/VR.
3. Finish inline-style cleanup in templates and dynamic renderers.
4. Re-run responsive and accessibility smoke checks, then update ticket statuses with evidence.
