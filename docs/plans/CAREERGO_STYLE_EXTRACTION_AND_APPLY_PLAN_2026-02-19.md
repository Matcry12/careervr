# CareerGo Style Extraction and Application Plan (2026-02-19)

Source style reference:
- `/workspaces/careervr/docs/CareerGo_web_chart.HTML`

## 1) Objective
Apply the visual style direction from `CareerGo_web_chart.HTML` to the current project in a controlled way, while preserving existing behavior and avoiding UI regressions.

Update note (2026-02-19):
- Replace dark page background direction with brand blue base `#1371A8`.
- Add a follow-up palette harmonization pass so supporting colors (text, borders, surfaces, buttons, status) are rebalanced to fit the new blue-first background.

## 2) Key Observations from Source File

### 2.1 Design tokens
- Primary palette is clear and stable:
  - `--primary-blue: #1371A8`
  - `--primary-orange: #E97423`
  - neutral dark/light + white
- Motion token:
  - `--transition: all 0.3s ease-in-out`

### 2.2 Visual language
- Bright brand contrast (blue/orange), white text emphasis.
- White sticky header with shadow and colored active nav.
- Card-heavy layout with rounded corners and strong shadows.
- Gradient background and blur overlays on modals.

### 2.3 Component signals worth reusing
- Header/nav look and active-tab behavior.
- Feature/cards with clear hierarchy.
- Modal/loading visual treatment (blur + panel depth).
- Consistent button hover and elevation behaviors.

### 2.4 Risks in raw copy-paste
- Source includes duplicate/legacy styles and inline styles.
- Some selectors are broad (`*`, `body`, generic class names).
- Direct paste may override current community/test/VR layouts.

## 3) Migration Strategy (Safe)

### Rule A: Token-first, component-second
1. Extract colors/spacing/radius/shadow/transition as CSS variables.
2. Map current components to these tokens.
3. Avoid importing raw source CSS blocks directly.

### Rule B: Scope and layer
- Introduce a dedicated style layer for migration (e.g. `careergo-theme.css` or scoped section in `style.css`).
- Prefer explicit selectors (`.community-*`, `.dashboard-*`, `.btn`, `.panel`) over global resets.
- Keep legacy styles as fallback until QA passes.

### Rule C: Incremental rollout
- Update visuals page-by-page, not all at once.
- Validate each phase on desktop + mobile before continuing.

## 4) Detailed Phases

### Phase 1 - Theme token extraction
Deliverable:
- Token map document + CSS variables in one place.

Tasks:
1. Define canonical tokens:
- brand colors
- neutrals
- text colors
- elevation shadows
- border radius
- spacing scale
- transition curves/durations
2. Replace hard-coded repeated values in current CSS with token refs.

Acceptance:
- No visual break.
- Token usage measurable in major components.

### Phase 2 - Global shell (header + navigation + page background)
Deliverable:
- Unified header/nav shell aligned with source direction.

Tasks:
1. Apply white sticky header style safely.
2. Apply active/hover nav state mapping to brand tokens.
3. Refine page background using `#1371A8` as the primary base color (instead of dark-first background), while maintaining readability.

Acceptance:
- Header remains usable across all pages.
- No overlap/regression in mobile nav.

### Phase 3 - Core component alignment
Deliverable:
- Unified `btn`, `panel`, `card`, `modal`, `status` components.

Tasks:
1. Map button variants to brand styles.
2. Align panel/card radius, borders, shadows.
3. Align modal visual depth and loading spinner style.
4. Normalize helper/status text style.

Acceptance:
- Components look consistent across Community/Test/Results/VR.

### Phase 4 - Community page visual remake (priority page)
Deliverable:
- Cleaner Community UI using new tokens/components.

Tasks:
1. Apply simplified spacing and section hierarchy.
2. Harmonize summary card style with action emphasis.
3. Improve delete/report/danger visual distinction.
4. Ensure pagination/status areas match theme.

Acceptance:
- Community appears simpler and more premium.
- Interaction clarity improves (scan + action speed).

### Phase 5 - Remaining pages harmonization
Deliverable:
- Style parity on Test, Results, Chatbot, VR, Dashboard.

Tasks:
1. Touch only visual layer (no logic changes).
2. Remove duplicated style fragments.
3. Keep one source of truth for shared components.

Acceptance:
- Cross-page visual cohesion with no functional impact.

### Phase 6 - Cleanup and hardening
Deliverable:
- Maintainable CSS architecture.

Tasks:
1. Remove dead/duplicated rules.
2. Group CSS sections by component/system.
3. Add short comments for non-obvious style groups.

Acceptance:
- CSS easier to maintain and extend.

### Phase 7 - Palette harmonization after background shift
Deliverable:
- Balanced color system on top of `#1371A8` base background.

Tasks:
1. Re-tune text, muted text, border, and panel surface colors for contrast and consistency.
2. Re-tune button/status/accent colors to avoid clash with blue-first background.
3. Validate color consistency across Community/Test/Results/VR/Chatbot/Dashboard/Profile.

Acceptance:
- Supporting colors look coherent with `#1371A8` background.
- No readability or action-priority regression after palette tuning.

## 5) Mapping Matrix (Source -> Project)

- Source `:root` colors -> project global tokens in `backend/static/style.css`
- Source nav styles -> project `header`, `#mainNav`, `.nav-link`, `.nav-auth`
- Source `.card`, `.feature-card`, `.dashboard-card` -> project `.panel`, `.post-card`, `.community-*`, dashboard cards
- Source loading/modal treatment -> `.loading-overlay`, `.loading-modal`, community/report/detail modals
- Source button interaction style -> `.btn`, `.btn-primary`, `.btn-secondary`, action buttons

## 6) QA and Regression Gates

### Functional regression gate (must pass each phase)
- Auth flow (register/login/logout)
- Test submit -> results
- Community create/comment/delete/report
- VR browse + admin actions
- Chat send + response

### Visual QA gate
- Desktop: 1366x768, 1440x900
- Mobile: 390x844 and 412x915
- Check:
  - contrast
  - readability on `#1371A8` base background
  - spacing
  - overflow/clipping
  - button states (hover/focus/disabled)
  - modal accessibility and readability

### Accessibility gate
- Keyboard navigation through header/nav/actions
- Focus visible on interactive controls
- Sufficient color contrast for primary text/actions

## 7) Execution Order (Recommended)
1. Phase 1 (tokens)
2. Phase 2 (shell)
3. Phase 3 (shared components)
4. Phase 4 (community first)
5. Phase 5 (other pages)
6. Phase 6 (cleanup)
7. Phase 7 (palette harmonization after background shift)

## 8) Non-goals (to avoid scope creep)
- No backend/API changes for this plan.
- No feature behavior redesign during style migration.
- No full rewrite from single-file HTML architecture.

## 9) Ready-to-start Task Seed
- STY-001 Token extraction and variable mapping
- STY-002 Header/nav migration
- STY-003 Shared component style normalization
- STY-004 Community page themed application
- STY-005 Multi-page harmonization
- STY-QA-01 Visual + functional regression pass
