# Community UI/UX Relax & Cleanup Tasks (2026-02-19)

Source plan: `docs/plans/COMMUNITY_UI_UX_RELAX_AND_CLEAN_PLAN_2026-02-19.md`

## Task List

### COM-UI-311 - Overflow hardening
- Priority: P0
- Owner: Frontend UI
- Status: DONE
- Description: Prevent text overflow and clipping in post cards, metadata rows, badge chips, action buttons, and status blocks.
- Scope:
  - `backend/static/style.css`
- Deliverables:
  - Word wrapping rules (`overflow-wrap`, `word-break`) on vulnerable components
  - Safe flex wrapping and min-width behavior in action/meta rows
- Dependencies: None
- Done when:
  - No horizontal overflow from long content on desktop/tablet/mobile breakpoints
- Notes: Added wrap/overflow guards and flex min-width protection in `backend/static/style.css` for post header/meta/action/status/comment components.

### COM-UI-312 - Spacing and readability pass
- Priority: P0
- Owner: Frontend UI
- Status: DONE
- Description: Relax crowded layout by increasing spacing rhythm between key sections and inside cards.
- Scope:
  - `backend/static/style.css`
- Deliverables:
  - Improved vertical rhythm between composer/discover/feed/pagination blocks
  - Better card padding and text line-height for reading comfort
- Dependencies: COM-UI-311
- Done when:
  - Page feels less cramped while maintaining visual consistency
- Notes: Increased spacing rhythm, panel/card padding, and reading line-height in `backend/static/style.css` with responsive safeguards for tablet/mobile.

### COM-UI-313 - Remove/merge low-value UI
- Priority: P1
- Owner: Frontend UI
- Status: DONE
- Description: Remove unnecessary noise and simplify duplicated actions.
- Scope:
  - `backend/templates/community.html`
  - `backend/static/style.css`
- Deliverables:
  - Remove right-sidebar footer micro-links block
  - Merge or simplify duplicate composer quick actions if behavior is identical
  - Keep important actions discoverable
- Dependencies: COM-UI-312
- Done when:
  - Fewer redundant controls, cleaner first-view experience
- Notes: Removed right-sidebar footer micro-links and merged duplicate composer quick actions into one clear CTA in `backend/templates/community.html` (+ CSS cleanup in `backend/static/style.css`).

### COM-UI-314 - Hierarchy rebalance
- Priority: P1
- Owner: Frontend UI
- Status: DONE
- Description: Rebalance visual weight so primary user flow (read/write/interact posts) is dominant.
- Scope:
  - `backend/static/style.css`
  - `backend/templates/community.html` (if minimal structure tweaks needed)
- Deliverables:
  - Stronger center-column focus
  - Softer secondary surfaces for right column blocks
  - Optional compacting/demotion of “Bước tiếp theo” widget
- Dependencies: COM-UI-312
- Done when:
  - Users visually prioritize feed and posting flow in first 3 seconds
- Notes: Rebalanced visual hierarchy via center-panel emphasis, softer right-sidebar widgets, narrower side columns, and reordered sidebar blocks in `backend/templates/community.html` + `backend/static/style.css`.

### COM-UI-315 - Responsive comfort QA
- Priority: P1
- Owner: QA + Frontend
- Status: DONE
- Description: Validate the cleanup pass on desktop/tablet/mobile with long-content stress cases.
- Scope:
  - UI verification and bug fixes from findings
- Deliverables:
  - Manual QA matrix results for 1366/1024/768/430/390/360 widths
  - Evidence report with pass/fail and screenshots
- Dependencies: COM-UI-311, COM-UI-312, COM-UI-313, COM-UI-314
- Done when:
  - No major layout break or overflow in target scenarios
- Notes: Static QA and code-integrity checks documented in `docs/reports/COMMUNITY_UI_UX_RELAX_QA_2026-02-19.md`; final visual screenshot capture remains manual-browser confirmation.

## Suggested Order
1. COM-UI-311
2. COM-UI-312
3. COM-UI-313
4. COM-UI-314
5. COM-UI-315
