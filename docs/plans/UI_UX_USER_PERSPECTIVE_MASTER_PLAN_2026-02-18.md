# UI/UX User-Perspective Master Improvement Plan

Date: 2026-02-18
Authoring perspective: student + first-time user + competition judge

## 1) If I Were Your User, What I’d Want

As a user, I want the website to feel:
1. Simple: I immediately know what to do next.
2. Smooth: actions respond fast, no confusing jumps, no dead buttons.
3. Safe: I trust my progress is saved and not lost.
4. Helpful: every page guides me, not just displays information.
5. Consistent: same style of buttons/messages/feedback everywhere.

## 2) Current Experience Assessment (User Lens)

## What already works well
1. Clear core modules exist: Test, Results, VR, Chatbot, Community.
2. Visual style is modern enough to be competition-presentable.
3. Community now has stronger structure than before.
4. Admin vs user role behaviors are more explicit than earlier versions.

## What still feels confusing or weak
1. Too many panels can compete for attention on feature-heavy pages.
2. User guidance is inconsistent across pages (some pages explain next step, some don’t).
3. Feedback quality is uneven (some actions are explicit, some still feel silent/uncertain).
4. Information hierarchy is not always “primary action first”.
5. Emotional flow is fragmented: user can complete a task but still feel “What now?”.

## Direct answer to your question
- Should UI be simple? Yes.
- Should it be smooth? Yes.
- Current state: improving, but still partially confusing on interaction hierarchy.
- Ease of interaction: medium; not hard, but not “effortless” yet.

## 3) UX Principles for the Next Version

1. One primary action per screen section.
2. Show progress and next step at all times.
3. Every important action must have visible state: idle -> loading -> success/error.
4. Reduce cognitive load: separate “explore” and “create/manage” contexts.
5. Keep trust high: show save state, timestamp, and clear failure reasons.

## 4) High-Impact Improvements (Priority Roadmap)

## P0 - Competition-Critical (must finish first)

### UXM-001 Journey continuity bar on all core pages
- Add a consistent journey indicator: Test -> Results -> VR -> Chat -> Community.
- Highlight current step + recommend next action.
- Goal: remove “what now?” moments.

### UXM-002 Interaction feedback contract (global)
- Standardize status blocks for all actions:
  - loading: what is happening now
  - success: what succeeded
  - error: why and what to do next
- No silent failures.

### UXM-003 Primary CTA hierarchy cleanup
- On each page, ensure one dominant CTA and secondary options visually weaker.
- Prevent equal-weight buttons causing indecision.

### UXM-004 Data safety confidence
- Show explicit autosave/save state where user inputs long data.
- Include “last saved” on relevant flows.

## P1 - Strong UX Differentiators

### UXM-101 Results page storytelling
- Convert results into a guided narrative:
  - “Your strongest profile”
  - “Why these careers fit”
  - “Try this next” buttons
- Add confidence indicators and plain-language explanation.

### UXM-102 VR page discoverability and control clarity
- Better grouping: recommended jobs vs all jobs.
- Better preview cues for job cards (duration/topic/fit).
- Admin controls visible only in management region, not mixed with student browsing.

### UXM-103 Community clarity refinement
- Keep separation between discover/create/moderation strict.
- Reduce dense blocks and increase readable breathing room.
- Improve empty states with direct next-action buttons.

### UXM-104 Chatbot session UX
- Make session state unambiguous:
  - not started / active / sending / failed
- Suggest starter prompts based on user RIASEC result.

## P2 - Polish and trust layer

### UXM-201 Accessibility polish pass
- Keyboard-first verification for all interactive components.
- Improve focus visibility and aria feedback consistency.

### UXM-202 Performance perception pass
- Skeleton loaders where data fetch > 400ms.
- Avoid layout shifts and sudden content jumps.

### UXM-203 Content voice consistency
- Unify wording style (friendly professional Vietnamese).
- Replace technical/ambiguous phrases with user language.

## 5) Page-by-Page Improvement Plan

## Landing / Home
1. Clarify value proposition in one sentence.
2. Add two role-based CTA paths:
- Student: Start Test
- Admin/Teacher: View Dashboard/Manage Content
3. Keep visual noise low above the fold.

