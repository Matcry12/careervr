# UI/UX Focused Improvement Plan

Date: 2026-02-18
Scope: test flow usability + community layout clarity

## Context

Current pain points observed:
1. `chunkIndicator` is placed above questions, causing extra scroll after students finish a chunk.
2. `community-create-card` combines multiple different intents (search/filter + create post + draft-related suggestions), increasing cognitive load.
3. `community-related-block` and `communityAdminReports` are visually too close, so sections are hard to distinguish.

## Goals

1. Reduce unnecessary scrolling in test-taking flow.
2. Reduce confusion and improve task clarity in Community page.
3. Improve visual hierarchy and separation between community sections.

## Non-Goals

1. No backend API contract change.
2. No new community features in this phase.
3. No data model change.

## Problem Breakdown and Solution

## A) Test Page: Move Chunk Navigation Down

Problem:
- Chunk controls are placed at top of question area (`backend/templates/test.html`), but student interaction finishes at bottom.

Plan:
1. Move `test-chunk-toolbar` to below `questionsContainer` and above final submit actions.
2. Keep progress bar and autosave status at top for orientation.
3. Keep chunk buttons sticky-on-mobile optional (phase 2 if needed).

Target files:
- `backend/templates/test.html`
- `backend/static/style.css`
- `backend/static/js/test-results-dashboard.js` (only if selector assumptions break)

Acceptance criteria:
1. Student can complete chunk and go next/prev without scrolling to top.
2. `prevTestChunk()` and `nextTestChunk()` still work exactly as before.
3. Progress text and chunk indicator remain accurate after chunk change.

## B) Community Page: Split Overloaded Create Card

Problem:
- `community-create-card` currently mixes discovery controls and creation controls.
- Users do not clearly understand whether they are searching or posting.

Plan:
1. Split into two separate panels:
   - Panel 1: "Khám phá thảo luận" (search/filter/sort only).
   - Panel 2: "Tạo bài viết mới" (author/title/category/content + submit).
2. Move "Bài viết liên quan khi bạn đang soạn" under create panel but visually as sub-section with softer style.
3. Keep status areas independent:
   - browsing status (loading/filter)
   - post creation status

Target files:
- `backend/templates/community.html`
- `backend/static/style.css`
- `backend/static/js/community-profile.js` (only for status hook IDs if changed)

Acceptance criteria:
1. User can identify browsing controls vs posting form within 3 seconds.
2. Search/filter still updates feed correctly.
3. Post creation flow unchanged functionally.

## C) Community Page: Increase Section Separation

Problem:
- `community-related-block panel panel-soft` and `communityAdminReports` appear stacked too tightly.

Plan:
1. Introduce clearer vertical rhythm between major panels (larger margin/gap).
2. Add section dividers/background tone variance for adjacent blocks.
3. Add explicit section heading style variants for "Related" vs "Admin reports".
4. Ensure admin-only area has distinct visual identity (border accent + icon/title cue).

Target files:
- `backend/templates/community.html`
- `backend/static/style.css`

Acceptance criteria:
1. Clear visual separation between:
   - feed-related recommendations
   - admin moderation section
2. Admin reports block is scannable and not visually merged with user-facing sections.
3. Mobile layout keeps separation without creating excessive whitespace.

## Implementation Sequence

1. Phase 1 (Low risk): spacing + visual separation styles (C).
2. Phase 2 (Medium risk): split community-create-card layout (B).
3. Phase 3 (Low-medium risk): move chunk toolbar in test flow (A).
4. Phase 4: responsive QA and interaction regression.

## QA Checklist

1. Test page
- Chunk controls reachable at bottom after answering.
- No broken JS on chunk transitions.

2. Community page (student)
- Search/filter/sort work.
- Create post and see success/error status.
- Related draft suggestions still render.

3. Community page (admin)
- Admin reports panel clearly separated.
- Admin moderation actions still usable.

4. Responsive
- 390px mobile, 768px tablet, desktop.
- No overlapping cards/panels.

## Risks and Mitigation

1. Risk: JS selectors tied to old DOM structure.
- Mitigation: keep existing IDs unchanged; only move containers.

2. Risk: spacing changes break compact desktop layout.
- Mitigation: use section-level spacing tokens and media-query tuning.

3. Risk: status messages become ambiguous.
- Mitigation: separate status regions and label each panel clearly.

## Deliverables

1. Updated templates and styles for test + community layout.
2. Updated UI regression note in report.
3. Optional follow-up task board from this plan.
