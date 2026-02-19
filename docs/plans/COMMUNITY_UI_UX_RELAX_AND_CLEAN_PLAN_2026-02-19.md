# Community UI/UX Relax & Cleanup Plan (2026-02-19)

## 1) Goal
Make Community page easier to read and more comfortable by fixing text overflow, reducing visual crowding, and removing low-value UI blocks that distract users.

## 2) Problems Observed (Current UI)
1. Text overflow risk on long titles/Vnames/badges/buttons in post cards and meta rows.
2. Layout feels tight: many cards stacked with similar visual weight and limited breathing room.
3. Action density is high in post summary/detail cards (many buttons and status chips in one line).
4. Sidebar + center + right column creates cognitive overload for first-time users.
5. Some blocks feel low value/noisy:
- Right-column footer text (`Privacy · Terms · CareerGo © 2026`) inside content area.
- Duplicated composer intent (`Đặt câu hỏi` and `Chia sẻ`) when both open same modal.
- “Bước tiếp theo” card can feel repetitive if user is already in community flow.
6. Visual hierarchy is not strong enough between primary action (read/write posts) and secondary utilities (metrics/admin hints/related).

## 3) UX Direction
- Prioritize feed reading and posting.
- Keep utilities discoverable but less dominant.
- Increase whitespace rhythm and card separation.
- Ensure every long string can wrap safely without breaking layout.

## 4) Scope
- In scope: `backend/templates/community.html`, `backend/static/style.css`.
- Out of scope: backend APIs, business logic, moderation rules, RAG algorithm.

## 5) Execution Plan

### Phase A - Overflow Safety (P0)
1. Add robust wrapping rules:
- `overflow-wrap: anywhere;`
- `word-break: break-word;`
for post title/content/meta, author line, badges, buttons, and status text.
2. Enforce flexible row behavior for post action groups and header rows on narrow widths.
3. Verify no horizontal scroll at common widths (1366, 1024, 768, 430, 390, 360).

### Phase B - Spacing Relaxation (P0)
1. Increase vertical spacing between major blocks (composer, discover panel, post list, pagination).
2. Increase internal padding on post cards and section panels where content feels cramped.
3. Tune line-height and font-size for long reading areas (post excerpts/details/comments).

### Phase C - Visual Simplification (P1)
1. Reduce duplicate/low-value elements:
- Keep one composer quick action (remove one of two duplicate buttons), or keep both but make secondary style lighter.
- Remove right-column footer micro-links from community content area.
2. Demote secondary widgets visually:
- related block and admin block should be quieter than main feed.
3. Re-evaluate “Bước tiếp theo” card prominence:
- keep but compact, or move below related/admin blocks.

### Phase D - Hierarchy & Clarity (P1)
1. Strengthen primary focus:
- composer trigger and posts stream should dominate center column.
2. Soften utility surfaces:
- lower contrast/weight of side blocks.
3. Add clear section rhythm:
- consistent heading spacing and predictable card grouping.

### Phase E - Responsive Comfort Pass (P1)
1. Tablet: keep filters and action groups readable without wrapping into awkward multi-line collisions.
2. Mobile: ensure button rows become full-width stacked, with clear tap targets and spacing.
3. Validate sticky/stack behavior doesn’t create jumpy scroll experience.

## 6) Proposed Removals / Reductions
1. Remove `Privacy · Terms · CareerGo © 2026` block from right sidebar content area.
2. Merge/streamline duplicated composer action row (`Đặt câu hỏi`, `Chia sẻ`) into one primary CTA if no behavior difference.
3. Reduce visual weight of side widgets (related/admin) and optional “Bước tiếp theo” block.

## 7) Task IDs
- COM-UI-311: Overflow hardening for long text and action rows.
- COM-UI-312: Spacing/padding rhythm pass.
- COM-UI-313: Remove/merge low-value UI elements.
- COM-UI-314: Rebalance visual hierarchy (main vs secondary blocks).
- COM-UI-315: Responsive comfort QA (desktop/tablet/mobile).

## 8) Acceptance Criteria
1. No text clipping or overflow outside cards/panels at target breakpoints.
2. Community page feels less crowded and easier to scan.
3. Primary flow (browse posts, open composer, interact) is visually obvious.
4. Removed/reduced elements do not hurt task completion.
5. No JS interaction regressions.

## 9) QA Checklist
1. Long Vietnamese title + long English keyword mixed in one post.
2. Long author name and role badge.
3. Many action buttons visible on same post.
4. 320-390px mobile widths with zoom 100%.
5. Admin and non-admin views.
