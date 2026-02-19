# Community UI Remake Plan (Simple + Pretty) (2026-02-18)

## Objective
Remake Community page into a simpler, cleaner, visually strong experience that is easy to understand in 5 seconds.

## Design Direction
- Visual tone: calm, modern, confident.
- Priority: clarity over density.
- Layout rule: one primary action per section.
- Interaction rule: progressive disclosure (show less first, reveal details on demand).

## Core UX Problems to Solve
1. Too many controls visible at once (cognitive overload).
2. Write/create, discover, and moderation areas compete for attention.
3. Post actions are crowded and inconsistent across summary/detail.
4. Feedback states are unclear (user not sure action succeeded).
5. Spacing/visual hierarchy not strong enough, page feels busy.

## Target Information Architecture

### Zone A - Header + Quick Context
- Simple title + 1 sentence purpose.
- Optional compact metric chips (max 3 key metrics).
- Remove non-essential helper copy.

### Zone B - Discover (single card)
- Search + filter + sort in one compact toolbar.
- RAG as secondary tab (not equal visual weight to browse by default).
- Persist last active tab and filters.

### Zone C - Create post (single primary CTA)
- One clear button/trigger: “Tạo bài viết”.
- Composer remains modal (focused writing flow).
- Related suggestions hidden by default, expandable.

### Zone D - Feed
- Summary-first cards only.
- Primary actions visible: `Xem chi tiết`, `Xoá` (if authorized).
- Secondary actions moved to detail (like/report/comment/pin).
- Consistent pagination at bottom.

### Zone E - Admin moderation
- Fully isolated panel with clear red boundary.
- Hidden completely for non-admin.

## Visual System Plan

### Typography
- Clear hierarchy:
  - H1 page title
  - H2 section labels
  - body text
  - helper text minimal and lighter
- Reduce helper text lines by ~40%.

### Spacing & Layout
- 8px scale spacing system.
- Section rhythm:
  - 24-32px between major zones
  - 12-16px inside cards
- Max content width 760-840px centered.

### Color & Contrast
- Keep existing dark theme but simplify accents:
  - primary blue for main actions
  - one danger red for delete/report
  - muted neutral for secondary actions
- Improve contrast for small text/buttons.

### Component cleanup
- Standardize button sizes (`small`, `default`).
- Standardize card styles (radius, border, hover).
- Standardize status messages:
  - info/success/error position + style always consistent.

## Interaction Plan

### Feed card behavior
- Default card contains:
  - title, author, time, category, short excerpt, comment/like counts
  - actions: `Xem chi tiết`, `Xoá` (if allowed)
- Clicking card title opens detail modal (optional enhancement).

### Detail modal behavior
- Contains full content + all secondary actions.
- Sticky footer actions on mobile.
- ESC + overlay close preserved.

### Feedback and micro-interactions
- Action success toast/status auto-hide after 2.5-4s.
- Loading skeleton on feed fetch.
- Disabled states for in-flight actions.

## Accessibility and Mobile Plan
- Keyboard navigation for all actionable controls.
- Proper aria labels for action buttons.
- Touch targets >= 40px on mobile.
- On mobile:
  - actions stack vertically
  - toolbar collapses into vertical form
  - modal fills height with sticky submit area

## Implementation Phases

### Phase 1 - Structural simplification
- Reduce section copy/noise.
- Reorder sections for primary journey:
  1) Discover
  2) Create
  3) Feed
  4) Admin

### Phase 2 - Component unification
- Refactor buttons/cards/status tokens in CSS.
- Normalize feed and detail action groups.

### Phase 3 - Interaction refinement
- Add clear status slots (global + per-post).
- Improve loading/empty/error states with consistent wording.

### Phase 4 - Mobile and a11y hardening
- Responsive polish + keyboard pass + ARIA pass.

## QA Checklist
- New user can find how to create post in <5 seconds.
- User can understand feed actions without tutorial.
- Delete flow discoverable and safe.
- Search/filter/sort still works with pagination.
- Detail modal fully usable on mobile.
- Admin panel hidden for normal users, visible for admin.

## Deliverables
- UI remake implementation on Community page
- Before/after screenshots (desktop + mobile)
- UX QA report and regression checklist
- Updated demo script bullets for judges
