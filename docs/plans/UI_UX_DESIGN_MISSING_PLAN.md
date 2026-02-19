# UI/UX Design Gap Plan (User + Designer Perspective)

Date: 2026-02-16
Scope: Current pages under `backend/templates/*` and active frontend runtime under `backend/static/js/*`, `backend/static/style.css`.

## 1) What Feels Missing / Confusing Globally

1. User journey is not explicit.
- Current feeling: user can open many pages directly but does not know the intended order (`Test -> Results -> VR -> Chat`).
- Improve:
  - Add a persistent step indicator on top of authenticated pages.
  - Add contextual "next best action" CTA on each page.

2. Permission model is hidden and causes confusion.
- Current feeling: admin features appear/disappear without clear explanation until user reaches page.
- Improve:
  - Add visible role badge in header (`Học sinh` / `Admin`).
  - Disable protected actions with helper text instead of abrupt hidden-only behavior.

3. Feedback style is inconsistent.
- Current feeling: some flows use inline status, others still use confirm dialogs; mental model is inconsistent.
- Improve:
  - Standardize all confirmations/status to one pattern (inline status + modal confirm component).
  - Ensure upload/import actions always show: file selected state, importing state, and success/failure summary.

4. Terminology is mixed.
- Current feeling: "VR", "Trải nghiệm nghề nghiệp", "Video nghề", "Ngành gợi ý" are used inconsistently.
- Improve:
  - Define and apply one copy glossary for labels, buttons, and section titles.

5. Visual hierarchy still feels dense on data-heavy pages.
- Current feeling: cards/charts exist but no clear priority of where to look first.
- Improve:
  - Introduce consistent section headers, summaries, and empty-state guidance blocks.

## 2) Page-by-Page Issues and Improvements

## 2.1 Landing (`backend/templates/index.html`)

Issues / misunderstandings:
1. Secondary CTA `Xem thống kê` is visible to non-admin users and leads to access denial later.
2. No clear onboarding cue that login is required before full experience.
3. Feature cards are descriptive but not actionable (not clickable).

Should improve:
1. Replace secondary CTA for non-admin with `Đăng nhập để bắt đầu` or `Xem kết quả mẫu`.
2. Add "Bạn cần tài khoản để lưu kết quả" helper line under main CTA.
3. Make feature cards clickable to related pages with guardrails.

## 2.2 Test (`backend/templates/test.html`)

Issues / misunderstandings:
1. 50-question form feels long with no section chunk navigation.
2. `Dev Fill` appears in UI logic for admin, not clearly separated from production behavior.
3. No autosave indicator for in-progress answers.

Should improve:
1. Split questions into sections with sticky mini-nav and "continue" progress.
2. Gate developer controls behind explicit dev mode toggle, never visible in normal admin flow.
3. Add autosave state text (`Đã lưu lúc HH:MM`) and resume prompt.

## 2.3 Results (`backend/templates/results.html`)

Issues / misunderstandings:
1. Difference between "Nhóm ưu tiên" and "Nhóm dự phòng" is visual but not explained.
2. Video-open behavior is clickable but not strongly communicated for every card state.
3. No "what to do next" suggestions after reading results.

Should improve:
1. Add short explanation block: how priority/backup should be used in decision making.
2. Add explicit CTA button in each card (`Xem mô phỏng nghề`).
3. Add next-step panel: `Làm lại test`, `Mở VR`, `Hỏi AI`.

## 2.4 Chatbot (`backend/templates/chatbot.html`)

Issues / misunderstandings:
1. Two entry actions (`Yêu cầu tư vấn` and free text `Gửi`) can confuse first-time users.
2. `loadingIndicator` element exists but interaction mainly uses overlay; duplicate mental cues.
3. Conversation state persistence is opaque (no clear session status).

Should improve:
1. First-time lock input until "Yêu cầu tư vấn" starts session; show clear instruction.
2. Use one loading pattern only (inline typing indicator inside chat stream).
3. Show session banner (`Phiên tư vấn đang hoạt động`) with restart action.

## 2.5 VR Mode (`backend/templates/vr.html`)

Issues / misunderstandings:
1. Admin panel visibility depends on role classes and hidden containers; users often think features are broken.
2. Import workflow is functional but still crowded (template/download/select/import/reset together).
3. If no jobs are available, page can feel empty with no guidance.
4. Modal forms contain dense fields without inline constraints examples.
5. Import state is unclear: user cannot tell whether file selection worked and whether import succeeded.

