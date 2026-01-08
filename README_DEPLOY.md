# CareerVR – Single Server Deployment

## Simple Structure

```
careervr/
├── backend/
│   ├── main.py          # FastAPI app (serves both API + frontend)
│   ├── static/          # Frontend HTML files
│   │   └── index_redesigned_v2.html
│   ├── requirements.txt
│   └── Procfile         # Deployment config
├── .env                 # Environment variables
├── Procfile             # Root Procfile (points to backend)
└── README_DEPLOY.md
```

## Local Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open: http://localhost:8000

## Deploy to Railway (One Click)

1. Push to GitHub:
```bash
git add .
git commit -m "Single server setup for Railway"
git push
```

2. Go to [railway.app](https://railway.app)
3. Click **New Project** → **Deploy from GitHub**
4. Select your `careervr` repo
5. Add environment variable:
   - `DIFY_API_KEY` = your key
6. Click **Deploy**
7. Get your URL (e.g., `https://careervr-abc.railway.app`)

That's it! Everything runs from one server.

## How It Works

- **FastAPI** serves both API and frontend
- **Frontend files** in `backend/static/` are served automatically
- **API calls** from frontend use relative URLs (`window.location.origin`)
- **Single port**, single server, single deploy

## Environment Variables

Create `.env` file in root:
```
DIFY_API_KEY=your_dify_api_key_here
```

Railway reads this automatically.

## Verify Deployment

Visit: `https://your-railway-url.railway.app/health`

Should return:
```json
{"status": "ok", "message": "CareerVR backend is running"}
```
