#!/bin/bash

# CareerGo - Hành trình hướng nghiệp số Pre-Deployment Verification Script
# Run this before pushing to GitHub

echo "🔍 CareerGo - Hành trình hướng nghiệp số Pre-Deployment Checklist"
echo "====================================="
echo ""

# Check 1: Backend imports
echo "1️⃣  Checking backend imports..."
cd backend
python -c "from main import app; print('   ✅ Backend imports successfully')" 2>&1 || { echo "   ❌ FAILED: Backend import error"; exit 1; }
cd ..
echo ""

# Check 2: Static files exist
echo "2️⃣  Checking static files..."
if [ -f "backend/static/index_redesigned_v2.html" ]; then
    echo "   ✅ index_redesigned_v2.html exists"
else
    echo "   ❌ FAILED: index_redesigned_v2.html not found"
    exit 1
fi
echo ""

# Check 3: .env file exists
echo "3️⃣  Checking .env configuration..."
if [ -f ".env" ]; then
    if grep -q "DIFY_API_KEY" .env; then
        echo "   ✅ DIFY_API_KEY is set"
    else
        echo "   ❌ FAILED: DIFY_API_KEY not in .env"
        exit 1
    fi
else
    echo "   ❌ FAILED: .env file not found"
    exit 1
fi
echo ""

# Check 4: Procfile exists
echo "4️⃣  Checking Procfile..."
if [ -f "Procfile" ]; then
    echo "   ✅ Root Procfile exists"
    cat Procfile
else
    echo "   ❌ FAILED: Procfile not found"
    exit 1
fi
echo ""

# Check 5: requirements.txt valid
echo "5️⃣  Checking requirements.txt..."
if [ -f "backend/requirements.txt" ]; then
    echo "   ✅ requirements.txt exists"
    echo "   Dependencies:"
    cat backend/requirements.txt | sed 's/^/      - /'
else
    echo "   ❌ FAILED: requirements.txt not found"
    exit 1
fi
echo ""

# Check 6: No hardcoded secrets
echo "6️⃣  Checking for hardcoded secrets..."
if grep -r "app-" backend/main.py | grep -v "DIFY_API_KEY = os.getenv" >/dev/null 2>&1; then
    echo "   ⚠️  WARNING: Found hardcoded keys in code"
    grep -r "app-" backend/main.py
else
    echo "   ✅ No hardcoded secrets found"
fi
echo ""

# Check 7: Dynamic API URL
echo "7️⃣  Checking for dynamic API URL..."
if grep -q "window.location.origin" backend/static/index_redesigned_v2.html; then
    echo "   ✅ API URL is dynamic (window.location.origin)"
else
    echo "   ⚠️  WARNING: API URL might be hardcoded"
fi
echo ""

# Check 8: Git status
echo "8️⃣  Checking git status..."
if git status --porcelain | grep -q "^??"; then
    echo "   ⚠️  Untracked files:"
    git status --porcelain | grep "^??" | sed 's/^/?? /'
fi
echo ""

# Summary
echo "====================================="
echo "✅ Pre-deployment checks complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Commit: git add . && git commit -m 'Ready for deployment'"
echo "3. Push: git push"
echo "4. Deploy on Railway: https://railway.app"
echo ""
