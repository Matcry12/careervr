# Community Extra Bugs Audit (2026-02-19)

Scope: additional issues discovered beyond the 4 already identified by user.

## Findings (Ordered by Severity)

### 1) Feed summary numbers are misleading with pagination (Medium)
- File: `backend/static/js/community-profile.js:129`
- File: `backend/static/js/community-profile.js:889`
- Problem:
  - `updateCommunityFeedSummary(total, visible)` is called with the same value for both args (`COMMUNITY_POST_CACHE.length`).
  - On paginated views this can imply “all posts shown” while only one page is loaded.
- Impact:
  - Users can misunderstand how many results actually match/search.
- Suggested fix:
  - Return/track true total count from API, then pass `total_count` and `visible_count` separately.

### 2) Sidebar navigation has non-semantic clickable `div` items (Medium, accessibility)
- File: `backend/templates/community.html:37`
- File: `backend/templates/community.html:41`
- Problem:
  - `AI Mentor` and `Hồ sơ của tôi` entries are clickable `div`s, not `button`/`a`.
- Impact:
  - Poor keyboard accessibility and weaker semantics.
- Suggested fix:
  - Convert to `<button type="button">` (or `<a href>`), maintain same styling.

### 3) Metrics grid density is too high for narrow sidebar (Medium)
- File: `backend/static/style.css:953`
- File: `backend/static/style.css:959`
- Problem:
  - `community-metrics-grid` uses 4 columns inside narrow left sidebar.
  - Cards become very narrow, hard to read, and visually cramped.
- Impact:
  - High scan cost and perceived UI “tightness”.
- Suggested fix:
  - Use 2 columns (or responsive `repeat(auto-fit, minmax(...))`) for sidebar metrics.

### 4) Delete status message is injected inside action row, causing row jitter (Medium)
- File: `backend/static/js/community-profile.js:943`
- File: `backend/static/js/community-profile.js:955`
- Problem:
  - `renderPostDeleteStatusSlot(post.id)` renders inline within button group.
  - On confirm/error states, action row height/layout changes unexpectedly.
- Impact:
  - Buttons shift and layout feels unstable.
- Suggested fix:
  - Render delete status in a dedicated block under action row.

### 5) Admin report lines lack long-text wrapping guard (Low/Medium)
- File: `backend/static/style.css:2052`
- Problem:
  - `.community-report-line` has no explicit wrap safeguards.
  - Long detail text/URLs may overflow or create ugly wrapping.
- Impact:
  - Report list readability degrades for long content.
- Suggested fix:
  - Add `overflow-wrap: anywhere; word-break: break-word;`.

### 6) Composer trigger still shows placeholder avatar without real data flow (Low)
- File: `backend/templates/community.html:63`
- File: `backend/static/style.css:1327`
- Problem:
  - Avatar circle suggests profile image support, but no actual avatar source is wired.
- Impact:
  - UI expectation mismatch.
- Suggested fix:
  - Either remove avatar circle now, or add end-to-end avatar feature later.

### 7) Error fallback in posts load uses inline style (Low)
- File: `backend/static/js/community-profile.js:987`
- Problem:
  - Uses hardcoded inline red color in error markup.
- Impact:
  - Inconsistent design token usage and style maintenance.
- Suggested fix:
  - Replace with standard status class (`status status-error`) block.

## Suggested Next Debug/Fix Order
1. Fix #1 (summary accuracy)
2. Fix #2 (sidebar semantics/accessibility)
3. Fix #3 (metrics readability)
4. Fix #4 (delete status row jitter)
5. Fix #5/#7 (text wrap + style consistency)
6. Handle #6 via chosen avatar strategy
