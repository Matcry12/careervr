# Community QA Report

Date: 2026-02-18  
Scope: `COM-QA-01` smoke tests for community flows after COM-201/202/203/104 rollout

## Overall
- Static/syntax checks: `PASS`
- Runtime in-process smoke (TestClient): `BLOCKED` in this environment

## 1) Syntax/Compile

1. `python -m py_compile backend/main.py backend/database.py`
- Result: `PASS`

2. `node --check backend/static/js/core.js`
3. `node --check backend/static/js/chat.js`
4. `node --check backend/static/js/community-profile.js`
5. `node --check backend/static/js/test-results-dashboard.js`
6. `node --check backend/static/js/vr.js`
- Result: `PASS`

## 2) Runtime Smoke Attempt (Community APIs)

Target flows attempted in one script:
- create post
- add comment
- toggle like
- mark helpful comment
- report post/comment
- pin post (admin)
- fetch posts/metrics/suggestions/reports

Result:
- `BLOCKED` due environment execution hang/timeouts under FastAPI TestClient path in this container.
- Observed earlier DNS restriction path for Mongo SRV lookup (`Operation not permitted`) and subsequent test-run timeout.
- Forced local mode with `MONGODB_URI=''` and hard timeout still timed out in this session.

## 3) Risk Assessment

- Code-level risk: `LOW-MEDIUM` (syntax and wiring checks pass).
- Runtime risk: `MEDIUM` until browser/API smoke is executed in a normal runtime environment.

## 4) Required Manual Smoke (to close COM-QA-01)

1. Community page:
- create post with title/category
- search/filter/sort
- add comment

2. Engagement/moderation:
- like post
- mark comment helpful (post owner only)
- report post/comment

3. Admin features:
- pin/unpin post
- admin reports list visibility
- metrics widget updates

4. Cross-page:
- suggestions visible in Results and Chat pages
- trust badges show for admin/mentor authors

## 5) Evidence Files

- `backend/main.py`
- `backend/database.py`
- `backend/static/js/community-profile.js`
- `backend/static/js/core.js`
- `backend/static/js/chat.js`
- `backend/static/js/test-results-dashboard.js`
- `backend/templates/community.html`
- `backend/templates/results.html`
- `backend/templates/chatbot.html`

