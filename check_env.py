import os
import sys
import subprocess
import json
import requests
from pathlib import Path

def check_python():
    v = sys.version_info
    status = v.major == 3 and v.minor >= 10
    print(f"{'[OK]' if status else '[ERROR]'} Python Version: {sys.version.split()[0]} (Need 3.10+)")
    return status

def check_pip_packages():
    print("[INFO] Checking Pip Packages (this may take a moment)...")
    req_path = os.path.join(os.path.dirname(__file__), "backend", "requirements.txt")
    if not os.path.exists(req_path):
        print("[ERROR] requirements.txt not found!")
        return False
    
    with open(req_path, "r") as f:
        required = [line.split("==")[0].strip() for line in f if "==" in line]
    
    try:
        installed = subprocess.check_output([sys.executable, "-m", "pip", "freeze"]).decode()
        missing = [p for p in required if p.lower() not in installed.lower()]
        if not missing:
            print("[OK] All required pip packages installed.")
            return True
        else:
            print(f"[ERROR] Missing packages: {', '.join(missing)}")
            return False
    except:
        return False

def check_tesseract():
    try:
        subprocess.check_output(["tesseract", "--version"], stderr=subprocess.STDOUT)
        print("[OK] Tesseract OCR found on PATH.")
        return True
    except:
        print("[ERROR] Tesseract OCR NOT found on PATH.")
        return False

def check_ollama():
    try:
        res = requests.get("http://localhost:11434/api/tags", timeout=2)
        if res.status_code == 200:
            models = [m["name"] for m in res.json().get("models", [])]
            if any("mistral" in m.lower() for m in models):
                print(f"[OK] Ollama running with Mistral model pulled.")
                return True
            else:
                print("[ERROR] Ollama running but 'mistral' model NOT found. Run: ollama pull mistral")
                return False
    except:
        print("[ERROR] Ollama NOT running. Please start Ollama.")
        return False

def check_env_file():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        print("[OK] .env file found.")
        return True
    else:
        print("[ERROR] .env file MISSING. Copy .env.template to .env")
        return False

def check_database():
    db_path = os.path.join(os.path.dirname(__file__), "backend", "data", "medicines.json")
    if os.path.exists(db_path):
        try:
            with open(db_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if len(data) > 100:
                print(f"[OK] medicines.json found with {len(data)} entries.")
                return True
            else:
                print(f"[WARN] medicines.json only has {len(data)} entries. Run build_medicines_db.py for full expansion.")
                return True
        except:
            print("[ERROR] medicines.json is corrupt!")
            return False
    else:
        print("[ERROR] medicines.json MISSING. Run scripts/build_medicines_db.py")
        return False

def main():
    print("="*40)
    print("   DRUGTRUST AI ENVIRONMENT DIAGNOSIS")
    print("="*40)
    results = [
        check_python(),
        check_pip_packages(),
        check_tesseract(),
        check_ollama(),
        check_env_file(),
        check_database()
    ]
    print("="*40)
    if all(results):
        print("[READY] ENVIRONMENT READY! You can run start.bat")
    else:
        print("[ERROR] Please fix the issues above before running.")

if __name__ == "__main__":
    main()
