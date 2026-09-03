#!/bin/bash
# ==============================================================================
# VayuCoupler — 1-Click Native macOS Standalone Desktop Launcher
# Launches VayuCoupler in frameless native app mode (NO URL bar, NO browser tabs)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Ensure background server is running
if ! curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
    echo "Starting MoES VayuCoupler Backend Engine..."
    "$DIR/backend/venv/bin/python3" "$DIR/run.py" &
    sleep 2
fi

# Try launching in Chrome Standalone App Window Mode (Frameless)
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="http://127.0.0.1:8000" --window-size=1440,900
elif [ -d "/Applications/Brave Browser.app" ]; then
    open -na "Brave Browser" --args --app="http://127.0.0.1:8000" --window-size=1440,900
elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="http://127.0.0.1:8000" --window-size=1440,900
else
    open "http://127.0.0.1:8000"
fi
