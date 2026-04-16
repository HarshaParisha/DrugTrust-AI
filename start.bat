@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   DRUGTRUST AI TERMINAL STARTUP
echo ============================================================

set "VENV_ACTIVATE="
if exist "%~dp0.venv\Scripts\activate" set "VENV_ACTIVATE=.venv\Scripts\activate"
if exist "%~dp0venv\Scripts\activate" set "VENV_ACTIVATE=venv\Scripts\activate"

if "%VENV_ACTIVATE%"=="" (
    echo [ERROR] No virtual environment found. Expected .venv\Scripts\activate or venv\Scripts\activate
    exit /b 1
)

echo Start services in two VS Code terminals:
echo.
echo   Terminal 1 (Backend):
echo   call %VENV_ACTIVATE%
echo   uvicorn backend.main:app --reload --port 8000
echo.
echo   Terminal 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo Optional helper scripts:
echo   start_backend.bat
echo   start_frontend.bat
