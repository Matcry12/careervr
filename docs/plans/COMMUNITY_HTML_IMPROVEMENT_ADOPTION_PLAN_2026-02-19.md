# Community UI Improvement Adoption Plan (from `docs/community.html`)

Date: 2026-02-19
Owner: Web/App Team
Scope: Upgrade production Community page using the new layout/style direction in `docs/community.html` while preserving existing working logic.

## 1) Objective
Adopt the improved community UI (3-column information architecture, Facebook-like composer trigger, cleaner filter/feed flow) into the current production page with minimal regression risk.

## 2) Current State Summary
- Production template: `backend/templates/community.html`
- Candidate improved template: `docs/community.html`
- Existing JS logic: `backend/static/js/community-profile.js` (already supports modal composer, discover/rag mode, filters, pagination, reports, delete, pin, related blocks).

Important: Most logic relies on stable element IDs (`communityModeDiscover`, `communityRagModePanel`, `postsContainer`, `communityPagination`, etc.). Any UI refactor must preserve these IDs.

## 3) Gap Analysis (What `docs/community.html` adds)
1. Stronger page IA (left nav + center feed + right utility/admin column).
2. Better composer entry point (compact trigger instead of heavy inline form).
3. Cleaner feed control bar and search/filter grouping.
4. Better separation of related-posts and admin moderation blocks.
5. Mobile behavior (collapse sidebars, focus center feed).

## 4) Risks
1. Inline `<style>` in `docs/community.html` may conflict with global theme tokens.
2. Replacing template structure can break JS bindings if IDs/classes change.
3. Sticky sidebars and large grids can create mobile overflow/performance issues.
4. Mixed visual systems (hardcoded color values vs token-based style.css) can reduce contrast consistency.

## 5) Implementation Strategy

### Phase A - Safe Structure Migration
- Merge layout skeleton from `docs/community.html` into `backend/templates/community.html`.
- Keep all existing JS-critical IDs unchanged.
- Keep all existing modal blocks and action buttons unchanged.

### Phase B - Style Normalization
- Move inline styles from `docs/community.html` into `backend/static/style.css` under `community-*` namespace.
- Replace hardcoded colors with existing design tokens (`--cg-*`).
- Add/adjust responsive breakpoints for 3-column -> single-column collapse.

### Phase C - Interaction Validation
- Verify mode switch (`discover` / `rag`) still toggles correctly.
- Verify composer trigger opens modal and draft-related suggestions still work.
- Verify feed filters/search/sort + pagination unchanged.
- Verify admin reports and delete/post actions remain functional.

### Phase D - UX Polish
- Ensure spacing hierarchy between center feed cards and right utility cards.
- Standardize hover/focus/active states for sidebar items and filter controls.
- Add clear status placements: create status, report status, RAG status, delete status.

### Phase E - QA and Regression Gate
- Run desktop + mobile smoke tests on core flows.
- Validate no JS console errors on community page load and primary interactions.
- Capture before/after screenshots and short QA report.

## 6) Task Breakdown
- COM-UI-301: Migrate `community-wrapper` 3-column skeleton into production template.
- COM-UI-302: Preserve and verify all required IDs/hooks for `community-profile.js`.
- COM-UI-303: Extract inline styles to `backend/static/style.css` using token-based colors.
- COM-UI-304: Implement responsive behavior for <= 992px and <= 768px.
- COM-UI-305: Refine sidebar navigation visual states (active/hover/focus).
- COM-UI-306: Validate discover/rag mode panel behavior.
- COM-UI-307: Validate composer trigger + modal create flow.
- COM-UI-308: Validate feed filters/search/sort/pagination.
- COM-UI-309: Validate moderation features (report list, pin, delete).
- COM-UI-310: Produce QA evidence doc with known limitations.

## 7) Acceptance Criteria
1. Community page follows new 3-column layout on desktop and collapses cleanly on mobile.
2. No regressions in create/comment/like/helpful/report/pin/delete flows.
3. Discover/RAG mode switch works and is visually clear.
4. Related block and admin moderation block are clearly separated and readable.
5. All inline styles from imported template are removed or minimized into centralized stylesheet.
6. No critical console errors in primary community flows.

## 8) Out of Scope (This iteration)
- Backend API contract changes for community endpoints.
- New recommendation model or RAG retrieval algorithm changes.
- Real-time websocket feed updates.

## 9) Recommended Execution Order
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
