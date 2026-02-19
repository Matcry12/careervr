# UI/UX Pre-Coding To-Do Board

Date: 2026-02-16
Source: `docs/plans/UI_UX_DESIGN_MISSING_PLAN.md`
Status legend: `TODO` | `IN_PROGRESS` | `DONE` | `BLOCKED`

## Sprint Goal
Reduce user confusion in core journey and make admin import actions clearly visible/confirmable before deeper visual polish.

## P0 - Must Fix First

### TODO UXD-001 - User Journey Stepper + Next Action Blocks
- Status: `DONE`
- Priority: `P0`
- Scope:
  - Add journey stepper (Test -> Results -> VR -> Chat) on authenticated pages.
  - Add "Next action" CTA block on Test, Results, VR, Chat.
- Acceptance:
  - User can identify where they are and what to do next in <5 seconds.

### TODO UXD-002 - Role-aware CTA/Guardrails (Landing + Dashboard)
- Status: `DONE`
- Priority: `P0`
- Scope:
  - Landing secondary CTA must not send non-admin users into surprise denial.
  - Add guardrails/alt CTA for non-admin.
- Acceptance:
  - Non-admin user is never surprised by access denial from promoted CTA.

### TODO UXD-003 - Chat Session Model Simplification
- Status: `DONE`
- Priority: `P0`
- Scope:
  - Lock free text input until consultation session starts.
  - Show one clear session state banner and one loading pattern.
- Acceptance:
  - First-time user understands how to start and whether session is active.

### TODO UXD-004 - VR Admin Workflow Split + Empty States
- Status: `DONE`
- Priority: `P0`
- Scope:
  - Split VR admin tools into clearer groups (`Thêm thủ công` / `Import Excel`).
  - Add explicit empty-state content when no jobs exist.
- Acceptance:
  - Admin actions are discoverable; empty VR list is understandable.

### TODO UXD-004A - Import Visibility and Confirmation UX
- Status: `DONE`
- Priority: `P0`
- Scope:
  - Show selected filename immediately after choosing file.
  - Disable `Import` until valid file is selected.
  - Show `Đang import...` state and success summary with counts.
  - Keep `Lần import gần nhất` block with timestamp and result.
- Acceptance:
  - User always knows: file selected, import running, import success/failure.

## P1 - Flow Quality

### TODO UXD-005 - Test Chunking + Autosave Feedback
- Status: `DONE`
- Priority: `P1`
- Scope:
  - Break 50 questions into sections.
  - Add autosave indicator (`Đã lưu lúc...`) and resume hint.
- Acceptance:
  - Long test feels manageable and recoverable.

### TODO UXD-006 - Results Card Action Clarity
- Status: `DONE`
- Priority: `P1`
- Scope:
  - Add explicit action button per recommended card (`Xem mô phỏng nghề`).
  - Add explanation for Priority vs Backup.
- Acceptance:
  - Users understand list meaning and can act without guessing.

### TODO UXD-007 - Community Sorting + Identity Clarity
- Status: `DONE`
- Priority: `P1`
- Scope:
  - Add sort controls (`Mới nhất`, `Nhiều bình luận`).
  - Explain why author field is locked when logged in.
- Acceptance:
  - Posting and reading order behavior is explicit.

### TODO UXD-008 - Auth Form Usability Upgrade
- Status: `DONE`
- Priority: `P1`
- Scope:
  - Show password requirements before submit.
  - Add show/hide password control.
- Acceptance:
  - Fewer avoidable auth input errors.

## P2 - Trust/Polish

### TODO UXD-009 - Dashboard Insights + Safe Destructive UX
- Status: `DONE`
- Priority: `P2`
- Scope:
  - Add top summary insight cards.
  - Convert clear-data into safer 2-step confirm flow.
- Acceptance:
  - Dashboard can be read quickly and dangerous actions are safer.

### TODO UXD-010 - Profile Dirty-State + Save Confirmation Quality
- Status: `DONE`
- Priority: `P2`
- Scope:
  - Warn on unsaved changes before leaving.
  - Improve persistent save confirmation.
- Acceptance:
  - Users don’t accidentally lose profile edits.

## Suggested Execution Order
1. UXD-004A
2. UXD-002
3. UXD-003
4. UXD-004
5. UXD-001
6. UXD-005
7. UXD-006
8. UXD-007
9. UXD-008
10. UXD-009
11. UXD-010

## Definition of Ready (Before Coding)
1. Each task has target files listed.
2. Each task has UI states listed (empty/loading/success/error).
3. Each task has manual test cases for student + admin roles.
