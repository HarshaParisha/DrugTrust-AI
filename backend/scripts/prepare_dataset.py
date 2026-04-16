"""
Organizes raw downloaded images into genuine/suspected_fake train/val/test splits.
Run from backend/ directory: python scripts/prepare_dataset.py
"""
import os
import shutil
import random
from pathlib import Path
from PIL import Image

RAW_DIR = Path("data/raw")
OUTPUT_DIR = Path("data/training_v2")
SPLITS = {"train": 0.70, "val": 0.15, "test": 0.15}
MIN_IMAGE_SIZE = (100, 100)
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

def is_valid_image(path):
    try:
        img = Image.open(path)
        return img.size[0] >= MIN_IMAGE_SIZE[0] and img.size[1] >= MIN_IMAGE_SIZE[1]
    except Exception:
        return False

def collect_all_images(raw_dir):
    images = []
    for ext in VALID_EXTENSIONS:
        images.extend(raw_dir.rglob(f"*{ext}"))
        images.extend(raw_dir.rglob(f"*{ext.upper()}"))
    return [p for p in images if is_valid_image(p)]

def setup_dirs():
    for split in SPLITS:
        for cls in ["genuine", "suspected_fake"]:
            Path(OUTPUT_DIR / split / cls).mkdir(parents=True, exist_ok=True)

def main():
    setup_dirs()
    all_images = collect_all_images(RAW_DIR)
    print(f"Found {len(all_images)} valid images in raw data")

    if len(all_images) < 100:
        print("WARNING: Less than 100 images found. Download more data before training.")
        return

    random.shuffle(all_images)

    # All raw downloaded images go to genuine class
    n = len(all_images)
    train_end = int(n * SPLITS["train"])
    val_end = train_end + int(n * SPLITS["val"])

    splits_map = {
        "train": all_images[:train_end],
        "val": all_images[train_end:val_end],
        "test": all_images[val_end:]
    }

    for split, imgs in splits_map.items():
        for i, src in enumerate(imgs):
            dst = OUTPUT_DIR / split / "genuine" / f"{split}_genuine_{i:04d}{src.suffix}"
            shutil.copy2(src, dst)
        print(f"{split}/genuine: {len(imgs)} images")

    print("\nDataset prepared. Now run Step 4 to generate synthetic fakes.")

if __name__ == "__main__":
    main()