Should improve:
1. Always show panel shell; for non-admin display disabled controls + "Cần quyền Admin".
2. Split admin panel into two tabs: `Thêm thủ công` and `Import Excel`.
3. Add explicit empty state in grid (`Chưa có video nghề, vui lòng quay lại sau`).
4. Add field-level helper and validation hints directly below each input.
5. Add explicit import feedback states:
  - Show selected filename immediately after file pick (`Đã chọn: <filename>`).
  - Disable import button until a valid file is selected.
  - Show importing progress state (`Đang import...`).
  - Show success panel with counts (`Tạo mới / Cập nhật / Bỏ qua`) and timestamp.
  - Keep latest import history block (`Lần import gần nhất`) so user can verify result later.

## 2.6 Community (`backend/templates/community.html`)

Issues / misunderstandings:
1. Author field behavior changes after login (locked by JS) but no explanation in UI.
2. Thread depth and sorting are implicit; user cannot choose sort (`mới nhất`, `nhiều bình luận`).
3. No moderation/report controls visible.

Should improve:
1. Add helper under author field: "Tên lấy từ hồ sơ cá nhân" when locked.
2. Add sort/filter controls above posts.
3. Add lightweight report action and content guideline microcopy.

## 2.7 Dashboard (`backend/templates/dashboard.html`)

Issues / misunderstandings:
1. Non-admin users can reach page and only then see denial message.
2. Large chart set lacks summary insight block (user must infer meaning manually).
3. Clear-data action is high-risk and lacks contextual warning tone.

Should improve:
1. Route-guard dashboard from navigation/landing for non-admin before entry.
2. Add top summary cards (`Tổng bài nộp`, `RIASEC phổ biến`, `xu hướng tuần`).
3. Convert dangerous action to two-step confirmation modal with consequence text.

## 2.8 Auth + Profile (`backend/templates/login.html`, `backend/templates/signup.html`, `backend/templates/profile.html`)

Issues / misunderstandings:
1. Auth forms lack clear password policy text before submit.
2. No "show password" toggle for usability.
3. Profile save feedback exists but success/failure state is not sticky enough and no dirty-state warning.

Should improve:
1. Display password requirements upfront on signup.
2. Add show/hide password toggle on login/signup.
3. Add unsaved-changes detection and persistent save confirmation.

## 3) Priority Plan (Implementation Order)

## Phase P0 (Critical UX Clarity)
1. Fix landing CTA role confusion.
2. Add explicit journey/next-action blocks in Test, Results, VR, Chat.
3. Unify session/loading behavior in Chat.
4. VR admin panel redesign for visible permission messaging.
5. Dashboard pre-entry guard for non-admin.

## Phase P1 (Flow Quality)
1. Test section chunking + autosave indicator.
2. Results action buttons per recommendation card.
3. Community author-lock explanation + sort controls.
4. Auth show-password and policy hints.

## Phase P2 (Trust and Safety Polish)
1. Dashboard summary insights and safer destructive action UX.
2. Profile unsaved-change warnings.
3. Terminology unification pass across pages.

## 4) Task Board Seed (Ready to Convert)

1. UXD-001: User Journey Stepper + Next Action Blocks (P0)
2. UXD-002: Role-aware CTA/Guardrails on Landing and Dashboard (P0)
3. UXD-003: Chat Session Model Simplification (P0)
4. UXD-004: VR Admin Workflow Split + Empty States (P0)
5. UXD-004A: Import Visibility and Confirmation UX (P0)
6. UXD-005: Test Chunking + Autosave Feedback (P1)
7. UXD-006: Results Card Action Clarity (P1)
8. UXD-007: Community Sorting + Identity Clarity (P1)
9. UXD-008: Auth Form Usability Upgrade (P1)
10. UXD-009: Dashboard Insights + Safe Destructive UX (P2)
11. UXD-010: Profile Dirty-State + Confirmation Quality (P2)

## 5) Acceptance Criteria for This Plan

1. New users can identify the recommended flow within 5 seconds on each core page.
2. Non-admin users never experience "surprise denial" after clicking promoted actions.
3. Admin features in VR are discoverable, understandable, and explicitly permission-scoped.
4. Chat users understand when a session starts, is active, and resets.
5. Data-heavy pages provide summary-first reading, then details.
