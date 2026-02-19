# Community Extra Bugs Fix Tasks (2026-02-19)

Source plan: `docs/plans/COMMUNITY_EXTRA_BUGS_FIX_PLAN_2026-02-19.md`

## Tasks

### COM-UI-321 - Feed summary accuracy under pagination
- Priority: P0
- Status: DONE
- Scope: `backend/static/js/community-profile.js`
- Notes: Rewrote summary copy to page-based wording and removed misleading total/all phrasing.

### COM-UI-322 - Sidebar semantic controls
- Priority: P0
- Status: DONE
- Scope: `backend/templates/community.html`
- Notes: Converted non-semantic clickable `div` sidebar items to `<button type="button">`.

### COM-UI-323 - Metrics card readability
- Priority: P0
- Status: DONE
- Scope: `backend/static/style.css`
- Notes: Increased metric card padding/min-height/typography and eased grid density.

### COM-UI-324 - Delete status row jitter
- Priority: P0
- Status: DONE
- Scope: `backend/static/js/community-profile.js`
- Notes: Moved delete status slot rendering out of action button row (summary + detail cards).

### COM-UI-325 - Admin report spacing and wrapping
- Priority: P0
- Status: DONE
- Scope: `backend/static/style.css`
- Notes: Added spacing between `communityAdminReportsStatus` and report list; added long-text wrap guards.

### COM-UI-326 - Composer avatar placeholder cleanup
- Priority: P1
- Status: DONE
- Scope: `backend/templates/community.html`, `backend/static/style.css`
- Notes: Removed placeholder avatar element and its CSS.

### COM-UI-327 - Error state style consistency
- Priority: P1
- Status: DONE
- Scope: `backend/static/js/community-profile.js`
- Notes: Replaced inline red-text empty-state fallback with `status status-error` block.

## Remaining
- Final visual QA pass in browser for desktop/mobile/admin modes.
