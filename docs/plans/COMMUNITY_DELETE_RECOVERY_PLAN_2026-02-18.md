# Community Delete Recovery Plan (2026-02-18)

## Objective
Fix post deletion reliably for all valid roles (owner/admin) without introducing regressions.

## Current Symptom
- User still cannot delete posts from Community page.
- Failure persists after prior UI and permission updates.

## Success Criteria
- Owner can delete own post in <= 2 clicks.
- Admin can delete any post.
- Non-owner non-admin cannot delete (403) and button is hidden.
- Delete works for both old posts (legacy ownership data) and new posts.
- No regression in like/comment/report/pagination/detail flows.

## Phase 0 - Triage Snapshot (Must do first)
1. Capture failing scenario details:
- Account username
- Account role
- Whether user is logged in at failure time
- Target post id/title
- Whether target post was created before or after latest code update
2. Capture runtime values in browser console at failure:
- `currentUser`
- `token` present/absent
- `getCommunityActorId()` value
3. Capture network request for delete:
- Endpoint URL
- Request payload (`actor_id`)
- Response status and response JSON detail

## Phase 1 - Root Cause Isolation

### Track A: Frontend identity + payload
Check:
- Is `requestDeletePost(postId)` firing?
- Is second click sending request?
- Is delete request including correct `actor_id`?
- Is stale page state showing button for non-deletable post?

Expected failure patterns:
- `actor_id` is guest while user is authenticated.
- Double-click confirm timer resets unexpectedly.
- Wrong `postId` bound to button.

### Track B: Backend authorization
Check delete endpoint logic with actual failing payload:
- actor parsed from token + body as expected
- ownership resolution order:
  1) `owner_actor`
  2) `author_username`
  3) normalized `author`
- role override for admin

Expected failure patterns:
- legacy post has mismatched `owner_actor` and blank `author_username`
- normalized author fallback does not match username-based actor
- authenticated user mismatch because token user != provided actor

### Track C: Persistence layer
Check `db.delete_post(post_id)` result:
- local mode: JSON save success and file writable
- mongo mode: delete count > 0
- no silent write failures

Expected failure patterns:
- post id exists in UI but not in DB after filtering/sync mismatch
- write disabled/degraded path
- file write race or stale data reload

## Phase 2 - Hard Fix Design

### 2.1 Canonical ownership model (data repair)
- Add migration/repair routine for posts:
  - ensure `owner_actor` exists and is canonical
  - backfill `author_username` where possible
- Add admin script endpoint/utility to repair legacy records safely.

### 2.2 Authorization strictness with deterministic rule
Define single rule used by both GET (visibility) and DELETE (enforcement):
- `can_delete = is_admin OR is_owner_by_actor OR is_owner_by_username`
- Remove fragile fallback by display name for secured paths (use only as temporary migration helper).

### 2.3 Frontend delete UX stabilization
- Keep inline 2-step confirm.
- Add deterministic state machine:
  - idle -> armed(postId) -> deleting(postId) -> idle
- Disable button while deleting.
- Show inline status near specific post and global status.
- If API returns 403/404, clear armed state and show message.

## Phase 3 - Implementation Tasks
1. Add debug logging guard (DEV only) for delete request + auth decision.
2. Add backend helper `resolve_post_delete_permission(post, actor, current_user)` and use it in both list and delete APIs.
3. Add migration utility `repair_post_ownership()` for legacy posts.
4. Update frontend delete controller to explicit state machine and button disable handling.
5. Add post-level status slot on summary card for clear per-item error/success.
6. Add automated API tests for delete authorization matrix.

## Phase 4 - Test Plan (Mandatory)

### API matrix
- owner delete own post -> 200
- admin delete any post -> 200
- other user delete -> 403
- missing actor guest delete own guest post -> 200 (if same guest actor)
- unknown post id -> 404

### UI matrix
- first click arms confirm label
- second click sends one request only
- button disabled during request
- on success, post disappears without full-page failure
- on failure, status explains exact reason and user can retry

### Legacy data matrix
- old post missing `owner_actor`
- old post missing `author_username`
- old post with inconsistent actor format

## Phase 5 - Rollout and Safety
1. Release behind temporary feature flag if needed (`COMMUNITY_DELETE_V2`).
2. Run migration dry-run report first, then apply.
3. Keep audit log of deleted post ids + actor for 7 days.
4. Prepare rollback: keep previous endpoint behavior available for one deploy window.

## Deliverables
- Fix PR with backend+frontend delete flow
- Migration/repair script and report
- QA report with matrix results
- Updated docs/tasks/kanban
