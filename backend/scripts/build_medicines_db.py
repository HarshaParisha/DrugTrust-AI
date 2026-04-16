"""
MedVerify — Kaggle Dataset Importer & Converter
Downloads the 'A-Z Medicine Dataset of India' and converts it into the medicines.json format.
"""

import os
import json
import logging
import zipfile
import re
import urllib.request
import urllib.error

# Since Kaggle API might require auth, we offer a fallback direct download if possible,
# but we rely on the Kaggle API package primarily.
try:
    import pandas as pd
except ImportError:
    print("Please run: pip install pandas openpyxl kaggle")
    exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build_medicines_db")

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
OUT_JSON = os.path.join(DATA_DIR, "medicines.json")

KAGGLE_DATASET = "shudhanshusingh/az-medicine-dataset-of-india"

def download_dataset():
    os.makedirs(RAW_DIR, exist_ok=True)
    logger.info(f"Downloading dataset {KAGGLE_DATASET} from Kaggle...")
    
    try:
        import kaggle
        kaggle.api.authenticate()
        kaggle.api.dataset_download_files(KAGGLE_DATASET, path=RAW_DIR, unzip=True)
        logger.info("Download and extraction completed.")
    except Exception as e:
        logger.error(f"Kaggle API failed: {e}")
        logger.info("Ensure you have kaggle installed and ~/.kaggle/kaggle.json configured.")
        logger.info("If you downloaded the file manually, place 'A_Z_medicines_dataset_of_India.csv' (or xlsx) in data/raw/")

def clean(val) -> str:
    if pd.isna(val) or val is None:
        return ""
    return str(val).strip()

def to_list(val, sep=",") -> list:
    if pd.isna(val) or val is None:
        return []
    parts = str(val).split(sep)
    return [p.strip() for p in parts if p.strip()]

def process_data():
    csv_path = os.path.join(RAW_DIR, "A_Z_medicines_dataset_of_India.csv")
    xlsx_path = os.path.join(RAW_DIR, "A_Z_medicines_dataset_of_India.xlsx")
    
    df = None
    if os.path.exists(csv_path):
        logger.info(f"Loading {csv_path}...")
        df = pd.read_csv(csv_path, low_memory=False)
    elif os.path.exists(xlsx_path):
        logger.info(f"Loading {xlsx_path}...")
        df = pd.read_excel(xlsx_path)
    else:
        logger.error("Dataset file not found in data/raw/!")
        return

    logger.info(f"Loaded {len(df)} rows. Converting to MedVerify JSON structure...")

    medicines = []
    
    for i, row in df.iterrows():
        # Map columns gracefully (handling variations in column names if any)
        # The dataset typically has: id, name, price, Is_prescription_required, manufacturer, salt_composition... 
        
        brand_name = clean(row.get("name") or row.get("Brand Name", ""))
        generic_name = clean(row.get("substitute0") or row.get("Generic Name", ""))
        salt_composition = clean(row.get("short_composition1") or row.get("Composition") or row.get("composition", ""))
        category = clean(row.get("Therapeutic Class") or row.get("type", "Medicine"))
        manufacturer = clean(row.get("manufacturer_name") or row.get("Manufacturer") or row.get("manufacturer", ""))
        
        # Determine Schedule/Prescription
        is_rx_str = str(row.get("Is_prescription_required", "")).lower()
        requires_prescription = "required" in is_rx_str or "true" in is_rx_str
        
        used_for_list = to_list(row.get("use0") or row.get("Indications", ""))
        side_effects = to_list(row.get("sideEffect0") or row.get("Side Effects", ""))
        
        # Interactions
        interactions = to_list(row.get("Interactions", ""))

        if not brand_name and not generic_name:
            continue

        entry = {
            "id": f"MED{i+1:06d}",
            "brand_name": brand_name,
            "generic_name": generic_name,
            "salt_composition": salt_composition,
            "category": category,
            "manufacturer": manufacturer,
            "requires_prescription": requires_prescription,
            "schedule": "H" if requires_prescription else "OTC",
            "used_for": used_for_list,
            "how_to_take": clean(row.get("how_to_take")) or "As directed by physician. Do not crush or chew if extended-release.",
            "common_side_effects": side_effects[:4] if side_effects else [],
            "serious_side_effects": side_effects[4:6] if len(side_effects) > 4 else [],
            "interactions": interactions,
            "safe_for_pregnant": clean(row.get("Pregnancy")) or "Consult doctor before use. Risk vs Benefit must be assessed.",
            "safe_for_children": clean(row.get("Paediatric")) or "Consult pediatrician. Dosage must be weight-based.",
            "safe_for_elderly": clean(row.get("Elderly")) or "Use with caution. Monitor kidney and liver parameters.",
            "overdose_warning": clean(row.get("overdose_warning")) or ("Immediately seek emergency medical care in case of suspected overdose."),
            "storage": clean(row.get("storage")) or "Store in a cool, dry place below 30°C, protected from light and moisture.",
            "known_counterfeits_reported": False
        }
        
        medicines.append(entry)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(medicines, f, indent=2, ensure_ascii=False)

    logger.info(f"[OK] Successfully saved {len(medicines)} medicines to {OUT_JSON}")

if __name__ == "__main__":
    download_dataset()
    process_data()
