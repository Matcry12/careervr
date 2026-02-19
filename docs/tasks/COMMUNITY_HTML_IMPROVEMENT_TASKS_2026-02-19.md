# Community HTML Improvement Tasks (2026-02-19)

Source plan: `docs/plans/COMMUNITY_HTML_IMPROVEMENT_ADOPTION_PLAN_2026-02-19.md`

## Task List

### COM-UI-301 - Migrate 3-column skeleton
- Priority: P0
- Owner: Frontend
- Status: DONE
- Description: Move `community-wrapper` layout concept from `docs/community.html` into `backend/templates/community.html`.
- Deliverables:
  - Left navigation column
  - Center feed/composer column
  - Right utility/admin column
- Dependencies: None
- Done when:
  - Page renders correctly desktop + mobile fallback
  - No missing major sections compared to current production page
- Notes: Implemented in `backend/templates/community.html` using imported `community-wrapper` structure and preserved compatibility IDs for existing JS hooks.

### COM-UI-302 - Preserve JS hooks/IDs
- Priority: P0
- Owner: Frontend
- Status: DONE
- Description: Ensure all IDs used by `backend/static/js/community-profile.js` remain unchanged after template migration.
- Deliverables:
  - ID mapping checklist
  - Verified selectors for mode switch, composer, feed, pagination, report/admin blocks
- Dependencies: COM-UI-301
- Done when:
  - No broken selector-based interaction in console
- Notes: Verified hook compatibility and documented in `docs/reports/COMMUNITY_UI_HOOK_VERIFICATION_2026-02-19.md`.

### COM-UI-303 - Extract inline styles to global stylesheet
- Priority: P0
- Owner: Frontend UI
- Status: DONE
- Description: Move inline style blocks from imported community template into `backend/static/style.css`.
- Deliverables:
  - Namespaced community CSS rules
  - Tokenized colors using `--cg-*`
- Dependencies: COM-UI-301
- Done when:
  - Template has no significant inline styling
  - Visual parity with proposed style intent
- Notes: Removed embedded `<style>` and all `style="..."` attributes from `backend/templates/community.html`; added token-based community layout styles into `backend/static/style.css`.

### COM-UI-304 - Responsive behavior
- Priority: P0
- Owner: Frontend UI
- Status: DONE
- Description: Implement responsive collapse for 3-column desktop into 1-column mobile layout.
- Deliverables:
  - Breakpoint rules for <= 992px and <= 768px
  - Sidebar collapse behavior
- Dependencies: COM-UI-303
- Done when:
  - No horizontal overflow on mobile
  - Core controls reachable without layout break
- Notes: Added responsive tuning in `backend/static/style.css` for `<= 992px` and `<= 768px` with sidebar collapse-to-stack behavior, filter wrapping, and mobile button/full-width adjustments.

### COM-UI-305 - Sidebar interaction polish
- Priority: P2
- Owner: Frontend UI
- Status: TODO
- Description: Improve hover/active/focus states for sidebar navigation items.
- Deliverables:
  - Consistent active indicator
  - Accessible focus-visible states
- Dependencies: COM-UI-303
- Done when:
  - Keyboard and mouse interaction are visually clear

### COM-UI-306 - Validate discover/rag mode
- Priority: P1
- Owner: Frontend + QA
- Status: TODO
- Description: Confirm tab switch logic and panel visibility still works in new layout.
- Deliverables:
  - Manual test evidence for mode switch
- Dependencies: COM-UI-302
- Done when:
  - Discover and RAG panels toggle correctly without JS errors

### COM-UI-307 - Validate composer modal flow
- Priority: P1
- Owner: Frontend + QA
- Status: TODO
- Description: Confirm Facebook-style trigger opens existing modal and post creation flow stays intact.
- Deliverables:
  - Create flow checklist (open, submit, status, close)
- Dependencies: COM-UI-302
- Done when:
  - Create post from trigger works end-to-end

### COM-UI-308 - Validate feed/filter/pagination
- Priority: P1
- Owner: Frontend + QA
- Status: TODO
- Description: Verify search/category/sort/pagination behavior in updated layout.
- Deliverables:
  - Behavior checklist for controls
- Dependencies: COM-UI-302
- Done when:
  - Filters update feed correctly and pagination remains stable

### COM-UI-309 - Validate moderation controls
- Priority: P1
- Owner: Frontend + QA
- Status: TODO
- Description: Confirm report list, pin, and delete post flows still work in admin/user roles.
- Deliverables:
  - Role-based test checklist
- Dependencies: COM-UI-302
- Done when:
  - Admin moderation actions and user-safe restrictions are intact

### COM-UI-310 - QA evidence report
- Priority: P1
- Owner: QA
- Status: TODO
- Description: Produce a concise regression report with evidence after migration.
- Deliverables:
  - Before/after screenshots
  - Pass/fail matrix for core community flows
  - Known limitations section
- Dependencies: COM-UI-304, COM-UI-306, COM-UI-307, COM-UI-308, COM-UI-309
- Done when:
  - Report is committed in `docs/reports/`

## Suggested Sprint Order
1. COM-UI-301
2. COM-UI-302
3. COM-UI-303
4. COM-UI-304
5. COM-UI-306
6. COM-UI-307
7. COM-UI-308
8. COM-UI-309
9. COM-UI-305
10. COM-UI-310
