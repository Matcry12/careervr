# CareerGo - Hành trình hướng nghiệp số

Nền tảng hướng nghiệp toàn diện dành cho học sinh THPT Việt Nam, tích hợp trắc nghiệm RIASEC, Chatbot AI tư vấn và Trải nghiệm Nghề nghiệp (Job Simulation).

## 🚀 Tính năng

- **Trắc nghiệm RIASEC**: 50 câu hỏi chuẩn hóa để khám phá tính cách nghề nghiệp.
- **AI Career Advisor**: Chatbot thông minh (Powered by Dify AI) tư vấn lộ trình học tập và nghề nghiệp.
- **Trải nghiệm Nghề nghiệp**: Khám phá video mô phỏng thực tế các ngành nghề hot.
- **Dashboard cá nhân**: Theo dõi kết quả và thống kê.
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
3.  Deploy:
    ```bash
    vercel
    ```

**Lưu ý về dữ liệu trên Vercel**:
- Hệ thống file trên Vercel là **Read-Only**.
- Các tính năng ghi file JSON (`submissions.json`, `vr_jobs.json`) sẽ bị vô hiệu hóa hoặc không lưu trữ lâu dài.
- Dữ liệu người dùng sẽ được gửi tự động về Google Sheets (nếu đã cấu hình script).

## 📂 Cấu trúc dự án

```
careervr/
├── backend/
│   ├── data/                 # Dữ liệu JSON (Jobs, Submissions)
│   ├── static/               # Frontend (HTML, CSS, JS, Images)
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
