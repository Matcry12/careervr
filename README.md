# CareerGo - Hành trình hướng nghiệp số

Nền tảng hướng nghiệp toàn diện dành cho học sinh THPT Việt Nam, tích hợp trắc nghiệm RIASEC, Chatbot AI tư vấn và Trải nghiệm Nghề nghiệp (Job Simulation).

## 🚀 Tính năng

- **Trắc nghiệm RIASEC**: 50 câu hỏi chuẩn hóa để khám phá tính cách nghề nghiệp.
- **AI Career Advisor**: Chatbot thông minh (Powered by Dify AI) tư vấn lộ trình học tập và nghề nghiệp.
- **Trải nghiệm Nghề nghiệp**: Khám phá video mô phỏng thực tế các ngành nghề hot.
- **Dashboard cá nhân**: Theo dõi kết quả và thống kê.
- **UI/UX mới**:
  - Điều hướng responsive với menu mobile.
  - Form validation và trạng thái phản hồi inline (không phụ thuộc alert).
  - Khu vực gợi ý nghề rõ ràng theo nhóm `Ưu tiên` và `Dự phòng`.
  - VR admin import theo panel có trạng thái import/lỗi theo hàng.
  - Cải thiện accessibility cơ bản: focus-visible, keyboard modal close, live regions.
- **Chế độ Dev (Test Mode)**: Hỗ trợ điền nhanh trắc nghiệm để kiểm tra tính năng (Kích hoạt bằng `Shift + D`).

## 🛠️ Cài đặt & Chạy Local

### Yêu cầu
- Python 3.9+
- Tài khoản Dify AI (để lấy API Key)

### Các bước cài đặt

1.  **Clone dự án**
    ```bash
    git clone https://github.com/nthuthuy020979-nvh/careervr.git
    cd careervr
    ```

2.  **Cấu hình môi trường**
    Tạo file `.env` tại thư mục gốc:
    ```env
    DIFY_API_KEY=your_dify_api_key
    DIFY_CHAT_URL=https://api.dify.ai/v1/chat-messages
    MONGODB_URI=your_mongodb_connection_string (Optional - for Cloud Persistence)
    ```

3.  **Cài đặt dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Chạy ứng dụng**
    ```bash
    python3 backend/main.py
    # Hoặc: uvicorn backend.main:app --reload
    ```
    Truy cập: `http://localhost:8000`

## ☁️ Triển khai lên Vercel

Dự án đã được cấu hình sẵn để triển khai lên Vercel.

1.  Cài đặt Vercel CLI hoặc kết nối GitHub với Vercel.
2.  Thêm biến môi trường trên Vercel:
    - `DIFY_API_KEY`
    - `DIFY_CHAT_URL`
    - `MONGODB_URI` (Khuyên dùng MongoDB Atlas để lưu dữ liệu)
3.  Deploy:
    ```bash
    vercel
    ```

**Lưu ý về dữ liệu**:
- **Local Dev**: Nếu không có `MONGODB_URI`, dữ liệu sẽ lưu vào `backend/data/*.json`.
- **Vercel**: Bắt buộc dùng `MONGODB_URI` để lưu trữ bền vững. Nếu không, dữ liệu sẽ bị mất do tính chất Read-Only của Vercel.


## 📂 Cấu trúc dự án

```
careervr/
├── backend/
│   ├── data/                 # Dữ liệu JSON (Jobs, Submissions)
│   ├── static/
│   │   ├── style.css         # Design tokens + UI component styles
│   │   └── js/               # Frontend JS modules (core/chat/vr/test/community/init)
│   ├── templates/            # Jinja pages
│   ├── main.py               # FastAPI App Entry point
│   └── riasec_calculator.py  # Logic tính toán điểm
├── requirements.txt          # Python dependencies
├── vercel.json               # Cấu hình Vercel
└── README.md                 # Tài liệu hướng dẫn
```

## 🧪 Chế độ Dev (Developer Mode)

Để hỗ trợ kiểm thử nhanh:
- Nhấn **Shift + D** trên trang web để bật/tắt chế độ Dev.
- Khi bật, nút **"⚡ Dev Fill"** sẽ xuất hiện trong phần trắc nghiệm, giúp điền ngẫu nhiên 50 câu hỏi và nộp bài ngay lập tức.

## License
MIT
