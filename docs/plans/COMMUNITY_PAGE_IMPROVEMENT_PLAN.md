# Community Page Improvement Plan

Date: 2026-02-16
Scope: `backend/templates/community.html`, `backend/static/js/community-profile.js`, `backend/static/style.css`, backend community APIs.
Goal: Evolve Community from basic posting into a credible, useful, competition-ready feature without high-risk complexity.

## 1) Current State (Quick Audit)

Strengths:
- Posting and commenting work.
- Author-lock with profile integration exists.
- Sorting exists (`Mới nhất`, `Cũ nhất`, `Nhiều bình luận`).
- Status feedback is present.

Weaknesses:
- No topic/tag structure, so content is hard to discover.
- No search capability.
- No "useful content" signals (likes/bookmarks/pinned).
- No moderation/report flow.
- No quality guidance for students when writing posts.
- No analytics for community impact.

## 2) Product Direction

Position Community as:
- "Peer support space for career questions"
- "Knowledge base of real student concerns"
- "Bridge between test results and action planning"

Primary user jobs:
1. Ask career questions quickly.
2. Find similar discussions fast.
3. Get trusted/organized answers.

## 3) Improvement Phases

## Phase C1 - Foundation (Low Risk, High Impact)

1. Add category tags to posts
- Examples: `Ngành học`, `Kỹ năng`, `Tuyển sinh`, `Kinh nghiệm học tập`, `Tâm lý`.
- Post form includes category selector.
- Post card shows category badge.

2. Add keyword search
- Client-side first (for current loaded posts), optional backend query later.
- Search by title/content/author/category.

3. Add post title field
- Current post body-only format is hard to scan.
- Add concise title (max ~100 chars).

4. Add “empty query” and “no results” UX
- Clear guidance if no post matches.

5. Add microcopy writing guide
- Example helper: “Viết rõ bối cảnh lớp/ngành bạn quan tâm để nhận phản hồi tốt hơn.”

Acceptance (C1):
- User can create structured post (title + category + content).
- User can find a relevant post in <15 seconds via search/filter.

## Phase C2 - Engagement and Quality

1. Add reaction signal (like/upvote)
- Simple count per post.
- Helps ranking and social proof.

2. Add “marked helpful” for comments
- Post owner can mark one comment as helpful.
- Visually highlight that answer.

3. Add report button
- Minimal report reasons: spam/off-topic/inappropriate.
- Admin review queue (simple list is enough initially).

4. Add pinned posts (admin)
- Keep FAQs or important admission notices on top.

Acceptance (C2):
- Useful content gets surfaced.
- Low-quality content has a visible handling mechanism.

## Phase C3 - Competition Polish

1. Add “Suggested discussions” block
- On results/chat pages, show relevant community topics by RIASEC/category.

2. Add community metrics card
- Number of posts, comments, helpful answers, active users.

3. Add trust cues
- Mark admin/mentor badges.
- Timestamp clarity and edit history indicator.

Acceptance (C3):
- Community is clearly connected to career guidance value, not just generic social feed.

## Phase C4 - Optional Advanced (Only if stable)

1. Semantic retrieval (pre-RAG)
- Vectorize posts and retrieve related discussions.
- Show “Bài liên quan” while writing a new post.

2. RAG assistant for community Q&A (optional)
- Ask question -> retrieve relevant posts -> answer with citations.
- Must include source links/snippets to avoid hallucination trust issues.

Decision rule:
- Do not implement full RAG unless C1-C3 are stable and demo-safe.

## 4) Technical Plan by Layer

Frontend:
- Update create form: title + category + content + search/filter bar.
- Update post cards: category badge, reaction button, helpful marker.
- Add moderation/report controls (role-aware visibility).

Backend:
- Extend post schema: `title`, `category`, `likes`, `helpful_comment_id`, `reported_flags`, `is_pinned`.
- Add endpoints:
  - search/filter query params
  - like toggle
  - mark helpful
  - report post/comment
  - pin/unpin (admin)

Data:
- Migration script for old posts (backfill defaults).
- Validate allowed categories.

## 5) Competition-Focused Priorities

Must-have before competition:
1. C1 complete.
2. At least 2 items from C2 (`like` + `helpful comment` recommended).
3. One slide with community usage evidence:
- #posts
- #comments
- avg comments/post

Nice-to-have:
- C3 page integration with results/chat.

Avoid (unless extra time):
- Full RAG pipeline.

## 6) Risks and Mitigation

1. Feature creep risk
- Mitigation: lock C1 first; no C4 until C1-C3 pass QA.

2. Moderation overhead
- Mitigation: start with lightweight report queue and simple admin actions.

3. Performance with many posts
- Mitigation: pagination + backend filtering.

4. Data inconsistency from schema changes
- Mitigation: add migration + default fallback handling.

## 7) Success Metrics

Product metrics:
- Post creation conversion rate.
- Comment rate per post.
- Search/filter usage rate.
- Helpful answer mark rate.

Quality metrics:
- Reported content rate.
- Response time to first comment.

Competition metrics:
- Demo reliability: zero failure in community flow.
- Judge clarity: community purpose explained in <30 seconds.

## 8) Recommended Next Sprint (7-10 days)

Day 1-2:
- Add post title + category + migration.

Day 3:
- Add search/filter UI and backend query support.

Day 4:
- Add like/upvote.

Day 5:
- Add mark helpful comment.

Day 6:
- QA + bugfix + data seeding for demo.

Day 7:
- Add community metrics widget + update demo slides.
