"""
Pytest configuration and environment fixtures.
Automatically sets PYTHONPATH so tests can be run from any directory.
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
os.environ.setdefault("MOCK_LLM", "true")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
