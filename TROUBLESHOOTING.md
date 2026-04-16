# Drugtrust AI Troubleshooting: Top 5 Common Issues

If you hit a wall running Drugtrust AI for the first time, check these solutions!

### 1. "tesseract is not recognized as an internal or external command"

- **Problem:** Tesseract OCR is installed but your computer doesn't know where it is.
- **The Fix:**
  1.  Locate where you installed Tesseract (usually `C:\Program Files\Tesseract-OCR`).
  2.  Open **Environment Variables** in Windows Settings.
  3.  Edit the **Path** variable under 'System variables' and add your Tesseract folder path.
  4.  **Restart your terminal** for changes to take effect.

### 2. "Connection refused" to localhost:11434 (Ollama)

- **Problem:** The LLM engine cannot reach Ollama.
- **The Fix:**
  1.  Ensure you have downloaded and installed **Ollama**.
  2.  Check your system tray to see if the Ollama icon (a small llama face) is visible.
  3.  Run `ollama run mistral` in a command prompt to confirm the model works independently.

### 3. Frontend blank page or "Failed to fetch"

- **Problem:** The React app can't talk to the FastAPI backend (CORS or server down).
- **The Fix:**
  1.  Ensure the backend is running (`uvicorn backend.main:app`).
  2.  Check that `.env` exists and `VITE_API_URL` is set to `http://localhost:8000`.
  3.  In `backend/main.py`, ensure `allow_origins=["*"]` is present in the `CORSMiddleware` configuration.

### 4. "ModuleNotFoundError: No module named 'torch' (or similar)"

- **Problem:** You are running the project outside of your virtual environment.
- **The Fix:**
  1.  Ensure you have created the venv: `python -m venv venv`.
  2.  Ensure it is activated: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux).
  3.  You should see `(venv)` at the start of your command prompt.

### 5. "Port already in use" (8000 or 5173)

- **Problem:** A previous run of Drugtrust AI or another app is still using the ports.
- **The Fix:**
  - **Windows (Kill Port 8000):** `for /f "tokens=5" %a in ('netstat -aon ^| findstr 8000') do taskkill /f /pid %a`
  - **Or simply restart your computer** to clear all hung processes.
