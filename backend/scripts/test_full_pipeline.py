import sys
import os
import json
import time
from PIL import Image
import numpy as np

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.vision_model import VisionVerifier
from core.ocr_engine import OCREngine
from core.llm_engine import LLMEngine
from core.fusion_engine import FusionEngine

def test_full_pipeline():
    print("[INFO] Initializing Pipeline Components...")
    vision = VisionVerifier()
    ocr = OCREngine()
    llm = LLMEngine()
    fusion = FusionEngine()
    
    print("[OK] All engines loaded.\n")

    # 1. Simulate Image Input
    print("[1/5] Simulating image input...")
    img = Image.fromarray(np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8))
    image_hash = "test_hash_123"

    # 2. Vision Inference
    print("[2/5] Running Vision classification...")
    vision_res = vision.predict(img)

    # 3. OCR Extraction (Mocked since we use dummy image)
    print("[3/5] Simulating OCR extraction (Mocked)...")
    ocr_res = {
        "medicine_name": "Crocin",
        "salt_composition": "Paracetamol 500mg",
        "manufacturer_name": "Haleon",
        "expiry_status": "VALID",
        "ocr_confidence_score": 95.0,
        "ocr_engine_used": "EasyOCR"
    }

    # 4. Fusion
    print("[4/5] Running Fusion Engine signal analysis...")
    # Get LLM info for fusion
    llm_info = llm.generate(ocr_res)
    
    final_res = fusion.fuse(
        vision_result=vision_res,
        ocr_result=ocr_res,
        llm_result=llm_info,
        image_hash=image_hash,
        start_time_ms=time.time() * 1000
    )

    # 5. Full Output
    print("[5/5] Final Integration JSON Output:")
    print("="*50)
    print(json.dumps(final_res.dict(), indent=2))
    print("="*50)

    print("\n[OK] End-to-end pipeline test completed successfully.")

if __name__ == "__main__":
    test_full_pipeline()
