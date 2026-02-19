# Community Recovery + UI Remake Tasks (2026-02-18)

Source plans:
- `docs/plans/COMMUNITY_DELETE_RECOVERY_PLAN_2026-02-18.md`
- `docs/plans/COMMUNITY_UI_REMAKE_PLAN_2026-02-18.md`

Status legend:
- `TODO`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`

---

## Stream A: Delete Recovery (Critical)

### DEL-001 - Reproduce delete failure with evidence capture
- Status: `DONE`
- Priority: `P0`
- Owner: Backend + Frontend
- Scope:
  - Reproduce with owner/admin/non-owner roles.
  - Capture request payload, response status/detail, actor identity, target post metadata.
- Acceptance:
  - One clear failing case documented with exact API response.

### DEL-002 - Add temporary debug instrumentation for delete path
- Status: `DONE`
- Priority: `P0`
- Owner: Backend + Frontend
- Depends on: DEL-001
- Scope:
  - Add DEV-safe logs for delete request actor, post ownership fields, decision outcome.
  - Add frontend console/debug hooks for delete state machine transitions.
- Acceptance:
  - Debug output can explain why each delete attempt is allowed/denied.

### DEL-003 - Canonicalize delete permission helper (single source of truth)
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: DEL-002
- Scope:
  - Implement shared helper used by both post listing (`can_delete`) and delete endpoint.
  - Ensure deterministic policy: admin OR owner.
- Acceptance:
  - No logic drift between UI visibility and backend enforcement.

### DEL-004 - Legacy ownership data repair utility
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: DEL-003
- Scope:
  - Add repair routine for posts missing/inconsistent ownership metadata.
  - Provide dry-run summary before applying.
- Acceptance:
  - Legacy posts become deletable by legitimate owner/admin under current policy.

### DEL-005 - Stabilize frontend delete state machine
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: DEL-003
- Scope:
  - Enforce deterministic states: `idle -> armed -> deleting -> idle`.
  - Disable delete button while request is in flight.
  - Clear state on 403/404/network failure.
- Acceptance:
  - No stuck confirm buttons; no duplicate delete requests.

### DEL-006 - Add per-post delete feedback slot
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: DEL-005
- Scope:
  - Show clear post-level success/error state near delete action.
  - Keep global status for summary.
- Acceptance:
  - User always sees specific reason when delete fails.

### DEL-QA-01 - Delete authorization matrix QA
- Status: `TODO`
- Priority: `P0`
- Owner: QA
- Depends on: DEL-004, DEL-005, DEL-006
- Scope:
  - Verify owner/admin/non-owner behavior, unknown id, legacy post variants.
- Acceptance:
  - Full matrix passes with expected HTTP status and UI behavior.

---

## Stream B: Community UI Remake (Simple + Pretty)

### UIR-001 - IA simplification and section re-order
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Scope:
  - Reorder Community page flow to: Discover -> Create -> Feed -> Admin.
  - Remove or compress low-value helper text.
- Acceptance:
  - New user can understand page structure in one scroll.

### UIR-002 - Visual token cleanup (spacing, buttons, card consistency)
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIR-001
- Scope:
  - Standardize card/button/status styles and spacing rhythm.
  - Improve hierarchy and reduce visual noise.
- Acceptance:
  - Visual consistency across all community blocks.

### UIR-003 - Discover toolbar compaction
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIR-001
- Scope:
  - Compact search/filter/sort in one clean toolbar.
  - Keep RAG as secondary tab with persistent mode state.
- Acceptance:
  - Discover controls are clear and non-cluttered.

### UIR-004 - Feed action hierarchy cleanup
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIR-002
- Scope:
  - Keep primary actions on summary.
  - Move secondary actions to detail where needed.
  - Align action ordering and labels.
- Acceptance:
  - Users can scan and act quickly without confusion.

### UIR-005 - Unified feedback system (loading, empty, error, success)
- Status: `TODO`
- Priority: `P1`
- Owner: Frontend
- Depends on: UIR-002
- Scope:
  - Normalize status placement and wording.
  - Ensure action confirmations are obvious and short-lived.
- Acceptance:
  - Every key action has clear feedback.

### UIR-006 - Mobile and accessibility hardening
- Status: `TODO`
- Priority: `P0`
- Owner: Frontend + QA
- Depends on: UIR-003, UIR-004, UIR-005
- Scope:
  - Keyboard navigation, ARIA review, touch target sizing.
  - Mobile layout pass for feed/detail/composer/discover.
- Acceptance:
  - Usable and readable on mobile and keyboard-only flow.

### UIR-QA-01 - End-to-end UX regression pass
- Status: `TODO`
- Priority: `P0`
- Owner: QA
- Depends on: UIR-006, DEL-QA-01
- Scope:
  - Full journey regression: discover, create, delete, detail, comment, report, pagination.
- Acceptance:
  - No critical regressions in Community core flows.

---

## Recommended Execution Order
1. DEL-001 -> DEL-002 -> DEL-003
2. DEL-004 + DEL-005 -> DEL-006 -> DEL-QA-01
3. UIR-001 -> UIR-002 -> UIR-003 -> UIR-004 -> UIR-005 -> UIR-006
4. UIR-QA-01
