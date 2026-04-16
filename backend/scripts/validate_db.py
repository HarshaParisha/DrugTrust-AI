import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "medicines.json")

def validate():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] {DB_PATH} not found.")
        return

    with open(DB_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[INFO] Total entries: {len(data)}")
    print("\n--- Sample Entries (First 5) ---")
    for i, entry in enumerate(data[:5]):
        print(f"\n[{i+1}] {entry.get('brand_name')} ({entry.get('generic_name')})")
        print(f"    Manufacturer: {entry.get('manufacturer')}")
        print(f"    Prescription: {'Yes' if entry.get('requires_prescription') else 'No'}")
        print(f"    Uses: {', '.join(entry.get('used_for', [])[:3])}...")

if __name__ == "__main__":
    validate()
