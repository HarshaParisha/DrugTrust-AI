@echo off
setlocal
cd /d %~dp0

set "VENV_ACTIVATE="
if exist "%~dp0.venv\Scripts\activate" set "VENV_ACTIVATE=.venv\Scripts\activate"
if exist "%~dp0venv\Scripts\activate" set "VENV_ACTIVATE=venv\Scripts\activate"

if "%VENV_ACTIVATE%"=="" (
    echo [ERROR] No virtual environment found. Expected .venv\Scripts\activate or venv\Scripts\activate
    exit /b 1
)

call %VENV_ACTIVATE%
uvicorn backend.main:app --reload --port 8000
