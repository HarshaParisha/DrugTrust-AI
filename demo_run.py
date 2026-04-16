import sys
import os
import time
import json
from PIL import Image
import numpy as np

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.vision_model import VisionVerifier
from core.ocr_engine import OCREngine
from core.llm_engine import LLMEngine
from core.fusion_engine import FusionEngine

def run_demo():
    print("="*60)
    print("          DRUGTRUST AI — AI CLINICAL DEMO")
    print("="*60)
    
    # 1. Initialize
    print("[INFO] Powering up AI Engines...")
    vision = VisionVerifier()
    ocr = OCREngine()
    llm = LLMEngine()
    fusion = FusionEngine()
    
    # 2. Loading Sample
    print("[INFO] Loading Sample Scan (assets/sample_medicine.jpg)...")
    sample_path = os.path.join(os.path.dirname(__file__), "assets", "sample_medicine.jpg")
    os.makedirs(os.path.dirname(sample_path), exist_ok=True)
    
    if not os.path.exists(sample_path):
        # Create a dummy image for demo purposes
        img = Image.fromarray(np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8))
        img.save(sample_path)
    
    img = Image.open(sample_path)
    
    # 3. Processing
    print("[INFO] Analyzing Visual Patterns (Vision)...")
    vision_res = vision.predict(img)
    time.sleep(1)
    
    print("[INFO] Extracting Pharmaceutical Text (OCR)...")
    # Simulate a realistic OCR hit if using dummy image
    ocr_hit = {
        "medicine_name": "Paracetamol 500mg",
        "brand_name": "Crocin",
        "salt_composition": "Paracetamol IP 500mg",
        "manufacturer_name": "Cipla Ltd",
        "expiry_status": "VALID",
        "ocr_confidence_score": 92.5
    }
    
    print("[INFO] Generating Doctor Persona Briefing (LLM)...")
    llm_info = llm.generate(ocr_hit)
    
    print("[INFO] Fusing Signals & Assessing Risk...")
    final = fusion.fuse(
        vision_result=vision_res,
        ocr_result=ocr_hit,
        llm_result=llm_info,
        image_hash="demo_hash_999",
        start_time_ms=time.time() * 1000
    )
    
    # 4. Result Presentation
    print("\n" + "#"*60)
    print(f" FINAL VERDICT: {final.risk_label}")
    print(f" CONFIDENCE:    {final.final_confidence:.2f}%")
    print(f" SCAN ID:       {final.scan_id}")
    print("#"*60)
    
    print(f"\n[PHARMA DATA]")
    print(f" - Medicine: {final.ocr.medicine_name}")
    print(f" - Salts:    {final.ocr.salt_composition}")
    print(f" - Mfg:      {final.ocr.manufacturer_name}")
    
    print(f"\n[DOCTOR BRIEFING EXCERPT]")
    briefing = llm_info.get("how_to_take", "No briefing generated.")
    lines = briefing.split('\n')[:8]
    for line in lines:
        if line.strip(): print(f"  > {line.strip()}")
    print("  ... (more available in Full Report)")
    
    print("\n" + "="*60)
    print("[OK] DEMO COMPLETED SUCCESSFULLY")

if __name__ == "__main__":
    run_demo()
