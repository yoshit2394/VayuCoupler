#!/bin/bash
# SIH26082 Quick Startup Script

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
VENV="$DIR/backend/venv"

echo "=================================================================="
echo "  Ministry of Earth Sciences (MoES) — SIH 2026"
echo "  Air Pollution–Weather Coupled Forecasting System (Delhi NCR)"
echo "=================================================================="

if [ ! -d "$VENV" ]; then
    echo "Creating virtual environment and installing dependencies..."
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install -r "$DIR/backend/requirements.txt"
fi

echo "Launching MoES Command Center & API on http://127.0.0.1:8000 ..."
"$VENV/bin/python3" "$DIR/run.py"
