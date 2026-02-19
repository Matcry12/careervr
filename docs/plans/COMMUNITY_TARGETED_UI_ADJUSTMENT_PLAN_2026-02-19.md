# Community Targeted UI Adjustment Plan (2026-02-19)

## 1) Scope
Targeted fixes for 4 issues on Community page:
1. `fb-avatar-circle` behavior
2. `post-actions-right` / `post-summary-actions` button consistency
3. `communityMetricsPanel` cards too small/tight
4. `communityAdminReportsStatus` too close to `community-report-item`

Files in scope:
- `backend/templates/community.html`
- `backend/static/style.css`
- `backend/static/js/community-profile.js` (only if needed for avatar data flow)

## 2) Problem Statements
1. Avatar placeholder mismatch:
- Current `fb-avatar-circle` implies avatar but no real image source exists.

2. Action button inconsistency:
- Buttons in summary/detail action groups have inconsistent visual rhythm and weight.
- Mixed row behavior can look uneven when wrapping.

3. Metrics readability issue:
- `community-metric-card` appears too compact, making values hard to scan quickly.

4. Admin report spacing issue:
- `communityAdminReportsStatus` is visually crowded against first `community-report-item`.

## 3) Decision for Avatar (Required)
### Option A (Recommended now): Remove avatar circle
- Replace `fb-avatar-circle` with no avatar element.
- Keep composer trigger clean and text-first.
- Lowest risk, fastest.

### Option B (Future upgrade): Real profile avatar
- Extend profile model/API with `avatar_url`.
- Render real image or fallback initials in composer.
- Higher impact and requires backend/profile UI changes.

Recommendation: implement Option A now, add Option B to backlog.

## 4) Implementation Plan

### Phase A - Composer Avatar Adjustment (P0)
- A1. Remove `fb-avatar-circle` element from `community.html` composer trigger.
- A2. Adjust composer spacing so input shell still aligns naturally without avatar slot.
- A3. Remove or repurpose `.fb-avatar-circle` CSS.

### Phase B - Action Button Consistency (P0)
- B1. Normalize button sizing for action groups:
  - consistent font-size
  - consistent vertical padding
  - consistent border radius
- B2. Standardize spacing between action groups in both summary and detail cards.
- B3. Ensure wrapped rows still look intentional on narrow widths.
- B4. Keep semantic color differences (like/report/delete/pin) but unify structure.

### Phase C - Metrics Card Readability (P0)
- C1. Increase `community-metric-card` min-height and padding.
- C2. Increase metric value prominence (size/weight) while preserving contrast.
- C3. Improve label/value spacing and card-to-card gap.

### Phase D - Admin Report Spacing (P0)
- D1. Add bottom margin to `#communityAdminReportsStatus` when non-empty.
- D2. Add top spacing for `.community-reports-list` / `.community-report-item` in admin zone.
- D3. Verify empty-state and loaded-state spacing both look correct.

### Phase E - QA (P1)
- E1. Desktop + mobile quick pass (1366/1024/768/390).
- E2. Validate summary/detail action rows for consistent look.
- E3. Validate admin report area with both "no reports" and "has reports" states.

## 5) Task IDs
- COM-UI-316: Composer avatar decision + implementation (Option A now)
- COM-UI-317: Action button consistency pass (summary/detail)
- COM-UI-318: Community metrics card readability pass
- COM-UI-319: Admin report status/list spacing fix
- COM-UI-320: QA + evidence update report

## 6) Acceptance Criteria
1. Composer no longer shows misleading empty avatar placeholder.
2. Action buttons in summary/detail appear consistent in size, rhythm, and wrapping behavior.
3. Metrics cards are easier to read at a glance.
4. Admin report status and report items have clear visual separation.
5. No regressions in existing community interactions.

## 7) Backlog Note (Future)
- Add profile avatar support end-to-end (model + upload/input + rendering) as separate feature after current UI stabilization.
