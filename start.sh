#!/bin/bash

set -e

echo "============================================================"
echo "  DRUGTRUST AI TERMINAL STARTUP"
echo "============================================================"

echo "Start services in two terminals:"
echo
echo "  Terminal 1 (Backend):"
echo "  source .venv/bin/activate   # or source venv/bin/activate"
echo "  uvicorn backend.main:app --reload --port 8000"
echo
echo "  Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
