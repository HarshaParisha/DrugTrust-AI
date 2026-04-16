# Installation Guide: Drugtrust AI

Follow these steps to set up Drugtrust AI on your local machine.

---

## Prerequisites

- **Python 3.10+** (Ensure it's added to your PATH)
- **Node.js 18+** (With npm)
- **Ollama** (Required for the Doctor-Persona LLM)
- **Tesseract OCR** (For text extraction)

---

## 1. Environment Setup

### **A. Clone the Repository**

```bash
git clone https://github.com/yourusername/medverify.git
cd medverify
```

### **B. Backend Setup**

1. Create and activate a virtual environment:
   - **Windows:**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

### **C. Frontend Setup**

```bash
cd frontend
npm install
cd ..
```

---

## 2. Configuration (`.env`)

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.template .env
   ```
2. Open `.env` and set `MEDVERIFY_DEMO_MODE=True` if you're setting up for the first time without trained model weights.

---

## 3. External dependencies

### **A. Ollama & LLM**

1. Download Ollama from [ollama.com](https://ollama.com).
2. Install and launch Ollama.
3. Open your terminal and run:
   ```bash
   ollama pull mistral
   ```

### **B. Tesseract OCR**

- **Windows:** Download installer from [UB Mannheim GitHub](https://github.com/UB-Mannheim/tesseract/wiki). Add the installation path (e.g., `C:\Program Files\Tesseract-OCR`) to your system PATH.
- **macOS (Homebrew):** `brew install tesseract`
- **Linux (Ubuntu/Debian):** `sudo apt install tesseract-ocr`

---

## 4. Database Setup

Follow the steps in [SETUP.md](./SETUP.md) to configure your Kaggle API key and build the 11,000+ medicine record database.

---

## 5. Running the Application

### **One-Click Startup**

- **Windows:** Run `start.bat`
- **macOS / Linux:** Run `bash start.sh` (Ensure it's executable: `chmod +x start.sh`)

---

## Testing

Check if everything is configured correctly by running the master test suite:

- **Windows:** `run_all_tests.bat`
- **macOS / Linux:** `./run_all_tests.sh`
