"""
Drugtrust AI — FastAPI Application Entry Point
"""

import logging
import os
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.routes_verify import router as verify_router
from api.routes_medicine import router as medicine_router
from api.routes_history import router as history_router
from models.database import init_db
from config import API_VERSION, THRESHOLD_POLICY_VERSION, UPLOADS_DIR, CONSULT_REMINDER

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medverify.main")

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(
    title="Drugtrust AI API",
    version=API_VERSION,
    description="AI-Powered Medicine Authenticity and Prescription Intelligence System",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)

# Serve uploaded images for frontend heatmap display
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Routes
app.include_router(verify_router, prefix="/verify", tags=["Verification"])
app.include_router(medicine_router, prefix="/medicine", tags=["Medicine DB"])
app.include_router(history_router, prefix="/history", tags=["History"])


@app.on_event("startup")
async def startup():
    logger.info("Drugtrust AI API starting up...")
    init_db()
    logger.info("Database initialized.")

    # Pre-load all models into app state
    from core.vision_model import VisionVerifier
    from core.ocr_engine import OCREngine
    from core.llm_engine import LLMEngine
    from core.fusion_engine import FusionEngine
    from core.reference_matcher import ReferenceMatcher

    logger.info("Loading VisionVerifier...")
    app.state.vision = VisionVerifier()

    logger.info("Loading OCREngine...")
    app.state.ocr = OCREngine()

    logger.info("Loading LLMEngine...")
    app.state.llm = LLMEngine()

    logger.info("Loading ReferenceMatcher...")
    app.state.reference_matcher = ReferenceMatcher(app.state.vision)

    logger.info("Loading FusionEngine...")
    app.state.fusion = FusionEngine()

    logger.info("All engines loaded. Drugtrust AI API ready.")


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Drugtrust AI",
        "status": "running",
        "version": API_VERSION,
        "threshold_policy_version": THRESHOLD_POLICY_VERSION,
        "disclaimer": CONSULT_REMINDER,
    }


@app.get("/health", tags=["Health"])
def health():
    llm_available = getattr(getattr(app.state, "llm", None), "available", False)
    vision_finetuned = getattr(getattr(app.state, "vision", None), "model_finetuned", False)
    ref_available = bool(getattr(getattr(app.state, "reference_matcher", None), "embeddings", {}))
    return {
        "api": "ok",
        "llm_available": llm_available,
        "model_finetuned": vision_finetuned,
        "reference_match_available": ref_available,
        "api_version": API_VERSION,
        "threshold_policy_version": THRESHOLD_POLICY_VERSION,
    }
