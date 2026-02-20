# Core Journey Alignment QA

Date: 2026-02-20
Scope: `CJA-501` from `docs/tasks/CORE_JOURNEY_ALIGNMENT_TASKS_2026-02-20.md`

## Objective

Validate delivered updates for:
- AI recommendation scope alignment
- Journey stepper navigation
- Dual chunk-action toolbars on Test page
- Dashboard access for all authenticated accounts with non-admin privacy safeguards

## Checks Executed

## 1) AI scope guard and constraint payload (code + unit tests)

Verified in `backend/main.py`:
- Structured allowed-job inputs are built and passed (`allowed_jobs_json`, `priority_jobs_json`, `backup_jobs_json`).
- Shared scoped query builder is applied in `/start-conversation`, `/chat`, and `/run-riasec`.
- Out-of-scope detection + single correction retry path exists (`call_dify_with_scope_guard`).

Unit tests:
```bash
pytest -q test_riasec_recommendation_logic.py test_ai_job_scope_guard.py
```

Result: `PASS` (`6 passed`)

## 2) Journey stepper navigation (template + JS binding)

Verified in:
- `backend/templates/test.html`
- `backend/templates/results.html`
- `backend/templates/vr.html`
- `backend/templates/chatbot.html`
- `backend/templates/community.html`
- `backend/static/js/test-results-dashboard.js`
- `backend/static/js/init.js`

Checks:
- Non-active steps now expose `data-page` + keyboard focus (`tabindex="0"`, `role="button"`).
- Shared click/keyboard handler (`Enter`/`Space`) routes via `goPage(...)`.
- Active step remains non-clickable and marked with `aria-current="step"`.

Result: `PASS` (code-level verification)

## 3) Test chunk controls at top and bottom (selector sync)

Verified in:
- `backend/templates/test.html`
- `backend/static/js/test-results-dashboard.js`
- `backend/static/style.css`

Checks:
- Added top toolbar above `questionsContainer` while retaining bottom toolbar.
- Replaced single-ID updates with selector-based sync:
  - `[data-chunk-indicator]`
  - `[data-chunk-prev]`
  - `[data-chunk-next]`
- Button disabled states and label text are synchronized across both toolbars.

Result: `PASS` (code-level verification)

## 4) Dashboard access policy and privacy behavior

Verified in:
- `backend/main.py`
- `backend/static/js/test-results-dashboard.js`
- `backend/static/js/core.js`
- `backend/templates/base.html`

Checks:
- `/api/submissions` changed from admin-only to authenticated-user access.
- Non-admin submissions response is server-side sanitized for identity fields (`name/class/school`).
- Dashboard nav changed to authenticated visibility (`auth-only`).
- Client-side admin redirect block for dashboard navigation removed.
- Admin-only controls remain admin-gated by existing `admin-only` policy.

Result: `PASS` (code-level verification)

## 5) Syntax and safety checks

Commands:
```bash
node --check backend/static/js/test-results-dashboard.js
node --check backend/static/js/chat.js
node --check backend/static/js/init.js
node --check backend/static/js/core.js
python -m py_compile backend/main.py
```

Result: `PASS`

## Role Matrix (Expected Behavior After Patch)

1. Guest (not logged in)
- Dashboard page: shown login prompt
- `/api/submissions`: unauthorized
- Result: PASS

2. Authenticated non-admin user
- Dashboard navigation/page: accessible
- Dashboard data: accessible with sanitized personal identity fields
- Admin-only controls (clear data, admin panels): hidden
- Result: PASS

3. Admin user
- Dashboard navigation/page: accessible
- Dashboard data: full records
- Admin-only controls: visible
- Result: PASS

## Outcome

`CJA-501`: `DONE` (code-level regression and targeted test pass)

## Notes / Limitations

- Full browser-interaction smoke (real click path + visual/mobile checks) is not executed in this container.
- AI retry path is validated by unit logic and code path inspection; end-to-end Dify behavior still depends on runtime API responses.
