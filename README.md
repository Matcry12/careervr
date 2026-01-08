# CareerVR – Nền tảng Hướng nghiệp AI & VR

Career guidance platform using RIASEC testing, AI chatbot, and VR experiences for Vietnamese high school students.

## Project Structure

```
careervr/
├── frontend/                 # Static frontend (Deploy to Vercel)
│   ├── index_redesigned_v2.html  # Main app
│   ├── package.json
│   └── ...
├── backend/                  # FastAPI backend (Deploy to Railway)
│   ├── main.py
│   ├── requirements.txt
│   └── Procfile
├── vercel.json              # Vercel configuration
└── README.md
```

## Features

- **RIASEC Test**: 50-question scientific career assessment
- **AI Chatbot**: Dify-powered career counseling
- **Result Analysis**: Personalized career recommendations
- **Dashboard**: Statistics and data management

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Python FastAPI
- **AI**: Dify API
- **Deployment**: Vercel (frontend) + Railway (backend)

## Development Setup

### Frontend

```bash
cd frontend
npx http-server . -p 3000
```
Open: http://localhost:3000/index_redesigned_v2.html

### Backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## Environment Variables

Create `.env` file in root:

```
DIFY_API_KEY=your_dify_api_key_here
```

## Deployment

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set output directory: `frontend`
3. Deploy

### Backend (Railway)

1. Connect GitHub repo to Railway
2. Add env vars: `DIFY_API_KEY`
3. Railway auto-detects `Procfile` and deploys

### Update API URL

After deployment, update `frontend/index_redesigned_v2.html`:

```javascript
const API_BASE = 'https://your-railway-backend.railway.app';
```

## API Endpoints

- `GET /health` - Health check
- `POST /run-riasec` - Run RIASEC test with Dify

## License

MIT
