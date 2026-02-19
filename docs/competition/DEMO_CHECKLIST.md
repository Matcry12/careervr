# CareerGo Competition Demo Checklist

Date: 2026-02-18
Goal: run a reliable 5-7 minute judge demo focused on functionality, standout features, and student experience.

## 1) Pre-Demo Setup (T-30 to T-5 minutes)

- [ ] Server runs and `/api/health` returns OK.
- [ ] Prepare 2 accounts:
  - [ ] Student account (completed test data available)
  - [ ] Admin account (can access VR/community moderation)
- [ ] Verify internet connection for AI + YouTube.
- [ ] Open browser at `Home` in clean tab.
- [ ] Keep one backup tab with `Results` already loaded.
- [ ] Prepare fallback sentence if AI is slow:
  - "AI đang bận, tôi sẽ chuyển qua cộng đồng và quay lại AI sau."

## 2) Demo Flow Checkpoints (Live)

## A. Problem -> Solution framing (20-30s)
- [ ] Explain student pain point in 1 sentence.
- [ ] State solution stack: `RIASEC + AI + VR + Community`.

## B. Student journey (2-3 mins)
- [ ] Open `Test`:
  - [ ] Show progress/chunk flow + autosave cue.
- [ ] Open `Results`:
  - [ ] Show RIASEC profile + recommended jobs.
  - [ ] Open at least 1 career video.
  - [ ] Point to related community suggestions.
- [ ] Open `Chatbot`:
  - [ ] Show session state panel (`idle/active/sending/error` behavior).
  - [ ] Send 1 real question and show response.

## C. Community value (2 mins)
- [ ] Create 1 post.
- [ ] Add 1 comment.
- [ ] Like post.
- [ ] Mark helpful comment.
- [ ] Report post/comment.
- [ ] Show metrics/reporting-related feedback states.

## D. Admin value (1-2 mins)
- [ ] Login admin.
- [ ] Open `VR mode`:
  - [ ] Select Excel file.
  - [ ] Run import and show success/failure feedback text.
- [ ] Open `Community`:
  - [ ] Pin/unpin 1 post.
  - [ ] Show admin reports panel.

## 3) Judge-Facing Proof Points (say explicitly)

- [ ] End-to-end flow works in one product (not isolated features).
- [ ] User confidence features:
  - [ ] clear next-step panels
  - [ ] consistent success/error feedback
  - [ ] stable loading states (skeleton, no heavy jumps)
- [ ] Accessibility baseline:
  - [ ] keyboard/focus states
  - [ ] ARIA live/status/modal semantics
- [ ] Role clarity:
  - [ ] student vs admin boundaries are explicit

## 4) Fallback Plan (if live issue occurs)

- [ ] If AI fails:
  - [ ] continue with Results -> Community -> Admin flow
  - [ ] mention graceful error handling exists in UI.
- [ ] If import file fails:
  - [ ] show validation/error list and explain safe rejection.
- [ ] If network/video lags:
  - [ ] switch to prepared tab with loaded Results/Community state.

## 5) Final 20-30s Closing

- [ ] Re-state measurable value:
  - [ ] better orientation confidence for students
  - [ ] practical exploration + guided planning
  - [ ] community support + moderation for trust
- [ ] End with roadmap sentence:
  - "Bước tiếp theo của chúng tôi là mở rộng pilot và đo tác động học sinh bằng dữ liệu thực tế."

## 6) Quick Pass/Fail Gate Before Stage

- [ ] Student can complete `Test -> Results -> Chatbot -> Community` without blocking error.
- [ ] Admin can import VR jobs and see moderation section.
- [ ] All major actions show visible status (loading/success/error).
- [ ] No 500 error in critical flow.
