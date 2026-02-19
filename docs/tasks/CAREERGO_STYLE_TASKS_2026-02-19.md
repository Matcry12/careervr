# CareerGo Style Extraction Tasks (2026-02-19)

Reference plan:
- `docs/plans/CAREERGO_STYLE_EXTRACTION_AND_APPLY_PLAN_2026-02-19.md`

Status legend:
- `TODO`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`

---

## Theme Foundation

### STY-001 - Token extraction and variable mapping
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Scope:
  - Extract and define canonical style tokens from reference HTML:
    - brand colors
    - neutral palette
    - spacing scale
    - radii
    - shadows
    - transition tokens
  - Add token block to shared CSS layer.
  - Replace repeated hard-coded values in core shared selectors.
- Acceptance:
  - Token map exists and is used in major shared components.
  - No visual regression in baseline pages.

### STY-002 - Global shell migration (header/nav/background)
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-001
- Scope:
  - Apply white sticky header + nav hover/active style direction.
  - Refine page background gradient safely.
  - Preserve current responsive navigation behavior.
- Acceptance:
  - Header/nav matches intended style across desktop/mobile.
  - No overlap/stacking regressions.

## Shared Component System

### STY-003 - Shared component normalization
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-001
- Scope:
  - Normalize `.btn`, `.panel`, `.card`, `.loading-modal`, `.status` styles.
  - Align hover/focus/disabled states to token system.
- Acceptance:
  - Shared components appear visually consistent across pages.

### STY-004 - Modal and loading treatment alignment
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: STY-003
- Scope:
  - Apply consistent blur/elevation/border treatment for overlays and modals.
  - Harmonize spinner and loading copy presentation.
- Acceptance:
  - All modal overlays share one coherent visual language.

## Page-Level Rollout

### STY-005 - Community themed application (priority page)
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-002, STY-003, STY-004
- Scope:
  - Apply new theme to Community layout and components.
  - Improve action hierarchy visibility (especially danger actions).
  - Keep current interaction logic unchanged.
- Acceptance:
  - Community looks simpler and cleaner, with clear action affordances.

### STY-006 - Test and Results harmonization
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: STY-003
- Scope:
  - Apply shared style language to test and results pages.
  - Preserve test flow behavior and readability.
- Acceptance:
  - Test/results visuals align with new global theme.

### STY-007 - Chatbot and VR harmonization
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: STY-003
- Scope:
  - Apply shared style language to chatbot and VR pages.
  - Preserve admin controls and key interactions.
- Acceptance:
  - Chatbot/VR visually consistent with no functional regression.

### STY-008 - Dashboard and profile harmonization
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: STY-003
- Scope:
  - Align dashboard/profile panels/cards/status blocks.
  - Ensure data-heavy sections remain readable.
- Acceptance:
  - Dashboard/profile match theme and maintain clarity.

## Cleanup and QA

### STY-009 - CSS cleanup and architecture hardening
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: STY-005, STY-006, STY-007, STY-008
- Scope:
  - Remove duplicate/dead style blocks.
  - Group styles by system/component/page.
  - Add concise comments for non-obvious style groups.
- Acceptance:
  - CSS is cleaner and easier to maintain.

### STY-010 - Background base color alignment to brand blue
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-009
- Scope:
  - Replace dark-first page background direction with brand blue base `#1371A8`.
  - Update related gradient/token usage to keep text contrast and panel readability.
  - Validate readability across main pages (Community/Test/Results/VR/Chatbot/Dashboard/Profile).
- Acceptance:
  - Primary page background is visually based on `#1371A8`.
  - No readability regressions in key text and action areas.

### STY-011 - Palette harmonization for blue-first background
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-010
- Scope:
  - Tune supporting colors (text, muted text, borders, surfaces, accents) to fit `#1371A8` base background.
  - Tune action and status colors so hierarchy remains clear and accessible.
  - Verify consistency across Community/Test/Results/VR/Chatbot/Dashboard/Profile.
- Acceptance:
  - Visual palette feels coherent after background shift.
  - Contrast and action clarity remain strong across major pages.

### STY-012 - Global contrast correction (stepper/buttons/panels/status)
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-011
- Scope:
  - Fix low-contrast global components on blue-first background:
    - `journey-step*`
    - `btn-secondary`
    - `panel` / `panel-soft`
    - `status*`
  - Strengthen inactive/active differentiation and boundary visibility.
- Acceptance:
  - `journey-step` is clearly visible in inactive and active states.
  - Secondary actions and panel boundaries no longer look faded.

### STY-013 - Page-level contrast patch (community/VR/dashboard priority)
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: STY-012
- Scope:
  - Apply page-specific contrast corrections for dense areas:
    - Community section boundaries and admin/report blocks
    - VR admin/import blocks
    - Dashboard data surfaces (table, metrics, charts wrapper)
- Acceptance:
  - Priority pages read clearly with no merged/faded sections.

### STY-014 - Inline style migration to tokenized classes
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: STY-013
- Scope:
  - Remove remaining inline style attributes in templates where feasible.
  - Replace inline color/layout rules with reusable classes tied to tokens.
- Acceptance:
  - Template styling is centralized in CSS with minimal inline overrides.

### STY-QA-02 - Contrast-focused visual QA pass
- Status: `DONE`
- Priority: `P0`
- Owner: QA
- Depends on: STY-012, STY-013, STY-014
- Scope:
  - Validate contrast and hierarchy on key workflow surfaces:
    - stepper, actions, panel boundaries, status chips
  - Verify desktop/mobile readability after color rebalance.
- Acceptance:
  - No major contrast complaints on main user flows.

### STY-QA-01 - Visual + functional regression pass
- Status: `TODO`
- Priority: `P0`
- Owner: QA
- Depends on: STY-005, STY-006, STY-007, STY-008, STY-010, STY-011, STY-QA-02
- Scope:
  - Validate functional flows are intact.
  - Validate visual quality desktop/mobile.
  - Validate accessibility focus/contrast/breakpoints.
- Acceptance:
  - No critical functional regression.
  - Visual consistency and readability pass target checks.

### STY-DOC-01 - Update demo assets for new style system
- Status: `TODO`
- Priority: `P1`
- Owner: Docs/Product
- Depends on: STY-QA-01
- Scope:
  - Update demo script/checklist screenshots and talking points.
  - Document key visual improvements for judging pitch.
- Acceptance:
  - Demo artifacts reflect final styled UI.

---

## Execution Order (Recommended)
1. STY-001 -> STY-002 -> STY-003 -> STY-004
2. STY-005 (Community first)
3. STY-006 + STY-007 + STY-008
4. STY-009
5. STY-010 + STY-011
6. STY-012 -> STY-013 -> STY-014
7. STY-QA-02
8. STY-QA-01
9. STY-DOC-01
