# UI/UX Improvement Plan (Pre-Implementation)

Status: Planning only (no UI code changes in this phase)

## 1. Objective
Improve usability, accessibility, clarity, and visual consistency across all user-facing pages:
- Landing
- Test
- Results
- Chatbot
- VR
- Community
- Dashboard
- Auth/Profile

## 2. Audit Findings (Current Problems)

## 2.1 Global Navigation and Layout
1. Header/nav becomes crowded on smaller viewports; no mobile menu pattern exists.
2. Navigation relies on hidden links (`auth-only`) without clear state transitions/loading indicators.
3. CTA hierarchy is inconsistent (multiple primary-like actions competing for attention).

## 2.2 Visual System and Consistency
1. Heavy inline styles in templates and JS-generated HTML reduce maintainability and coherence.
2. Spacing, typography scale, and card treatments vary across pages.
3. Color semantics are not standardized (success/warning/error/action colors are reused inconsistently).

## 2.3 Accessibility
1. Missing explicit focus styles for keyboard navigation on several interactive elements.
2. Color contrast risk in low-opacity text and badges over dark backgrounds.
3. Dynamic regions (chat/messages/results/import errors) lack ARIA/live-region support.
4. Some modal interactions rely on click behavior without robust keyboard support (Esc/focus trapping).

## 2.4 Form UX
1. Validation and error messaging are mostly alert-based and not inline/contextual.
2. Auth and profile forms do not provide field-level feedback or recovery hints.
3. Test form is long and cognitively heavy; question progress and sectioning can be improved.

## 2.5 Results and Recommendation UX
1. Recommendations now backend-driven, but result cards still rely on inline styling and limited hierarchy.
2. "Priority vs Backup" distinction exists but needs stronger visual semantics and scannability.
3. Clickability of recommendation cards is not communicated clearly enough (affordance cues).

## 2.6 VR and Teacher Workflow
1. Admin import UX is functional but lacks structured feedback layout (currently alert + raw list).
2. Template/import controls are dense and not grouped as a clear teacher workflow.
3. Video cards are visually rich but can overload with inline decoration and mixed badge positions.

## 2.7 Chatbot UX
1. Conversation start/reset model is understandable but context persistence is opaque to users.
2. Error messages are technical (`HTTP xxx`) and should be translated to user-actionable language.
3. Message container could benefit from stronger distinction between user and assistant blocks.

## 2.8 Dashboard and Data Clarity
1. Data table and charts are information-dense with weak prioritization.
2. Empty/error states are basic and not action-oriented.
3. Export/filters are missing for admin workflows.

## 3. UX Principles for Redesign
1. Clarity first: one primary action per section.
2. Progressive disclosure: reduce initial cognitive load, show advanced controls contextually.
3. Consistency: shared component styles and spacing rhythm.
4. Accessibility baseline: keyboard, focus, contrast, semantic regions.
5. Trust and feedback: inline status/error/success states instead of alert-only flows.

## 4. Design Direction
1. Keep existing visual identity (dark-blue CareerGo style) but modernize structure.
2. Replace most inline styles with reusable CSS classes/tokens.
3. Standardize component library:
- Buttons: primary/secondary/ghost/danger
- Cards: default/elevated/interactive
- Inputs: normal/error/disabled/help
- Status blocks: info/success/warn/error
- Badges: recommendation/admin/state

## 5. Scope by Phase

## Phase A - Foundations (P0)
1. Responsive navigation with mobile-safe behavior.
2. Global type scale, spacing system, and interaction states.
3. Shared utility classes replacing critical inline styles.
4. Accessibility fixes (focus, keyboard modal close, contrast adjustments).

## Phase B - Core Student Flow (P0)
1. Test page readability and fatigue reduction:
- better section chunking
- persistent progress and "time remaining" guidance
2. Results page:
- stronger Priority vs Backup visual structure
- obvious click-to-watch affordance
3. Chatbot:
- cleaner message bubbles
- friendlier error/success states

## Phase C - Teacher/Admin Flow (P1)
1. VR admin controls grouped into a clean import panel.
2. Import feedback converted to structured inline status panel.
3. Dashboard chart-card hierarchy + cleaner table readability.

## Phase D - Polish and Quality (P1)
1. Microcopy refinement (Vietnamese clarity and action wording).
2. Motion cleanup (reduce non-purposeful animation).
3. Regression pass on all pages and viewport breakpoints.

## 6. Acceptance Criteria
1. Navigation is usable on mobile without overflow/collision.
2. No blocking browser alerts for standard validation failures.
3. Recommendation cards and VR cards are visually consistent and keyboard-accessible.
4. Modal flows support:
- Esc close
- focus return
- click outside close behavior without accidental close traps
5. Contrast and focus checks pass for critical controls and text.
6. Teacher import workflow communicates:
- file selected
- import running
- row-level errors
- final summary

## 7. Risks and Mitigation
1. Risk: Large CSS refactor causes regressions.
- Mitigation: component-by-component migration with snapshots/manual smoke checklist.
2. Risk: JS-generated inline markup still diverges from template styles.
- Mitigation: move JS HTML strings to class-driven markup contract.
3. Risk: Accessibility fixes conflict with existing interactions.
- Mitigation: add keyboard + focus test checklist on every page.

## 8. Deliverables
1. Updated CSS design tokens + component classes.
2. Refactored template markup for major pages.
3. JS interaction updates for inline feedback and accessibility hooks.
4. QA checklist and before/after screenshots for each page.

## 9. Out of Scope (for this cycle)
1. Full design-system extraction into separate package.
2. Replatforming from Jinja + vanilla JS to SPA framework.
3. Internationalization overhaul.

