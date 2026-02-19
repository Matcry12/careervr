# UI Color Rebalance and Contrast Plan (2026-02-19)

Context:
- Project moved to blue-first background (`#1371A8`).
- Several components still use old dark-theme color assumptions and low-contrast borders/text.
- Example confirmed by user: `journey-step` looks faded because border/surface blend with page background.

## 1) Goal
Make UI colors visually consistent and readable on top of `#1371A8`, with clear hierarchy for state, action, and navigation across all pages.

## 2) Brainstorm Findings by UI File

### `backend/templates/base.html`
- Header is readable, but body-level color context changed while some components still use legacy dark-contrast assumptions.
- Global perception issue: mixed old/new palettes reduce cohesion.

### `backend/templates/index.html`
- Hero/feature cards still rely on old deep-dark shades and accent blues not tuned to the new base.
- Secondary CTA (`btn-secondary`) can visually flatten on blue background.

### `backend/templates/login.html`
### `backend/templates/signup.html`
- Forms are acceptable but links/labels and helper text can feel low emphasis on new palette.
- Inline styles remain (`section-title` margin), making consistency harder.

### `backend/templates/test.html`
- `journey-stepper` inactive steps are low contrast (confirmed issue).
- Several status/helper elements rely on muted tones that are too close to panel colors in some states.

### `backend/templates/results.html`
- Stepper contrast issue repeats.
- Some inline color styles (`#4d7cff` in modal title) bypass token system.

### `backend/templates/community.html`
- Main structure is improved, but dense information blocks still need stricter contrast hierarchy.
- Boundary/info panels can appear visually merged when border opacity is too low.

### `backend/templates/chatbot.html`
- Session/status states are mostly clear, but muted copy and panel separators can be soft depending on display.

### `backend/templates/vr.html`
- Stepper contrast issue repeats.
- Admin cards and controls have mixed reds/blues from older palette logic.
- Many inline styles remain (modal, buttons, video title), causing style drift.

### `backend/templates/dashboard.html`
- Data-heavy tables/charts need more deterministic contrast roles (header, cell, card borders).

### `backend/templates/profile.html`
- Baseline is good; mostly needs alignment with final semantic token pass.

## 3) Root Causes
- Background direction changed to blue-first, but many component-level colors still target dark navy backgrounds.
- Mixed hardcoded colors and token colors create inconsistent contrast.
- Non-semantic token usage: same muted/border colors reused for different visual purposes.
- Inline styles in templates bypass theme tokens.

## 4) Color Strategy (Reasoned)

Principle A: Semantic roles over raw colors
- `surface` colors define layer depth.
- `border` colors define structure, not decoration.
- `text` colors map to reading priority.
- `accent` colors map to interaction priority.

Principle B: Contrast-first for workflow components
- Navigation/step indicators must stay readable at a glance.
- Status badges must remain distinguishable by both color and border.
- Buttons must be separable from nearby surfaces.

Principle C: Controlled blue family
- Keep `#1371A8` as page base.
- Use lighter-cool tints for text/borders.
- Reserve orange primarily for active/high-priority accents.

## 5) Proposed Token Refinement

Keep:
- `--cg-primary-blue: #1371A8`
- `--cg-primary-orange: #E97423`

Refine semantic layers:
- `--cg-surface-1`: primary cards/panels (mid transparency, dark-blue)
- `--cg-surface-2`: nested/secondary panels (slightly deeper)
- `--cg-surface-3`: input/table surfaces (highest separation)
- `--cg-border-default`: standard structural border
- `--cg-border-strong`: interactive/active border
- `--cg-text-primary`: headings/main body
- `--cg-text-secondary`: normal supporting text
- `--cg-text-muted`: metadata/helper only

Reason:
- This removes ambiguous reuse of one muted or border color for too many roles.

## 6) Critical Fix List (Color + UX)

### F1) Stepper visibility (`journey-step`)
- Increase inactive step border brightness and reduce background transparency blur.
- Increase inactive text luminance.
- Add subtle inset/outer edge for shape definition.
- Keep active state clearly distinct from inactive and from page background.

Reason:
- Stepper is a navigation anchor; low contrast hurts progress comprehension.

### F2) Secondary actions (`btn-secondary`)
- Increase border contrast and hover fill visibility.
- Ensure disabled state still readable but clearly inactive.

Reason:
- Secondary actions are used frequently in test/results/community/VR flows.

### F3) Panel boundaries (`panel`, `panel-soft`, related/admin blocks)
- Introduce stronger default border token and clearer soft-panel border.
- Separate adjacent panels with stronger edge contrast.

Reason:
- Dense information sections currently blend together.

### F4) Data surfaces (dashboard table/cards)
- Distinct table header surface token.
- Clear row/cell border token with consistent opacity.
- Ensure metric cards and chart containers are visually separated.

Reason:
- Data readability is critical in competition judging.

### F5) Inline style cleanup
- Replace template inline colors/margins/displays with class-based token styles.

Reason:
- Inline styles block global color governance and cause regressions.

## 7) Implementation Plan

### Phase C1 - Token hardening
- Finalize semantic color tokens for surface/border/text/action/status.
- Map existing aliases to semantic roles.

### Phase C2 - Global component pass
- Apply tokens to `journey-step*`, `btn-secondary`, `panel*`, `status*`, `helper/muted` text classes.

### Phase C3 - Page patch pass
- Patch page-specific contrast issues in Test, Results, Community, VR, Chatbot, Dashboard.

### Phase C4 - Inline style migration
- Remove remaining color/layout inline styles from templates and replace with utility classes.

### Phase C5 - QA contrast sweep
- Verify key contrast pairs and interaction readability on desktop/mobile.

## 8) Acceptance Criteria
- `journey-step` is clearly visible in inactive and active states on all pages.
- Borders consistently separate adjacent panels and cards.
- Secondary buttons remain clearly actionable.
- Data sections are readable without visual blending.
- No hardcoded inline color values remain in templates.

## 9) QA Checklist (Visual)
- Stepper readability on `test`, `results`, `chatbot`, `community`, `vr`.
- Community: section separators, admin/report panel boundaries, related blocks.
- VR: admin blocks, import status, card overlays.
- Dashboard: table header/cell contrast and metric card separation.
- Auth/Profile: label/helper/link clarity.

## 10) Proposed Task IDs
- `STY-012`: Global contrast correction for stepper/buttons/panels/status tokens.
- `STY-013`: Page-level contrast patch (Community/VR/Dashboard priority).
- `STY-014`: Remove remaining inline color/layout styles and replace with tokenized classes.
- `STY-QA-02`: Contrast-focused visual QA pass after STY-012..014.
