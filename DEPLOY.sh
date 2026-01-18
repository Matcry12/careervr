#!/bin/bash

# CareerGo Deployment Script
# This script automates the GitHub push

echo "🚀 CareerGo Deployment Script"
echo "=============================="
echo ""

# Step 1: Pre-check
echo "Step 1: Running pre-deployment checks..."
source venv/bin/activate
bash PRE_DEPLOY_CHECK.sh
if [ $? -ne 0 ]; then
    echo "❌ Pre-deployment checks failed. Fix errors before deploying."
    exit 1
fi
echo ""

# Step 2: Git status
echo "Step 2: Checking git status..."
echo ""
git status --short
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi
echo ""

# Step 3: Commit
echo "Step 3: Committing changes..."
git add .
git commit -m "CareerGo: Production deployment $(date '+%Y-%m-%d %H:%M:%S')"
if [ $? -ne 0 ]; then
    echo "❌ Git commit failed"
    exit 1
fi
echo "✅ Changes committed"
echo ""

# Step 4: Push
echo "Step 4: Pushing to GitHub..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Git push failed"
    exit 1
fi
echo "✅ Pushed to GitHub"
echo ""

# Done
echo "=============================="
echo "✅ GitHub push successful!"
echo ""
echo "Next steps:"
echo "1. Go to: https://railway.app"
echo "2. Click: New Project → Deploy from GitHub"
echo "3. Select: careergo repository"
echo "4. Wait: 2-3 minutes for deployment"
echo "5. Open: Your Railway URL"
echo ""
echo "Railway will automatically:"
echo "  • Detect Procfile"
echo "  • Install dependencies from requirements.txt"
echo "  • Load DIFY_API_KEY from .env"
echo "  • Start the server"
echo ""
echo "Questions? Check DEPLOY_CHECKLIST.md or READY_TO_DEPLOY.md"
echo ""
