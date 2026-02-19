# Community Role & Moderation QA

Date: 2026-02-18  
Scope: `COM-QA-02` (Admin/User permission behavior for community moderation features)

## Summary
- Security hardening patch applied to bind actor identity and remove client-side role spoof path.
- Sensitive moderation route (`mark helpful`) now requires authenticated identity.
- Result: `COM-QA-02` can be closed at code-verification level.

Status: `DONE` (code-level), runtime smoke still depends on `COM-QA-01` environment unblock

## Method
- Static policy verification from backend route guards and business checks:
  - `backend/main.py`
  - `backend/database.py`
- UI control visibility check from:
  - `backend/static/js/community-profile.js`
  - `backend/static/style.css`

## Permission Matrix (After Patch)

1. `GET /api/community/posts`
- Expected: public read
- Actual: public read
- Result: PASS

2. `POST /api/community/posts`
- Expected: allowed for users/guests
- Actual: authenticated users are server-bound to `user:<username>`; guests cannot claim `user:*`
- Result: PASS

3. `POST /api/community/posts/{post_id}/comments`
- Expected: allowed for users/guests
- Actual: same actor-binding rule as post creation; role derived from authenticated username only
- Result: PASS

4. `POST /api/community/posts/{post_id}/like`
- Expected: users/guests can react, per-actor toggle
- Actual: authenticated users cannot spoof actor; guests cannot claim `user:*`
- Result: PASS

5. `POST /api/community/posts/{post_id}/comments/{comment_id}/helpful`
- Expected: only post owner can mark helpful
- Actual: route requires authenticated user; actor is server-bound from JWT identity
- Result: PASS

6. `POST /api/community/posts/{post_id}/report`
- Expected: user report allowed, abuse-resistant
- Actual: actor binding enforced (auth-bound when token exists, no `user:*` spoof as guest)
- Result: PASS

7. `POST /api/community/posts/{post_id}/comments/{comment_id}/report`
- Expected: user report allowed, abuse-resistant
- Actual: same actor-binding enforcement as post reporting
- Result: PASS

8. `GET /api/community/reports`
- Expected: admin-only
- Actual: protected by `Depends(get_admin_user)`
- Result: PASS

9. `POST /api/community/posts/{post_id}/pin`
- Expected: admin-only
- Actual: protected by `Depends(get_admin_user)`
- Result: PASS

## Patch Implemented

1. Added optional auth resolver and server-side actor binding:
- `get_optional_current_user(...)`
- `resolve_bound_actor_id(...)`

2. Updated community endpoints to enforce actor binding:
- create post/comment
- like
- report post/comment
- mark helpful (auth required)

3. Hardened trust badge derivation:
- role now derived from `author_username` (server-controlled), not free-form actor strings.
- suggestion endpoint also uses verified username role only.

4. Added migration defaults for new server-bound identity fields:
- `author_username` on posts/comments in normalization path.

## Residual Risk
- Report spam control (rate limiting/cooldown) is still recommended enhancement.
- Admin report status transitions are still optional future improvement.
