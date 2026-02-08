import os
import sys

# Extend path to include project root for proper imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app

# Vercel needs to find 'app'
app = app
