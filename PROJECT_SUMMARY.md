# CareerGo / CareerVR - Project Summary for Future Prompting

## 1. What this project is
CareerGo (`careervr`) is a full-stack web platform for Vietnamese high school career guidance.  
It combines:
- A 50-question RIASEC test
- AI counseling chat (Dify API)
- VR-like job exploration (YouTube video cards)
- Community posts/comments
- Admin analytics dashboard

Main goal: help students discover suitable majors/career directions from RIASEC profile + AI advice.

## 2. Tech stack
- Backend: FastAPI (`backend/main.py`)
- Frontend: Jinja templates + vanilla JS modules (`backend/static/js/*.js`) + CSS (`backend/static/style.css`)
- Auth: JWT + passlib/bcrypt
- Data: MongoDB (preferred) with JSON-file fallback (`backend/database.py`)
- Deployment: Vercel Python function (`api/index.py`, `vercel.json`)

## 3. High-level architecture
- `api/index.py` exposes `backend.main:app` for Vercel.
- `backend/main.py` contains:
  - Page routes (SSR templates)
  - API endpoints (auth, submissions, VR jobs, community, chatbot)
  - Dify integration helpers
  - Conversation session storage (in-memory dict)
- `backend/database.py` abstracts persistence:
  - Uses Mongo when `MONGODB_URI` works
  - Falls back to local JSON in `backend/data/*.json`
- `backend/riasec_calculator.py` handles RIASEC score calculation and base major recommendation logic.

## 4. User flow
1. User registers/logs in (`/api/auth/register`, `/api/auth/token`)
2. User takes RIASEC test at `/test`
3. Frontend computes scores/top-3 codes and:
   - saves local current result (localStorage)
   - posts full submission to backend (`POST /api/submissions`)
   - saves `last_riasec_result` to profile if logged in
4. `/results` page renders:
   - RIASEC radar chart
   - backend-driven recommendations (`/api/recommendations`) with priority/backup grouping
5. `/chatbot`:
   - starts session via `POST /start-conversation`
   - backend recalculates RIASEC, calls Dify, stores conversation in memory
   - follow-up messages use `POST /chat`
6. `/vr-mode`:
   - fetches jobs from `/api/vr-jobs`
   - admin can add/edit/delete VR jobs
   - teacher/admin can download Excel template and import VR jobs with row-level feedback
7. `/dashboard` (admin only):
   - charts and table from `/api/submissions`
8. `/community`:
   - posts/comments through community APIs

## 5. Core API surface
- Auth/Profile
  - `POST /api/auth/register`
  - `POST /api/auth/token`
  - `GET /api/auth/me`
  - `PUT /api/auth/me`
  - `POST /api/user/data`
  - `GET /api/user/data`
- Data
  - `GET /api/vr-jobs`
  - `POST /api/vr-jobs` (admin)
  - `POST /api/submissions`
  - `GET /api/submissions` (admin)
  - `GET /api/health`
- Community
  - `GET /api/community/posts`
  - `POST /api/community/posts`
  - `POST /api/community/posts/{post_id}/comments`
- AI / RIASEC
  - `POST /start-conversation`
  - `POST /chat`
  - `POST /run-riasec` (legacy analyzer endpoint)
- Health/static pages
  - `GET /health`
  - SSR pages: `/`, `/test`, `/results`, `/chatbot`, `/vr-mode`, `/dashboard`, `/community`, `/profile`, `/login`, `/signup`

## 6. Data model (practical)
- Users: username, full_name, role, hashed_password, optional school/class/history
- Submission: student info + riasec array + scores + answers + suggestedMajors + combinations + timestamp
- VR job: id, title, videoId, description, icon, riasec_code
- Community post: id, author, content, timestamp, comments[]

## 7. Environment/config
Required/important env vars:
- `DIFY_API_KEY`
- `DIFY_CHAT_URL` (default already set in code)
- `MONGODB_URI` (recommended for production/Vercel)
- `SECRET_KEY` (should override default in production)

Notes:
- If Mongo is unavailable, local JSON fallback is used.
- On Vercel, local-file writes are intentionally blocked when not on Mongo to avoid read-only FS errors.

## 8. Current limitations and risks
- Conversation state is in-memory; resets on restart and does not scale across instances.
- Some inline style artifacts still exist in templates and JS-generated markup.
- Accessibility has smoke-pass coverage; full screen-reader + automated axe pass is still recommended.

## 9. Testing status (repo contents)
- There are API/integration test scripts:
  - `test_backend_full.py`
  - `test_backend_features.py`
  - `test_auth_backend.py`
  - `backend/test_api.py`
- They cover auth, submissions, VR jobs, community, health, and basic RIASEC payload validation.

## 10. If prompting an agent next, include this context
Use this wording (copy/adapt):

> This is a FastAPI + Jinja + vanilla JS monolith for career guidance (RIASEC + Dify chat + VR jobs + community + admin dashboard).  
> Backend entry: `backend/main.py`. Persistence abstraction: `backend/database.py`.  
> Frontend logic is modularized in `backend/static/js/` (`core.js`, `test-results-dashboard.js`, `chat.js`, `vr.js`, `community-profile.js`, `init.js`).  
> RIASEC scoring is in `backend/riasec_calculator.py`.  
> Please preserve existing routes and UI behavior unless I explicitly ask for breaking changes.

## 11. UI/UX implementation snapshot (2026-02-16)
- Responsive navigation with mobile menu toggle (`backend/templates/base.html`, `backend/static/js/core.js`).
- Shared UI components/tokens in CSS (`backend/static/style.css`) for forms, status blocks, cards, chat bubbles, dashboard table.
- Alert-heavy flows replaced by inline status/live-region feedback across auth/test/chat/community/profile/vr.
- Results and VR recommendation hierarchy improved for scannability and click affordance.
- Accessibility smoke fixes:
  - focus-visible styling
  - keyboard support for interactive VR cards
  - modal dialog semantics + Escape close + focus return
- QA artifact: `UI_UX_QA_REPORT.md`.
