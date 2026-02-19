# Community Extra Bugs Fix Plan (2026-02-19)

Source audit: `docs/audits/COMMUNITY_EXTRA_BUGS_AUDIT_2026-02-19.md`

## Objective
Fix additional UX/consistency/accessibility defects discovered after the main community UI cleanup.

## Fix Scope
- `backend/templates/community.html`
- `backend/static/style.css`
- `backend/static/js/community-profile.js`

## Planned Fixes
1. Fix misleading feed summary under pagination/filtering.
2. Replace non-semantic clickable sidebar `div` items with buttons.
3. Improve metrics card readability in sidebar.
4. Remove delete-status layout jitter by moving status out of action rows.
5. Add wrapping and spacing improvements for admin report status/list.
6. Remove misleading placeholder avatar circle in composer.
7. Remove inline style fallback in posts load error state.

## Acceptance Criteria
1. Community summary no longer implies “all posts loaded” when paginated.
2. Sidebar navigation is keyboard/semantic friendly.
3. Metrics cards are readable and not cramped.
4. Delete status does not shift action button layout.
5. Admin report status and items have clear spacing and long-text wrapping.
6. Composer no longer shows avatar placeholder without real avatar support.
7. Error states use shared status classes instead of inline style.
