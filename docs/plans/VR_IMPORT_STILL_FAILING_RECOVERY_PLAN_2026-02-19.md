# VR Import Still Failing - Recovery Plan (2026-02-19)

## 1) Problem
Import Excel vẫn báo lỗi `Missing or invalid Video URL` dù backend hiện tại đã có fallback URL.

## 2) Reality Check (code hiện có)
- Endpoint import duy nhất: `backend/main.py` (`POST /api/vr-jobs/import`).
- Frontend gọi đúng endpoint: `backend/static/js/vr.js`.
- Chuỗi lỗi `Missing or invalid Video URL` không còn trong source backend/frontend hiện tại.

=> Khả năng cao lỗi đến từ runtime cũ hoặc API instance khác.

## 3) Goals
1. Xác nhận chắc chắn request đang đi vào đúng runtime code mới.
2. Đảm bảo import không fail khi `Video URL` rỗng/sai định dạng.
3. Chuẩn hóa phản hồi UI: lỗi thật là `errors`, URL fallback là `warnings`.

## 4) Root-Cause Hypotheses
1. Backend process chưa restart hoặc đang chạy image cũ.
2. Frontend đang gọi nhầm `API_BASE` (local/staging/prod lẫn nhau).
3. Browser cache/service worker giữ JS cũ.
4. File Excel thiếu/sai header hoặc dữ liệu gây fail từ rule khác, nhưng UI hiển thị gây hiểu nhầm.

## 5) Recovery Plan

### Phase A - Runtime Truth (bắt buộc)
- A1. Gắn `import_runtime_version` vào response của `/api/vr-jobs/import`.
- A2. Gắn cùng field vào `/api/health` để đối chiếu nhanh.
- A3. Restart backend, hard refresh trình duyệt, import lại và xác nhận version mới xuất hiện trên Network response.

### Phase B - API Path Integrity
- B1. In debug line trong frontend import (dev only): request URL thực tế + status code + `import_runtime_version`.
- B2. Kiểm tra `API_BASE` đang dùng ở runtime (console).
- B3. Nếu sai môi trường, sửa cấu hình env và build lại frontend.

### Phase C - Backend Hardening
- C1. `Video URL` trở thành optional trong import:
  - Nếu cột có nhưng trống/sai -> fallback + warning.
  - Nếu cột thiếu hoàn toàn -> vẫn import, dùng fallback + warning tổng.
- C2. `normalize_vr_job_record` luôn trả về `videoId` hợp lệ bằng fallback khi parse thất bại.
- C3. Thêm thống kê phản hồi:
  - `warnings_count`, `errors_count`, `import_runtime_version`.

### Phase D - Frontend UX Safety
- D1. Hiển thị rõ 3 trạng thái sau import:
  - Success summary (created/updated/skipped)
  - Warning panel (không chặn)
  - Error panel (dòng bị skip)
- D2. Nếu server trả `status=success` nhưng có warning, không hiển thị toast lỗi.

### Phase E - Verification Matrix
- E1. File chuẩn có URL đầy đủ -> success, warning=0.
- E2. File URL trống vài dòng -> success, warning>0, không fail.
- E3. File URL sai định dạng -> success, warning>0, không fail.
- E4. File thiếu cột `Video URL` -> success, warning tổng + warning theo dòng.
- E5. File thiếu `Job Title` hoặc `RIASEC_Code` -> chỉ các dòng lỗi bị skip (đúng expected).

## 6) Task List
- VR-IMP-REC-01: Add runtime version marker (`/api/vr-jobs/import`, `/api/health`).
- VR-IMP-REC-02: Make `Video URL` column optional in import pipeline.
- VR-IMP-REC-03: Harden `normalize_vr_job_record` fallback guarantee for `videoId`.
- VR-IMP-REC-04: Frontend import response rendering split: success/warning/error.
- VR-IMP-REC-05: Run verification matrix E1-E5 and log results.

## 7) Acceptance Criteria
- Không còn trường hợp import fail chỉ vì `Video URL` rỗng/sai.
- Network response luôn có `import_runtime_version` để xác nhận runtime.
- UI phân tách rõ warning vs error, tránh hiểu nhầm thất bại.
- Kịch bản E1-E5 pass.
