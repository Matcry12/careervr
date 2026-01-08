# 🚀 CareerVR Deployment Checklist

## Pre-Deployment Verification

### 1. **Local Testing**

#### ✅ Check Backend Starts
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Expected: `Application startup complete`

#### ✅ Check Static Files Load
Visit: http://localhost:8000/
Expected: See RIASEC test form

#### ✅ Check Health Endpoint
Visit: http://localhost:8000/health
Expected: `{"status":"ok","message":"CareerVR backend is running"}`

#### ✅ Check API Routes Exist
```bash
# In another terminal
curl http://localhost:8000/openapi.json | python -m json.tool | head -20
```

### 2. **Environment Variables**

#### ✅ `.env` File Exists
```bash
cat /home/matcry/Documents/careervr/.env
```
Should show:
```
DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
```

⚠️ **If missing:**
```bash
# Create .env in root directory
echo "DIFY_API_KEY=your_key_here" > /home/matcry/Documents/careervr/.env
```

### 3. **File Structure Verification**

#### ✅ Backend Files Present
```bash
ls -la backend/
```
Must have:
- ✅ `main.py`
- ✅ `requirements.txt`
- ✅ `static/` folder
- ✅ `static/index_redesigned_v2.html`

#### ✅ Root Procfile Exists
```bash
cat Procfile
```
Should show:
```
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 4. **Code Quality Checks**

#### ✅ No Hardcoded API Keys
```bash
grep -r "Bearer app-" backend/ || echo "✅ No hardcoded keys found"
```

#### ✅ API URL is Dynamic
```bash
grep "window.location.origin" backend/static/index_redesigned_v2.html && echo "✅ API URL is dynamic"
```

#### ✅ requirements.txt Valid
```bash
cd backend && pip install -r requirements.txt --dry-run
```

---

## Deployment Steps

### Step 1: Push to GitHub

```bash
cd /home/matcry/Documents/careervr

# Check git status
git status

# Add all files
git add .

# Commit
git commit -m "CareerVR: Single-server setup ready for deployment"

# Push
git push -u origin main
```

**Expected Output:**
```
✓ Enumerating objects: XX
✓ Compressing objects: 100%
✓ Writing objects: 100%
✓ Total XX (delta XX)
→ main [new branch]
→ main pushed to origin
```

### Step 2: Deploy to Railway

1. **Open [railway.app](https://railway.app)**
2. **Log in with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose `careervr` repo**
6. **Wait for build** (~2 min)

#### Add Environment Variable

1. Click **Variables** tab
2. **Add Variable:**
   - Key: `DIFY_API_KEY`
   - Value: (paste your Dify API key)
3. Click **Save** → Auto redeploys

#### Get Your URL

Once deployed, you'll see:
```
https://careervr-[random-id].railway.app
```

### Step 3: Verify Deployment

```bash
# Test health endpoint
curl https://careervr-[random-id].railway.app/health

# Expected response:
# {"status":"ok","message":"CareerVR backend is running"}
```

**Visit in browser:**
```
https://careervr-[random-id].railway.app/
```

Should see: RIASEC test form

### Step 4: Test Features

#### Test RIASEC Form
1. Fill in student info
2. Answer questions
3. Submit

#### Test Chatbot
1. Complete RIASEC
2. Click "💬 AI Chatbot" nav
3. Click "✨ Yêu cầu tư vấn"
4. Should see AI response within 30s

---

## Troubleshooting

### ❌ App crashes on startup

**Check logs:**
```
Railway Dashboard → Logs tab
```

**Common causes:**
- ❌ `DIFY_API_KEY` not set
  - Solution: Add env var on Railway
- ❌ Wrong Python version
  - Solution: Railway auto-uses Python 3.9+
- ❌ Missing dependency
  - Solution: Check `requirements.txt`

### ❌ "Cannot GET /html file"

**Cause:** `index_redesigned_v2.html` not in `backend/static/`

**Fix:**
```bash
ls -la backend/static/
# Should show index_redesigned_v2.html
```

### ❌ "Failed to fetch" when clicking "Yêu cầu tư vấn"

**Check 1: API URL correct**
```javascript
// Open browser console (F12 → Console tab)
// Should show correct URL:
console.log(window.location.origin)
```

**Check 2: Backend running**
```bash
curl https://your-railway-url.railway.app/health
```

**Check 3: DIFY_API_KEY valid**
```bash
# Railway Logs should show:
# No error about DIFY_API_KEY
```

### ❌ RIASEC test doesn't save results

**Check localStorage in browser:**
```javascript
// Open console (F12)
localStorage.getItem('careerVR_current')
// Should return JSON object
```

---

## Post-Deployment

### ✅ Monitoring

**Railway Dashboard:**
- Monitor CPU/Memory usage
- Check error logs
- View request count

### ✅ Database (Optional)

Currently uses browser `localStorage`. To add database:
1. Add PostgreSQL on Railway
2. Modify `backend/main.py` to save results
3. Create `/results` endpoint

### ✅ Custom Domain (Optional)

1. Railway → Settings → Domain
2. Add custom domain
3. Point DNS records

---

## Summary

```
Local: http://localhost:8000              ✅ Testing
↓
GitHub: github.com/YOUR_USERNAME/careervr
↓
Railway: https://careervr-abc.railway.app  ✅ Production
```

**Everything in one server.**
**No complexity.**
**Just push to GitHub → Railway auto-deploys.**

---

## Quick Command Reference

```bash
# Local dev
cd backend && source ../venv/bin/activate && uvicorn main:app --reload --port 8000

# Test health
curl http://localhost:8000/health

# Deploy
git add . && git commit -m "msg" && git push

# View logs (Railway)
# Dashboard → Logs tab

# Rollback
# GitHub → previous commit
# Railway auto-redeploys from latest main
```
