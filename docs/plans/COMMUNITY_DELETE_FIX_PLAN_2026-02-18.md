# Community Delete Flow Fix Plan (2026-02-18)

## 1) Problem Statement
Current issues reported:
- Cannot delete posts reliably (delete action fails or appears unavailable).
- Delete action is not accessible directly from post summary cards.
- Current UX requires opening detail modal before deleting, which adds friction.

## 2) Goals
- Make delete action work consistently for authorized users.
- Show delete control directly on post summary cards.
- Remove popup-based delete confirmation for this flow.
- Keep permission and security rules unchanged:
  - Admin can delete any post.
  - Post owner can delete own post.
  - Other users cannot delete.

## 3) Suspected Root Causes to Verify

### Backend / API
- Actor identity mismatch (`actor_id` from frontend vs `owner_actor` stored in post).
- Permission check branch rejects legitimate owner due to normalization differences.
- Delete request body parsing/validation mismatch for `DELETE` payload.
- Data persistence branch (Mongo/local file) deletes incorrectly or fails silently.

### Frontend
- `canDelete` computed only in detail rendering, not summary rendering.
- Summary card lacks delete button wiring.
- Delete function depends on modal state (`COMMUNITY_DELETE_TARGET`) and fails when called outside modal flow.
- Error status not surfaced clearly in summary context.

## 4) Implementation Plan

### Phase A: Diagnose and reproduce
1. Reproduce with 3 roles:
   - owner user
   - non-owner user
   - admin
2. Capture request/response for `DELETE /api/community/posts/{post_id}`.
3. Log and compare:
   - request `actor_id`
   - post `owner_actor`
   - resolved current user role
4. Confirm DB delete behavior in both local JSON and Mongo modes (if available).

### Phase B: Backend hardening
1. Normalize and centralize permission comparison for delete:
   - canonical actor format for both request and stored owner.
2. Return explicit error reasons:
   - `403`: unauthorized delete
   - `404`: post not found
   - `400`: invalid actor payload
3. Ensure delete result handling is strict:
   - fail fast if persistence fails
   - no false success response

### Phase C: Frontend UX change (no popup)
1. Add delete button to post summary card actions.
2. Remove popup dependency for deleting from summary.
3. Replace modal confirmation with inline safe-confirm pattern:
   - first click: switch button to `Xác nhận xoá` (short timeout, e.g. 4-6s)
   - second click: execute delete
   - timeout reset returns button to normal
4. Keep one shared delete function that accepts `postId` directly.
5. Show clear status near summary feed after success/failure.
6. After delete success:
   - refresh current page
   - if page becomes empty and not first page, go previous page automatically

### Phase D: Consistency update
1. Keep detail view delete action optional:
   - either remove it to avoid duplicate entry points, or keep both but use same logic.
2. Ensure role-based visibility is identical in summary and detail.

## 5) QA / Test Plan

### Functional matrix
- Owner deletes own post from summary: success.
- Non-owner tries delete: button hidden or API returns 403.
- Admin deletes any post from summary: success.
- Delete on paginated last item of current page: auto fallback to previous page.
- Delete while filters/search active: state preserved after refresh.

### Regression checks
- Like, comment, report, pin remain functional.
- Detail modal still opens and renders correctly.
- No JS errors on Community page load.

## 6) Acceptance Criteria
- Delete button visible on summary cards for authorized users.
- Delete works without opening detail modal and without popup modal.
- Permission enforcement remains correct.
- No regression on community core flows.

## 7) Deliverables
- Code updates:
  - `backend/static/js/community-profile.js`
  - `backend/templates/community.html`
  - `backend/main.py` and/or `backend/database.py` (if permission/delete fix needed)
  - `backend/static/style.css`
- QA report update under `docs/reports/`.
- Task + Kanban updates after implementation.

## 8) Execution Order
1. Phase A (diagnose)
2. Phase B (backend fix if needed)
3. Phase C (summary delete UX)
4. Phase D (consistency)
5. QA + docs updates
