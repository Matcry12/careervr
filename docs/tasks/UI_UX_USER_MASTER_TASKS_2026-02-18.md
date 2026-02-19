# UI/UX User Master Task Board

Date: 2026-02-18
Source: `docs/plans/UI_UX_USER_PERSPECTIVE_MASTER_PLAN_2026-02-18.md`
Status: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`
Priority: `P0` critical | `P1` high | `P2` medium

---

## Phase A - Clarity Foundation
Goal: remove confusion and increase user confidence in core flow.

### UXM-001 - Journey continuity bar across core pages
- Status: `DONE`
- Priority: `P0`
- Depends on: none
- Note:
  - Unified 5-step journey (including Community) across `test`, `results`, `vr`, `chatbot`, and `community` pages.

### UXM-002 - Global action feedback contract
- Status: `DONE`
- Priority: `P0`
- Depends on: none
- Note:
  - Added shared error-normalization helpers in `backend/static/js/core.js` and applied them across `chat`, `vr`, and `community` action flows for consistent loading/success/error messaging.

### UXM-003 - Primary CTA hierarchy cleanup
- Status: `DONE`
- Priority: `P0`
- Depends on: UXM-001
- Note:
  - Standardized journey panels to one clear primary CTA + one secondary CTA across `test`, `results`, `vr`, `chatbot`, and `community`.

### UXM-004 - Save/autosave confidence layer
- Status: `DONE`
- Priority: `P0`
- Depends on: UXM-002
- Note:
  - Added community composer draft autosave/restore/clear with visible save status (`communityDraftSaveStatus`) and one-time community binding initialization.

---

## Phase B - Experience Depth
Goal: stronger guidance and clearer value per page.

### UXM-101 - Results storytelling and guidance
- Status: `DONE`
- Priority: `P1`
- Depends on: UXM-003
- Note:
  - Added dynamic results narrative block (`hồ sơ`, `vì sao phù hợp`, `nên làm gì tiếp theo`) driven by RIASEC scores + recommendation priority list.

### UXM-102 - VR discoverability and admin separation
- Status: `DONE`
- Priority: `P1`
- Depends on: UXM-003
- Note:
  - Added student-facing VR browse panel (search + RIASEC filter + recommended-only filter + summary count) and strengthened admin management visual separation in VR page.

### UXM-103 - Community clarity refinement
- Status: `DONE`
- Priority: `P1`
- Depends on: UXM-003
- Note:
  - Added section map/navigation, clearer discover-create-feed separation, feed summary + stronger empty-state CTAs, improved post action grouping/readability, and clearer admin moderation boundary messaging.

### UXM-104 - Chatbot session UX states
- Status: `DONE`
- Priority: `P1`
- Depends on: UXM-002
- Note:
  - Added explicit chat session states (`no_data`, `idle`, `starting`, `active`, `sending`, `error`) with visual state pill, improved banners, and RIASEC-based starter prompts that auto-fill/send contextually.

---

## Phase C - Polish and Trust
Goal: improve perceived quality and competition-readiness.

### UXM-201 - Accessibility polish pass
- Status: `DONE`
- Priority: `P2`
- Depends on: UXM-101, UXM-102, UXM-103, UXM-104
- Note:
  - Added skip-link + main landmark, `aria-current` navigation semantics, missing labels for VR/chat inputs, progressbar semantics on Test page, log/status ARIA improvements, and modal `aria-hidden` state synchronization for results/VR/community/dashboard overlays.

### UXM-202 - Performance perception pass
- Status: `DONE`
- Priority: `P2`
- Depends on: UXM-101, UXM-102, UXM-103, UXM-104
- Note:
  - Added skeleton-loading states for community suggestions/feed and VR grid, plus layout-stability min-heights and async busy-state signaling for smoother perceived responsiveness.

### UXM-203 - Content voice consistency
- Status: `DONE`
- Priority: `P2`
- Depends on: UXM-101, UXM-102, UXM-103, UXM-104
- Note:
  - Unified mixed-language labels/statuses into consistent professional Vietnamese across navigation, test loading, VR management/import actions, and community citation wording.

---

## QA and Documentation

### UXM-QA-01 - Core flow UX regression
- Status: `DONE`
- Priority: `P0`
- Depends on: Phase A, Phase B
- Note:
  - Executed core-flow source/deterministic QA and published report: `docs/reports/UI_UX_USER_MASTER_QA_2026-02-18.md` (includes limitations and follow-up for browser/manual + pytest harness import fix).

### UXM-QA-02 - Accessibility and mobile smoke
- Status: `DONE`
- Priority: `P1`
- Depends on: UXM-201
- Note:
  - Completed source-level a11y/mobile smoke and published report: `docs/reports/UI_UX_USER_MASTER_A11Y_MOBILE_QA_2026-02-18.md` (with manual device/browser follow-up items).

### UXM-DOC-01 - Before/after UX evidence package
- Status: `DONE`
- Priority: `P1`
- Depends on: UXM-QA-01, UXM-QA-02
- Note:
  - Published master before/after evidence package: `docs/reports/UI_UX_USER_MASTER_BEFORE_AFTER_2026-02-18.md`.

---

## Suggested Execution Order
1. UXM-001
2. UXM-002
3. UXM-003
4. UXM-004
5. UXM-101
6. UXM-102
7. UXM-103
8. UXM-104
9. UXM-201
10. UXM-202
11. UXM-203
12. UXM-QA-01
13. UXM-QA-02
14. UXM-DOC-01
