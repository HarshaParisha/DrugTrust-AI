import sys
import os
import torch
from PIL import Image
import numpy as np

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.vision_model import VisionVerifier
from config import MODEL_PATH

def test_vision():
    print("[INFO] Initializing VisionVerifier...")
    
    # Check if we have GPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Using Device: {device}")

    try:
        verifier = VisionVerifier()
    except Exception as e:
        print(f"[ERROR] Failed to load VisionVerifier: {e}")
        return
    
    if not verifier.model_finetuned:
        print(f"[WARN] No trained weights found at {MODEL_PATH}. Prediction will be random/untrained.")
    else:
        print(f"[OK] Loaded fine-tuned weights from {MODEL_PATH}")

    # Create a dummy test image
    img = Image.fromarray(np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8))
    
    print("\n--- Running Inference ---")
    try:
        result = verifier.predict(img)
        print(f"Prediction: {result['class_name']}")
        print(f"Raw Confidence: {result['raw_confidence']:.4f}")
        print(f"Adjusted Confidence: {result['adjusted_confidence']:.4f}")
        print(f"Uncertainty Level: {result['uncertainty_level']}")
        print("\n[OK] Vision inference test completed.")
    except Exception as e:
        print(f"[ERROR] Inference failed: {e}")

if __name__ == "__main__":
    test_vision()
