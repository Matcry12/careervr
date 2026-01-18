# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free)
- Railway account (free)
- Dify API key (from your Dify workflow)

---

## Step 1: Push to GitHub

```bash
cd /home/matcry/Documents/careervr

# Initialize git
git init
git add .
git commit -m "Initial commit: CareerGo - Hành trình hướng nghiệp số restructured for Vercel + Railway"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/careervr.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"New Project"**
4. Select your `careervr` repo
5. **Root Directory**: `frontend`
6. Click **Deploy**
7. Get your Vercel URL: `https://careervr-xyz.vercel.app`

---

## Step 3: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select `careervr` repo
4. Click **Deploy**
5. Add environment variables:
   - Key: `DIFY_API_KEY`
   - Value: (your Dify API key)
6. Get your Railway URL: `https://careervr-abc123.railway.app`

---

## Step 4: Update Frontend API URL

Edit `frontend/index_redesigned_v2.html`:

Find:
```javascript
const API_BASE = 'http://localhost:8001';
```

Replace with your Railway URL:
```javascript
const API_BASE = 'https://careervr-abc123.railway.app';
```

Push to GitHub:
```bash
git add frontend/index_redesigned_v2.html
git commit -m "Update API URL to production"
git push
```

Vercel auto-redeploys on push.

---

## Step 5: Test

1. Open `https://careervr-xyz.vercel.app`
2. Complete RIASEC test
3. Click "✨ Yêu cầu tư vấn"
4. Should see AI response

---

## Troubleshooting

### "Failed to fetch" error
- Check Railway backend is running
- Verify API URL in `index_redesigned_v2.html`
- Check browser console for CORS errors

### Backend crashes on Railway
- Check Railway logs
- Verify `requirements.txt` is complete
- Ensure `Procfile` exists in root

### Frontend not updating
- Clear browser cache (Ctrl+Shift+Del)
- Wait 30 seconds for Vercel to rebuild
- Check Vercel deployment status

---

## Local Testing (before deploying)

### Frontend
```bash
cd frontend
python -m http.server 8000
# Open http://localhost:8000/index_redesigned_v2.html
```

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Update frontend API to `http://localhost:8001` to test.

---

## File Structure After Deployment

```
GitHub (source code)
  ├── frontend → Vercel (auto-deploys)
  ├── backend → Railway (auto-deploys)
  └── Procfile → Railway uses this

Vercel (frontend)
  └── Served at: https://careervr-xyz.vercel.app

Railway (backend)
  └── Served at: https://careervr-abc123.railway.app
```

---

## Next Steps

- Add custom domain to Vercel
- Set up monitoring on Railway
- Add analytics to frontend
- Expand RIASEC questions database
