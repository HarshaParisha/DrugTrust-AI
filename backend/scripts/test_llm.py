import sys
import os
import time

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.llm_engine import LLMEngine

def test_llm():
    print("[INFO] Initializing LLMEngine...")
    engine = LLMEngine()
    
    if not engine.available:
        print("[ERROR] LLM not available (Ollama might be down). Testing DB fallback instead.")
    else:
        print("[OK] LLM (Ollama) is available.")

    sample_fields = {
        "medicine_name": "Paracetamol 500mg",
        "brand_name": "Crocin",
        "salt_composition": "Paracetamol IP 500mg",
        "manufacturer_name": "Cipla Ltd",
        "dosage_strength": "500mg"
    }

    print("\n--- Testing Streaming Doctor Persona Response ---")
    print("Input:", sample_fields)
    print("Verdict: VERIFIED GENUINE\n")
    print("Response:\n" + "="*50)
    
    for chunk in engine.generate_stream(sample_fields, verdict_label="VERIFIED GENUINE"):
        print(chunk, end="", flush=True)
    
    print("\n" + "="*50)
    print("\n[OK] Stream completed.")

if __name__ == "__main__":
    test_llm()
