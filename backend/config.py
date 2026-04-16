import os
from dotenv import load_dotenv

# Load .env file from the root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def get_env(key, default):
    return os.environ.get(key, default)

# ─── MEDICAL SAFETY THRESHOLDS ───
TIER_1_MIN = 99.00
TIER_2_MIN = 97.00
TIER_3_MIN = 95.00
TIER_4_MIN = 90.00

RISK_TIERS = {
    1: {"label": "VERIFIED GENUINE",        "color": "#00C853", "action": "Safe to use as directed by physician."},
    2: {"label": "LIKELY GENUINE",           "color": "#69F0AE", "action": "Use with caution. Pharmacist confirmation recommended."},
    3: {"label": "INCONCLUSIVE",             "color": "#FFD600", "action": "Cannot verify authenticity. Consult licensed pharmacist before use."},
    4: {"label": "SUSPECTED COUNTERFEIT",    "color": "#FF6D00", "action": "DO NOT USE. Return to pharmacy. File report."},
    5: {"label": "HIGH RISK — COUNTERFEIT",  "color": "#D50000", "action": "DANGER. Do NOT use under any circumstance. Report to drug authority immediately."},
}

# ─── FUSION & MODEL ───
VISION_WEIGHT = float(get_env("VISION_WEIGHT", 0.65))
OCR_WEIGHT = float(get_env("OCR_WEIGHT", 0.35))
MATCH_BONUS = float(get_env("MATCH_BONUS", 5.0))
MISMATCH_PENALTY = float(get_env("MISMATCH_PENALTY", 8.0))
MC_DROPOUT_PASSES = 20
IMAGE_SIZE = 300
NUM_CLASSES = 2
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]
UNCERTAINTY_LOW_THRESHOLD = float(get_env("UNCERTAINTY_LOW_THRESHOLD", 2.0))
UNCERTAINTY_MEDIUM_THRESHOLD = float(get_env("UNCERTAINTY_MEDIUM_THRESHOLD", 5.0))

MODEL_PATH = os.path.join(BASE_DIR, "backend", "checkpoints", "efficientnet_b3_medverify.pth")

# ─── OLLAMA CONFIG ───
OLLAMA_URL = get_env("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = get_env("OLLAMA_MODEL", "mistral:latest")
OLLAMA_TIMEOUT = 120

# ─── LOCAL LLM PROVIDER CONFIG (Ollama / LM Studio) ───
LLM_PROVIDER = get_env("LLM_PROVIDER", "ollama").lower()  # ollama | lmstudio
LLM_BASE_URL = get_env("LLM_BASE_URL", "http://127.0.0.1:1234/v1")
LLM_MODEL = get_env("LLM_MODEL", OLLAMA_MODEL)

# ─── DEMO MODE ───
DEMO_MODE = get_env("MEDVERIFY_DEMO_MODE", "False").lower() == "true"
DEMO_CONFIDENCE_GENUINE = 96.8

# ─── PATHS ───
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
DATA_DIR = os.path.join(BACKEND_DIR, "data")
UPLOADS_DIR = os.path.join(BACKEND_DIR, get_env("UPLOADS_DIR_PATH", "uploads"))
LOGS_DIR = os.path.join(BACKEND_DIR, get_env("LOGS_DIR_PATH", "logs"))
REPORTS_DIR = os.path.join(BACKEND_DIR, get_env("REPORTS_DIR_PATH", "reports"))

# ─── REFERENCE MATCHING (CLEAN-ROOM DISTANCE METHOD) ───
REFERENCE_DATA_DIR = os.path.join(DATA_DIR, get_env("REFERENCE_DATA_DIR", "reference_packages"))
REFERENCE_EMBEDDINGS_PATH = os.path.join(
    BASE_DIR,
    "backend",
    "checkpoints",
    get_env("REFERENCE_EMBEDDINGS_FILE", "reference_embeddings.json"),
)
REFERENCE_MATCH_THRESHOLD = float(get_env("REFERENCE_MATCH_THRESHOLD", 0.28))
REFERENCE_MATCH_BONUS = float(get_env("REFERENCE_MATCH_BONUS", 4.0))
REFERENCE_MISMATCH_PENALTY = float(get_env("REFERENCE_MISMATCH_PENALTY", 6.0))

MEDICINES_DB = os.path.join(DATA_DIR, "medicines.json")
SQLITE_DB = os.path.join(BACKEND_DIR, get_env("SQLITE_DB_PATH", "data/medverify.db"))
AUDIT_LOG = os.path.join(LOGS_DIR, "api_audit.jsonl")

# ─── API META ───
API_VERSION = "1.0.0"
MODEL_VERSION = "efficientnet_b3_v1"
THRESHOLD_POLICY_VERSION = "medverify-threshold-v1"

# ─── OCR CONFIG ───
OCR_LANGUAGES = ["en", "hi"]
OCR_LOW_CONFIDENCE_THRESHOLD = float(get_env("OCR_LOW_CONFIDENCE_THRESHOLD", 0.30))
OCR_MIN_TEXT_LENGTH = int(get_env("OCR_MIN_TEXT_LENGTH", 15))
OCR_KEY_FIELDS = [
    "medicine_name",
    "dosage_strength",
    "batch_number",
    "expiry_date",
    "manufacturer_name",
]

# ─── LLM DISCLAIMER ───
LLM_DISCLAIMER = "Warning: AI-generated reference only. Always follow your doctor's prescription. Do not self-medicate."
CONSULT_REMINDER = "Always consult your doctor or a licensed pharmacist before using any medicine."

def get_risk_tier(confidence: float) -> int:
    if confidence >= TIER_1_MIN: return 1
    if confidence >= TIER_2_MIN: return 2
    if confidence >= TIER_3_MIN: return 3
    if confidence >= TIER_4_MIN: return 4
    return 5
