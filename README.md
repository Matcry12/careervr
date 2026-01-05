# CareerVR - Nền tảng Hướng nghiệp AI & VR

Một ứng dụng web hỗ trợ học sinh phổ thông Việt Nam khám phá định hướng nghề nghiệp dựa trên trắc nghiệm RIASEC và tư vấn AI.

## Tính năng

- 📋 **Trắc nghiệm RIASEC**: 50 câu hỏi về sở thích, tính cách, năng lực và giá trị cá nhân
- 🤖 **Chatbot AI**: Tư vấn hướng nghiệp thông minh dựa trên kết quả RIASEC
- 📊 **Dashboard**: Thống kê kết quả theo trường, lớp học
- 💾 **Lưu trữ Local**: Dữ liệu được lưu trên trình duyệt (LocalStorage)
- 📱 **Responsive Design**: Hoạt động tốt trên mọi thiết bị

## Cấu trúc Dự án

```
careervr/
├── index.html              # Giao diện RIASEC (phiên bản cơ bản)
├── index1.html             # Giao diện CareerVR (phiên bản hoàn chỉnh)
├── backend/
│   ├── main.py             # FastAPI backend
│   └── requirements.txt     # Dependencies Python
└── README.md
```

## Cài đặt

### Frontend (HTML/JavaScript)

Không cần cài đặt. Mở trực tiếp file `index1.html` trong trình duyệt hoặc deploy lên server tĩnh.

**Yêu cầu:**
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled

### Backend (FastAPI)

**Yêu cầu:**
- Python 3.8+
- pip

**Bước 1**: Cài đặt dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Bước 2**: Cấu hình biến môi trường

Tạo file `.env` hoặc export các biến:

```bash
export DIFY_API_KEY="your-dify-api-key-here"
```

**Bước 3**: Chạy server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server sẽ chạy tại `http://localhost:8000`

## API Endpoints

### GET `/health`
Kiểm tra trạng thái server

**Response:**
```json
{
  "status": "ok",
  "message": "CareerVR backend is running"
}
```

### POST `/run-riasec`
Xử lý kết quả trắc nghiệm RIASEC

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "class": "10A1",
  "school": "THPT ...",
  "answers_json": [1, 2, 3, 4, 5, ...]
}
```

**Validation:**
- `name`, `class`, `school`: không được để trống
- `answers_json`: phải có đúng 50 phần tử
- Mỗi câu trả lời: từ 1 đến 5

**Response:**
```json
{
  "data": {
    "outputs": {
      "text": "Kết quả tư vấn từ Dify AI..."
    }
  }
}
```

## Bugs đã sửa (v1.1)

1. ✅ **Backend validation**: Thêm validators cho form data
2. ✅ **Security**: API key từ environment variables (không hardcode)
3. ✅ **Frontend bug**: Sửa undefined element reference (`chatSuggest`)
4. ✅ **UX improvement**: Cập nhật text về yêu cầu 50 câu
5. ✅ **Error handling**: Tính năng xác thực trường form đầy đủ
6. ✅ **Health check**: Thêm endpoint `/health` để kiểm tra server

## Cấu hình Dify AI

1. Đăng ký tài khoản tại https://dify.ai
2. Tạo một Workflow hoặc Knowledge Base về hướng nghiệp
3. Lấy API key từ Settings
4. Cập nhật `DIFY_API_KEY` environment variable

## Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-----------|----------|
| 400 Bad Request | Dữ liệu form không đúng | Kiểm tra 50 câu trả lời, tên/lớp/trường không trống |
| 500 Server Error | Lỗi kết nối Dify | Kiểm tra DIFY_API_KEY, kết nối Internet |
| CORS Error | Backend không cho phép origin | Kiểm tra middleware CORS |
| Không kết nối backend | URL sai hoặc server down | Kiểm tra `API_URL` trong index.html, test `/health` endpoint |

## Phát triển tiếp

- [ ] Thêm VR experience simulation cho các ngành
- [ ] Export kết quả thành PDF
- [ ] Multi-language support
- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] Admin dashboard
- [ ] Integration với hệ thống tuyển sinh

## Giấy phép

MIT License

## Liên hệ

Dự án CareerVR - Giúp học sinh định hướng tương lai
