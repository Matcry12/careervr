# Community Feature Task Board

Date: 2026-02-16
Source: `docs/plans/COMMUNITY_PAGE_IMPROVEMENT_PLAN.md`
Status: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`
Priority: `P0` critical | `P1` high | `P2` medium

---

## Milestone C1 - Foundation (Competition Must-Have)
Goal: make community searchable, structured, and easier to scan.

### COM-001 - Add post title field
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend + Backend
- Depends on: none
- Scope:
  - Add title input in create-post form.
  - Persist `title` in post model/API.
  - Render title in post cards.
- Acceptance:
  - User can create/read posts with explicit titles.

### COM-002 - Add post categories
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend + Backend
- Depends on: COM-001
- Scope:
  - Add category selector in create form.
  - Validate category list in backend.
  - Render category badge in post cards.
- Acceptance:
  - Every new post has a valid category.

### COM-003 - Add keyword search and filter UI
- Status: `DONE`
- Priority: `P0`
- Owner: Frontend
- Depends on: COM-001, COM-002
- Scope:
  - Search input (title/content/author).
  - Category filter + existing sort integration.
  - No-result state messaging.
- Acceptance:
  - User can find relevant posts in <15 seconds.

### COM-004 - Add backend query support for search/filter
- Status: `DONE`
- Priority: `P1`
- Owner: Backend
- Depends on: COM-003
- Scope:
  - Optional query params for search/category/sort.
  - Return filtered/paginated results.
- Acceptance:
  - Filtering works server-side consistently.

### COM-005 - Add migration/defaults for legacy posts
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: COM-001, COM-002
- Scope:
  - Backfill missing `title`, `category`, `likes`, etc.
  - Ensure old posts render without errors.
- Acceptance:
  - Existing data remains usable after schema upgrade.

### COM-006 - Improve post writing guidance microcopy
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend/UX
- Depends on: none
- Scope:
  - Add helper text for better question quality.
  - Add concise content-quality hints.
- Acceptance:
  - User sees clear writing guidance before posting.

---

## Milestone C2 - Engagement and Quality
Goal: surface useful answers and add basic moderation.

### COM-101 - Add like/upvote for posts
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend + Backend
- Depends on: C1 completed
- Scope:
  - Like toggle endpoint + UI counter.
  - Persist counts per post.
- Acceptance:
  - Users can react and ranking can use signal.

### COM-102 - Add mark-helpful comment
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend + Backend
- Depends on: C1 completed
- Scope:
  - Post owner can mark one comment as helpful.
  - Highlight helpful answer in UI.
- Acceptance:
  - Helpful answer is clearly visible.

### COM-103 - Add report flow (post/comment)
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend + Backend
- Depends on: C1 completed
- Scope:
  - Report button + reason selection.
  - Store report flags for admin review.
- Acceptance:
  - Users can report inappropriate content.

### COM-104 - Add pinned posts (admin)
- Status: `DONE`
- Priority: `P2`
- Owner: Frontend + Backend
- Depends on: COM-103
- Scope:
  - Admin pin/unpin actions.
  - Pinned posts shown first.
- Acceptance:
  - Important notices stay visible at top.

---

## Milestone C3 - Competition Polish
Goal: connect community value directly to career guidance outcomes.

### COM-201 - Suggested discussions in results/chat
- Status: `DONE`
- Priority: `P2`
- Owner: Frontend + Backend
- Depends on: C1 completed
- Scope:
  - Show related community posts by category/RIASEC context.
- Acceptance:
  - Users can jump from guidance pages to relevant discussions.

### COM-202 - Community metrics widget
- Status: `DONE`
- Priority: `P1`
- Owner: Backend + Frontend
- Depends on: C1 completed
- Scope:
  - Show #posts, #comments, engagement summary.
- Acceptance:
  - Metrics available for demo and impact slide.

### COM-203 - Trust badges (admin/mentor)
- Status: `DONE`
- Priority: `P2`
- Owner: Frontend + Backend
- Depends on: COM-002
- Scope:
  - Role badge rendering on author names.
- Acceptance:
  - Users can identify authoritative responses.

---

## Milestone C4 - Optional Advanced (Only if Stable)
Goal: improve retrieval depth without harming demo reliability.

### COM-301 - Semantic related-post retrieval
- Status: `DONE`
- Priority: `P2`
- Owner: Backend/AI
- Depends on: C1-C3 stable
- Scope:
  - Retrieve semantically related posts while drafting/viewing.
- Acceptance:
  - Related suggestions are relevant and fast.

### COM-302 - Community RAG assistant with citations
- Status: `DONE`
- Priority: `P2`
- Owner: Backend/AI
- Depends on: COM-301
- Scope:
  - Q&A over community corpus with source links/snippets.
- Acceptance:
  - Answers include citations and are demo-safe.

---

## Milestone C5 - Community UX Simplification Sprint (Next Coding Batch)
Goal: reduce UI clutter, make post interaction cleaner, and improve feed scalability.

### COM-401 - Move chatbot community suggestions panel to bottom
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: none
- Scope:
  - On `chatbot` page, reposition `community-suggest panel panel-soft` below chat interaction/status section.
  - Keep existing IDs and JS data-loading behavior unchanged.
- Acceptance:
  - Panel appears at bottom and still loads related suggestions normally.

### COM-402 - Unify community discovery + RAG into one section
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend + Backend
- Depends on: COM-301, COM-302
- Scope:
  - Merge `Khám phá thảo luận` and `Hỏi đáp cộng đồng (RAG)` into one unified entry section.
  - Provide two modes/tabs:
    - `Tìm bài thảo luận`
    - `Hỏi cộng đồng (RAG)`
  - Keep backend APIs separated; only unify UI entry.
- Acceptance:
  - User can switch modes clearly without losing current query context.

### COM-403 - Replace full create form with compact composer + modal
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: COM-402
- Scope:
  - Replace inline `Tạo bài viết mới` with compact trigger (Facebook-like).
  - Clicking trigger opens full composer modal with title/category/content/related suggestions/status.
  - Preserve existing autosave behavior and post submission logic.
- Acceptance:
  - Page height/visual density reduced; compose flow still complete and reliable.

### COM-404 - Add delete post action with permission rules
- Status: `DONE`
- Priority: `P1`
- Owner: Backend + Frontend
- Depends on: COM-403
- Scope:
  - Add delete button per post.
  - Permission:
    - post owner can delete own post
    - admin can delete any post
  - Add confirmation modal + status feedback.
- Acceptance:
  - Unauthorized delete is blocked; authorized delete works with visible confirmation.

### COM-405 - Summary-first feed cards + detail view
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: COM-403
- Scope:
  - Feed shows concise summaries (title, author, timestamp, short excerpt, counters).
  - Full content appears in detail view (`Xem chi tiết`) via modal or detail panel.
- Acceptance:
  - Feed scan is faster; full post content remains accessible in one click.

### COM-406 - Chunked/paginated post loading
- Status: `DONE`
- Priority: `P0`
- Owner: Backend + Frontend
- Depends on: COM-405
- Scope:
  - Load posts in chunks/pages (target 10-20 per batch).
  - Add `Xem thêm` or pagination controls.
  - Keep filter/search/sort compatible with pagination state.
- Acceptance:
  - Long feed no longer causes heavy initial load; pagination state is stable.

### COM-407 - Move delete action to summary card (no popup flow)
- Status: `DONE`
- Priority: `P1`
- Owner: Frontend
- Depends on: COM-405
- Scope:
  - Show delete button directly on summary cards for authorized users.
  - Remove popup delete flow and replace with inline 2-click confirmation.
  - Keep detail view delete path using same no-popup delete logic.
- Acceptance:
  - User can delete from summary without opening detail modal or popup.
  - Delete confirmation is explicit and low-risk.

### COM-408 - Harden delete permission for legacy ownership records
- Status: `DONE`
- Priority: `P0`
- Owner: Backend
- Depends on: COM-404
- Scope:
  - Keep owner/admin policy unchanged but support legacy posts missing modern `owner_actor` mapping.
  - Improve ownership matching with `author_username`/normalized author fallback when authenticated actor is valid owner.
  - Expose `can_delete` in post payload for frontend consistency.
- Acceptance:
  - Legitimate owners can delete older posts.
  - Non-owners remain blocked with 403.

### COM-QA-03 - UX simplification regression pass
- Status: `TODO`
- Priority: `P0`
- Owner: QA
- Depends on: COM-401, COM-402, COM-403, COM-404, COM-405, COM-406, COM-407, COM-408
- Scope:
  - Validate create/delete/detail/pagination/search/RAG-mode switching.
  - Validate role permissions for delete and admin views.
- Acceptance:
  - No critical regression in community and chatbot core flows.

### COM-DOC-02 - Update demo checklist/script for new community UX
- Status: `TODO`
- Priority: `P1`
- Owner: Docs/Product
- Depends on: COM-QA-03
- Scope:
  - Update `docs/competition/DEMO_SCRIPT.md` and `docs/competition/DEMO_CHECKLIST.md`.
  - Add concise talking points for unified discovery+RAG and modal composer.
- Acceptance:
  - Demo assets reflect new UX flow and fallback instructions.

---

## QA and Release Tasks

### COM-QA-01 - Community flow smoke tests
- Status: `BLOCKED`
- Priority: `P0`
- Owner: QA
- Depends on: C1 implementation
- Acceptance:
  - Create/search/filter/comment works without regressions.
- Note: Blocked in this container due runtime smoke test timeout/DNS restriction path; see `docs/reports/COMMUNITY_QA_REPORT_2026-02-18.md`.

### COM-QA-02 - Role and moderation checks
- Status: `DONE`
- Priority: `P1`
- Owner: QA
- Depends on: C2 implementation
- Acceptance:
  - Admin and user permissions behave correctly.
- Note: Security hardening patch applied; see `docs/reports/COMMUNITY_ROLE_MODERATION_QA_2026-02-18.md`.

### COM-DOC-01 - Update docs and demo script
- Status: `DONE`
- Priority: `P1`
- Owner: Docs/Product
- Depends on: C1-C2 implementation
- Acceptance:
  - README + demo script reflect new community capabilities.
