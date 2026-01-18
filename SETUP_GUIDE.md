# Setup Guide - Resolving "Không kết nối được" Error

## 🔴 Your Error

```
❌ Không kết nối được tới hệ thống.
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Cause**: Frontend is trying to call backend API but getting HTML instead of JSON.

---

## ✅ Solution: Use the Right HTML File!

### Quick Answer

**Stop using `index.html`** - use `index1.html` instead!

- `index1.html` = **Works standalone, no backend needed** ✅
- `index.html` = Requires backend API (harder to setup)

---

## 🚀 Simplest Setup (Recommended)

### Step 1: Serve Frontend Only
```bash
cd /home/matcry/Documents/careervr
python -m http.server 8001
```

### Step 2: Open in Browser
```
http://localhost:8001/index1.html
```

**Done!** ✅ No backend needed, fully functional.

---

## 🔧 If You Need Backend (Advanced)

### Why You Might Need Backend:
- You want to test `/run-riasec` API endpoint
- You want to integrate with Dify AI chatbot
- You want to use `index.html` instead of `index1.html`

### Setup Steps:

**Terminal 1: Start Backend API**
```bash
cd /home/matcry/Documents/careervr
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2: Start Frontend Server**
```bash
cd /home/matcry/Documents/careervr
python -m http.server 8001
```

**Step 3: Open in Browser**
- Option A: `http://localhost:8001/index1.html` (recommended)
- Option B: `http://localhost:8001/index.html` (requires backend)

**Step 4: Test Backend**
```bash
# In another terminal:
curl http://localhost:8000/health
```

Should return:
```json
{"status":"ok","message":"CareerGo - Hành trình hướng nghiệp số backend is running"}
```

---

## ❌ Why You Got the Error

**What you did**:
```bash
# Backend on port 8000
uvicorn backend.main:app --port 8000

# Then opened in browser
http://localhost:8000/          ❌ WRONG!
http://localhost:8001/          ❌ WRONG!
```

**Why it failed**:
1. Backend doesn't serve HTML files (API only)
2. `index.html` tries to call API
3. API call fails → Gets error page (HTML)
4. Browser tries to parse HTML as JSON → Error!

---

## ✅ Correct Way

**Backend** (API only):
```
http://localhost:8000/health         ✅ Returns JSON
http://localhost:8000/run-riasec     ✅ Returns JSON
http://localhost:8000/               ❌ No root endpoint
```

**Frontend** (HTML server):
```
http://localhost:8001/index1.html    ✅ Serves HTML
http://localhost:8001/index.html     ✅ Serves HTML
```

Frontend and Backend are **separate**!

---

## 📊 Architecture

```
Browser
  ├─ http://localhost:8001/index1.html (standalone, no API calls)
  │  └─ Uses browser LocalStorage only
  │
  └─ http://localhost:8001/index.html (needs backend)
     └─ Makes API calls to http://localhost:8000/run-riasec
        └─ Calls Dify AI service
```

---

## 🎯 3 Simple Options

### Option 1: Frontend Only (RECOMMENDED)
```bash
python -m http.server 8001
# Open: http://localhost:8001/index1.html
# No backend needed, works perfectly
```

### Option 2: Frontend + Backend (For Testing API)
```bash
# Terminal 1:
uvicorn backend.main:app --port 8000

# Terminal 2:
python -m http.server 8001

# Open: http://localhost:8001/index1.html or index.html
```

### Option 3: Docker (Simplest for Production)
```bash
docker-compose up
# Open: http://localhost/index1.html
```

---

## 🐛 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `Không kết nối được` + HTML error | Using `index.html` with wrong API URL | Use `index1.html` instead |
| `404 Not Found` | Trying to open root URL on backend | Use frontend server (python -m http.server) |
| Backend won't start | Port already in use | Use different port: `--port 8001` |
| `CORS Error` | Backend CORS not configured | Use frontend on different port |
| `AttributeError: ForwardRef` | Old Python/pydantic version | Run `pip install -r requirements.txt` |

---

## 📝 Summary

**DO THIS**:
1. `python -m http.server 8001`
2. Open `http://localhost:8001/index1.html`
3. Test RIASEC questionnaire
4. Done! ✅

**DON'T DO THIS**:
- ❌ Try to access backend on port 8000 directly
- ❌ Use `index.html` without configuring API properly
- ❌ Expect backend to serve HTML files
- ❌ Try to access API endpoints in browser directly

---

## 🔗 Important Files

- `index1.html` - Full-featured standalone app (RECOMMENDED)
- `index.html` - Simple form that needs backend API
- `backend/main.py` - FastAPI backend
- `.env` - Configuration (DIFY_API_KEY for AI features)

---

**Questions?** Check QUICKSTART.md or README.md for more details.
