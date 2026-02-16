# UI/UX Task Board

Status: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`  
Priority: `P0` critical, `P1` high, `P2` medium

---

## Milestone U0 - Baseline and Specifications
Goal: lock UI contract before implementation.

### UX-0001 - Create page-by-page UX spec
- Status: `DONE`
- Priority: `P0`
- Owner: UX/Frontend
- Depends on: none
- Output:
  - wire-level intent for Landing/Test/Results/Chat/VR/Community/Dashboard/Auth/Profile
- Acceptance:
  - each page has clear primary action + empty/error/loading behavior defined

### UX-0002 - Define component style contract
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-0001
- Output:
  - class naming and states for buttons/cards/inputs/badges/status blocks
- Acceptance:
  - approved class contract used by both templates and JS-generated HTML

---

## Milestone U1 - Global UX Foundations
Goal: responsive, consistent, accessible base.

### UX-1001 - Responsive header/nav redesign
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-0002
- Files:
  - `backend/templates/base.html`
  - `backend/static/style.css`
  - `backend/static/js/core.js`
- Acceptance:
  - no nav overflow at <= 768px
  - mobile menu opens/closes accessibly

### UX-1002 - Global typography and spacing normalization
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-0002
- Files:
  - `backend/static/style.css`
- Acceptance:
  - consistent type scale and section spacing on all pages

### UX-1003 - Accessibility baseline pass
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend/QA
- Depends on: UX-1001, UX-1002
- Acceptance:
  - visible focus states
  - keyboard modal close
  - improved contrast for secondary text and badges

---

## Milestone U2 - Core Student Journey
Goal: smoother flow from test -> results -> chat -> VR.

### UX-2001 - Test page fatigue reduction
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-1002
- Files:
  - `backend/templates/test.html`
  - `backend/static/style.css`
  - `backend/static/js/test-results-dashboard.js`
- Acceptance:
  - clearer chunking/sectioning and progress context

### UX-2002 - Results page hierarchy and interaction polish
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-1002
- Files:
  - `backend/templates/results.html`
  - `backend/static/style.css`
  - `backend/static/js/test-results-dashboard.js`
- Acceptance:
  - Priority/Backup are visually distinct and scannable
  - recommendation click affordance is explicit

### UX-2003 - Chatbot conversation UX improvements
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UX-1002
- Files:
  - `backend/templates/chatbot.html`
  - `backend/static/style.css`
  - `backend/static/js/chat.js`
- Acceptance:
  - message bubbles are visually clear by sender
  - errors are user-actionable (not raw HTTP)

### UX-2004 - VR recommendation emphasis cleanup
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UX-2002
- Files:
  - `backend/templates/vr.html`
  - `backend/static/style.css`
  - `backend/static/js/vr.js`
- Acceptance:
  - recommended jobs have consistent badge style
  - card density is balanced and readable

---

## Milestone U3 - Teacher/Admin UX
Goal: clearer operational workflows.

### UX-3001 - Teacher import panel redesign
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-1002
- Files:
  - `backend/templates/vr.html`
  - `backend/static/style.css`
  - `backend/static/js/vr.js`
- Acceptance:
  - download/select/import/error summary shown in one panel

### UX-3002 - Import feedback and error rendering improvements
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: UX-3001
- Acceptance:
  - no alert-only feedback for import outcomes
  - row-level errors readable and grouped

### UX-3003 - Dashboard readability pass
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UX-1002
- Files:
  - `backend/templates/dashboard.html`
  - `backend/static/style.css`
  - `backend/static/js/test-results-dashboard.js`
- Acceptance:
  - chart cards and table have improved visual hierarchy

---

## Milestone U4 - Form Quality and Profile Flow
Goal: reduce friction in auth/profile/community forms.

### UX-4001 - Auth forms inline validation messaging
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UX-1003
- Files:
  - `backend/templates/login.html`
  - `backend/templates/signup.html`
  - `backend/static/js/core.js`
- Acceptance:
  - field-level errors shown inline before submit

### UX-4002 - Profile save feedback and lock behavior refinement
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: UX-1003
- Files:
  - `backend/templates/profile.html`
  - `backend/static/js/community-profile.js`
- Acceptance:
  - non-blocking success/error status shown in page

---

## Milestone U5 - QA, Regression, and Documentation
Goal: stable release with UX validation evidence.

### UX-5001 - Responsive regression test pass
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: U1-U4
- Acceptance:
  - no critical layout breaks on mobile/tablet/desktop

### UX-5002 - Accessibility smoke checks
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: U1-U4
- Acceptance:
  - keyboard navigation and modal behavior pass checklist

### UX-5003 - Update docs with UX behavior changes
- Status: `DONE`
- Priority: `P2`
- Owner: Frontend/Docs
- Depends on: U1-U4
- Files:
  - `README.md`
  - `PROJECT_SUMMARY.md`
- Acceptance:
  - docs describe new UI patterns and admin import flow
