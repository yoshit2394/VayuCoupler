#!/usr/bin/env python3
"""
Single-command launcher for the SIH26082 Air Pollution-Weather Coupled Forecasting System.
Runs the FastAPI server with embedded interactive Command Center dashboard at http://127.0.0.1:8000
"""

import os
import sys
import io
import uvicorn

if __name__ == "__main__":
    # Fix Windows console encoding for UTF-8 output
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    # Add backend directory to path
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    sys.path.insert(0, backend_dir)

    print("=" * 70)
    print("  MOES AIR POLLUTION-WEATHER COUPLED FORECASTING SYSTEM")
    print("  Theme: Disaster Management | SIH 2026 Focus: Delhi NCR")
    print("=" * 70)
    print("\n[START] Server starting at: http://127.0.0.1:8000")
    print("[DOCS]  API docs available at: http://127.0.0.1:8000/docs\n")

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False, app_dir=backend_dir)
