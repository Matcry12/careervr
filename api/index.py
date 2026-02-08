import os\nimport sys\n\n# Extend path to include project root for proper imports\nsys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\n\nfrom backend.main import app