## Test
1. Keep chunk controls near user action zone (already improved).
2. Show clear completion confidence (“X questions left”).
3. Add reassurance: data is auto-saved.

## Results
1. Improve card hierarchy for top recommendations.
2. Add “Next action” buttons under each recommendation.
3. Make backup options visually secondary but accessible.

## VR
1. Student browsing first, admin management second.
2. Better filter/search for job cards.
3. Stronger confirmation feedback for import/update actions.

## Chatbot
1. Session status banner always visible.
2. Starter prompts for first-time users.
3. Error recovery prompts (“Try again”, “Change question style”).

## Community
1. Keep discovery/create/moderation separated.
2. Add clearer panel titles and short helper text.
3. Improve post interaction affordances (like/comment/report/helpful states).
4. Combine `Hỏi đáp cộng đồng (RAG)` + `Khám phá thảo luận` into one unified section with two user modes:
- `Tìm bài thảo luận` (search/filter/sort)
- `Hỏi cộng đồng (RAG)` (question -> answer + citations)
5. Keep backend logic separate for reliability:
- discovery/search APIs unchanged
- RAG answer APIs unchanged
- only unify the UI entry point to reduce confusion and panel clutter
6. Replace full inline `Tạo bài viết mới` form with compact composer trigger (Facebook-like):
- Show a small “Bạn đang nghĩ gì?” composer box in feed area.
- On click, open a modal/popup with full post form (title/category/content/related suggestions/status).
- Keep existing post creation logic and autosave behavior; only change presentation to reduce page length and cognitive load.
7. Add post deletion action with clear permissions:
- Post owner can delete their own post.
- Admin can delete any post.
- Require confirmation modal + visible success/error feedback.
8. Convert feed to summary-first cards with detail view:
- In feed list, show concise summary (title, author, time, short excerpt, interaction counts).
- Click post card or “Xem chi tiết” to open full detail view (modal or dedicated detail panel/page).
9. Add chunked/paginated feed loading to avoid long scroll:
- Load posts by pages/chunks (e.g., 10-20 posts per load).
- Provide `Xem thêm` or pagination controls.
- Keep filters/search/sort compatible with pagination state.

## Dashboard/Admin
1. Start with 3-5 key indicators only.
2. Add plain-language metric captions.
3. Keep destructive actions clearly separated and confirmed.

## Auth/Profile
1. Streamline validation hints before submit.
2. Keep save state visible in profile.
3. Reduce friction in register->login continuity.

## 6) UX Quality Metrics (How to know we improved)

1. Task success rate:
- Student can complete Test -> Results without confusion.
2. Time-to-first-success:
- New user reaches meaningful output within 3 minutes.
3. Error clarity:
- 100% important actions show explicit success/error message.
4. Interaction confidence:
- User always knows whether data is saved.
5. Judge-readability:
- Core value and flow understood in under 60 seconds demo.

## 7) Execution Phases

## Phase A (2-3 days): Clarity Foundation
- UXM-001, UXM-002, UXM-003, UXM-004

## Phase B (3-5 days): Experience Depth
- UXM-101, UXM-102, UXM-103, UXM-104

## Phase C (2-3 days): Polish + Accessibility
- UXM-201, UXM-202, UXM-203

## 8) Risks and Mitigation

1. Risk: too many UI changes at once create regressions.
- Mitigation: ship by phase and run regression checklists per phase.

2. Risk: style improvements without flow improvements.
- Mitigation: enforce “primary action + next step” acceptance on each page.

3. Risk: competition demo breaks on edge cases.
- Mitigation: prepare stable demo accounts and a scripted flow with backups.

## 9) Immediate Next Actions

1. Convert this master plan into a task board (`UXM-*` tickets).
2. Build a judge-oriented demo path checklist tied to UX improvements.
3. Execute Phase A first before adding new features.

## 10) Final Recommendation (as a user + judge)

Your project idea is strong and meaningful. To score highest, prioritize not only features but confidence of use:
- clear next steps,
- visible action feedback,
- and smooth end-to-end flow.

If users feel “I know what to do, and it works every time,” your UI/UX will become a competitive advantage.
