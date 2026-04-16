"""
Download and prepare Kaggle medicine datasets for real training.

Supports:
- surajkumarjha1/fake-vs-real-medicine-datasets-images (binary counterfeit labels)
- aryashah2k/mobile-captured-pharmaceutical-medication-packages (real package OCR/recognition diversity)

Usage:
  python scripts/download_kaggle_medicine_datasets.py
"""

# pyright: reportMissingImports=false

import shutil
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
TRAINING_DIR = DATA_DIR / "training"
REFERENCE_DIR = DATA_DIR / "reference_packages"

FAKE_REAL_HANDLE = "surajkumarjha1/fake-vs-real-medicine-datasets-images"
MOBILE_PACKS_HANDLE = "aryashah2k/mobile-captured-pharmaceutical-medication-packages"


def ensure_dirs():
    (RAW_DIR / "kaggle").mkdir(parents=True, exist_ok=True)
    REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
    for split in ["train", "val", "test"]:
        (TRAINING_DIR / split / "genuine").mkdir(parents=True, exist_ok=True)
        (TRAINING_DIR / split / "suspected_fake").mkdir(parents=True, exist_ok=True)


def find_child_dir(parent: Path, candidates: list[str]) -> Path | None:
    if not parent.exists() or not parent.is_dir():
        return None
    lookup = {c.lower() for c in candidates}
    for child in parent.rglob("*"):
        if child.is_dir() and child.name.lower() in lookup:
            return child
    return None


def copy_images(src_root: Path, dst_root: Path):
    exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    copied = 0
    for path in src_root.rglob("*"):
        if path.is_file() and path.suffix.lower() in exts:
            rel = path.relative_to(src_root)
            out_name = "_".join(rel.parts)
            shutil.copy2(path, dst_root / out_name)
            copied += 1
    return copied


def stage_fake_real_dataset(dataset_root: Path):
    print(f"[INFO] Staging fake/real dataset from: {dataset_root}")
    mapped = ["train", "val", "test"]

    total = 0
    for split in mapped:
        split_root = find_child_dir(dataset_root, [split, split.capitalize(), split.upper()])
        if split_root is None:
            print(f"[WARN] Missing split folder for '{split}' under {dataset_root}")
            continue

        real_src = find_child_dir(split_root, ["real", "genuine"])
        fake_src = find_child_dir(split_root, ["fake", "counterfeit", "suspected_fake"])

        if real_src and real_src.exists():
            c = copy_images(real_src, TRAINING_DIR / split / "genuine")
            print(f"[OK] {split}/genuine <- {c} images")
            total += c
        else:
            print(f"[WARN] Missing real/genuine folder under: {split_root}")

        if fake_src and fake_src.exists():
            c = copy_images(fake_src, TRAINING_DIR / split / "suspected_fake")
            print(f"[OK] {split}/suspected_fake <- {c} images")
            total += c
        else:
            print(f"[WARN] Missing fake/counterfeit folder under: {split_root}")

    print(f"[READY] Total copied into training/: {total}")


def stage_mobile_packs(dataset_root: Path):
    # This dataset is excellent for robust OCR/recognition pretraining, but not fake-vs-real labels.
    mobile_out = RAW_DIR / "mobile_packages"
    mobile_out.mkdir(parents=True, exist_ok=True)
    copied = copy_images(dataset_root, mobile_out)
    print(f"[OK] Copied {copied} mobile package images into {mobile_out}")


def main():
    parser = argparse.ArgumentParser(description="Download and stage MedVerify Kaggle datasets")
    parser.add_argument(
        "--include-mobile",
        action="store_true",
        help="Also download the 6GB mobile-captured package dataset for optional OCR/reference work.",
    )
    args = parser.parse_args()

    try:
        import kagglehub
    except ImportError:
        print("[ERROR] kagglehub is not installed. Run: pip install kagglehub")
        return

    ensure_dirs()

    print("[INFO] Downloading fake-vs-real medicine dataset from Kaggle...")
    fake_real_path = Path(
        kagglehub.dataset_download(
            FAKE_REAL_HANDLE,
        )
    )
    stage_fake_real_dataset(fake_real_path)

    if args.include_mobile:
        print("[INFO] Downloading mobile-captured medication package dataset from Kaggle...")
        mobile_path = Path(
            kagglehub.dataset_download(
                MOBILE_PACKS_HANDLE,
            )
        )
        stage_mobile_packs(mobile_path)
    else:
        print("[INFO] Skipping mobile-captured medication package dataset (optional, large download).")

    print("[READY] Dataset download + staging completed.")
    print("[NEXT] Run: python scripts/train_production.py")


if __name__ == "__main__":
    main()
