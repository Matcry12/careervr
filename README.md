# CareerGo - Hành trình hướng nghiệp số

Nền tảng hướng nghiệp sử dụng trắc nghiệm RIASEC, Chatbot AI và Trải nghiệm Nghề nghiệp dành cho học sinh THPT Việt Nam.

## Tính năng

- **Trắc nghiệm RIASEC**: 50 câu hỏi khoa học để đánh giá sở thích, kỹ năng và tính cách.
- **AI Chatbot**: Tư vấn hướng nghiệp thông minh sử dụng Dify API.
- **Kết quả Cá nhân hóa**: Đề xuất ngành nghề phù hợp dựa trên điểm số.
- **Trải nghiệm Nghề nghiệp**: Khám phá môi trường làm việc qua video mô phỏng.
- **Dashboard**: Thống kê và quản lý dữ liệu cá nhân.

## Cấu trúc Dự án

```
careervr/
├── backend/                  # FastAPI Backend & Static Files
│   ├── main.py               # Ứng dụng chính (API + phục vụ Static)
│   ├── static/               # Frontend (HTML/CSS/JS)
│   │   ├── index_redesigned_v2.html  # Giao diện chính
│   │   └── ...
│   ├── requirements.txt      # Thư viện Python
│   └── ...
├── docker-compose.yml        # Cấu hình Docker
├── DEPLOY.sh                 # Script triển khai
└── README.md                 # Tài liệu này
```

## Cài đặt & Chạy Local

### Yêu cầu
- Python 3.8+
- Dify API Key (Tạo `.env` file)

### Các bước
1.  **Clone dự án**
    ```bash
    git clone https://github.com/nthuthuy020979-nvh/careervr.git
    cd careervr
    ```

2.  **Cấu hình biến môi trường**
    Tạo file `.env` tại thư mục `backend/.env` hoặc gốc (tùy cấu hình docker):
    ```env
    DIFY_API_KEY=your_dify_api_key_here
    ```

3.  **Chạy Backend (bao gồm Frontend)**
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```

4.  **Truy cập**
    Mở trình duyệt: `http://localhost:8000`

## Triển khai (Deployment)

### Docker
Dự án có sẵn `docker-compose.yml`.
```bash
docker-compose up --build -d
```

### Railway / Cloud
- Dự án được cấu hình để deploy dễ dàng lên Railway hoặc các nền tảng hỗ trợ Docker/Python.
- Đảm bảo thiết lập biến môi trường `DIFY_API_KEY` trên server.

## API Endpoints chính
- `GET /health`: Kiểm tra trạng thái server.
- `GET /`: Trang chủ ứng dụng.
- Dữ liệu trắc nghiệm và lịch sử chat được lưu trữ cục bộ (LocalStorage) hoặc qua API tùy cấu hình.

## License
MIT
