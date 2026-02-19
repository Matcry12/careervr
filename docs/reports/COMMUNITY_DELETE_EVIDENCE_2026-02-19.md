# Community Delete Evidence Report (2026-02-19)

Scope: DEL-001 evidence capture for current local project state.

## 1) Data snapshot findings

### Posts (`backend/data/posts.json`)
- Total posts: 4
- Key ownership samples:
  - `id=1a89c619-5443-43c9-9dae-616bfff5bb1a`
    - `author=Nguyen anh triet`
    - `author_username=matcry`
    - `owner_actor=user:matcry`
  - `id=qa_db_local_post`
    - `author=a`
    - `author_username=None`
    - `owner_actor=author:a`
  - `id=post_1`
    - `author=Lê Văn A`
    - `author_username=None`
    - `owner_actor=author:l_v_n_a`

### Users (`backend/data/users.json`)
- `matcry` exists with role `admin`.
- Multiple test/admin users exist from prior QA runs.

## 2) Preliminary interpretation
- At least one target post (`1a89...`) is correctly bound to `user:matcry`; this post should be deletable when logged in as `matcry`.
- Legacy posts with `owner_actor=author:*` and no `author_username` can cause ownership mismatch for authenticated users depending on identity mapping.

## 3) Instrumentation added (DEL-002)

### Backend
- Added delete decision logging in `DELETE /api/community/posts/{post_id}`:
  - denied reason with actor/owner context
  - allowed reason with actor/role context
- Added `can_delete_reason` field on post response model for UI/debug visibility.

### Frontend
- Added optional delete debug logging hooks in community page logic.
- Runtime toggle:
  - Open browser console and run: `setCommunityDeleteDebug(true)`

## 4) What to capture from your failing session (next step)
When delete fails in your browser:
1. In console run `setCommunityDeleteDebug(true)`.
2. Retry delete (2 clicks for confirm).
3. Send me:
   - console lines beginning with `[community-delete]`
   - Network response body for delete request
   - HTTP status code

This will identify whether failure is caused by:
- auth/actor mismatch
- backend permission rejection
- data ownership mismatch
- write persistence failure

## 5) DEL-004 utility delivered

### Database utility
- Added `db.repair_post_ownership(dry_run=True|False, limit=N)`:
  - dry-run summary without writes
  - optional apply mode for repairing legacy ownership fields

### Admin API endpoint
- `POST /api/community/admin/repair-ownership` (admin only)
- Request body:
```json
{ "dry_run": true, "limit": 5000 }
```
- Response includes:
  - `scanned`, `candidates`, `updated`
  - reason counters
  - sample before/after patches
