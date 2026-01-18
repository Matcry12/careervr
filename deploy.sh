#!/bin/bash

# CareerGo Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Deploying CareerGo to $ENVIRONMENT..."

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✓ Python version: $PYTHON_VERSION"

# Create virtual environment if doesn't exist
if [ ! -d "$SCRIPT_DIR/backend/venv" ]; then
    echo "📦 Creating virtual environment..."
    cd "$SCRIPT_DIR/backend"
    python3 -m venv venv
    source venv/bin/activate
else
    source "$SCRIPT_DIR/backend/venv/bin/activate"
fi

# Install dependencies
echo "📚 Installing dependencies..."
cd "$SCRIPT_DIR/backend"
pip install --upgrade pip
pip install -r requirements.txt

# Check environment variables
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Please create .env file with DIFY_API_KEY"
    echo "   Example: cp .env.example .env && edit .env"
fi

# Validation
echo "✅ Running health check..."
python3 -c "from main import app; print('✓ Backend imports successfully')" || exit 1

echo ""
echo "✨ Deployment complete!"
echo ""
echo "To start the server:"
echo "  cd $SCRIPT_DIR/backend"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload"
echo ""
echo "To run in production:"
echo "  gunicorn -w 4 -b 0.0.0.0:8000 'main:app' --worker-class uvicorn.workers.UvicornWorker"
