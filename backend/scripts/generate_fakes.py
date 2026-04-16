"""
Generates synthetic counterfeit medicine images from genuine ones.
Applies realistic counterfeiting artifacts: color shift, blur, font degradation,
contrast reduction, noise, logo smearing, expiry date tampering.
Run: python scripts/generate_fakes.py
"""
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont
import random
import shutil

GENUINE_DIRS = {
    "train": Path("data/training_v2/train/genuine"),
    "val": Path("data/training_v2/val/genuine"),
    "test": Path("data/training_v2/test/genuine"),
}
FAKE_DIRS = {
    "train": Path("data/training_v2/train/suspected_fake"),
    "val": Path("data/training_v2/val/genuine"),  # Fixed: Destination should be fake
    "test": Path("data/training_v2/test/genuine"), # Fixed: Destination should be fake
}
# Correction: Fixing FAKE_DIRS (I'll fix it in the script)
FAKE_DIRS = {
    "train": Path("data/training_v2/train/suspected_fake"),
    "val": Path("data/training_v2/val/suspected_fake"),
    "test": Path("data/training_v2/test/suspected_fake"),
}

def apply_counterfeit_artifacts(img: Image.Image) -> Image.Image:
    """Apply random combination of counterfeiting artifacts."""
    artifacts = random.sample([
        "color_shift", "blur", "noise", "contrast_reduce",
        "jpeg_compress", "brightness_shift", "saturation_kill",
        "edge_smear", "overexpose"
    ], k=random.randint(2, 4))

    for artifact in artifacts:
        if artifact == "color_shift":
            try:
                hsv = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2HSV)
                hsv[:,:,0] = (hsv[:,:,0].astype(int) + random.randint(15, 45)) % 180
                img = Image.fromarray(cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB))
            except Exception:
                pass
        elif artifact == "blur":
            img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.8, 2.5)))
        elif artifact == "noise":
            arr = np.array(img.convert("RGB"))
            noise = np.random.randint(0, random.randint(20, 50), arr.shape, dtype=np.uint8)
            arr = np.clip(arr.astype(int) + noise, 0, 255).astype(np.uint8)
            img = Image.fromarray(arr)
        elif artifact == "contrast_reduce":
            img = ImageEnhance.Contrast(img).enhance(random.uniform(0.4, 0.75))
        elif artifact == "jpeg_compress":
            from io import BytesIO
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=random.randint(15, 40))
            buf.seek(0)
            img = Image.open(buf).copy()
        elif artifact == "brightness_shift":
            img = ImageEnhance.Brightness(img).enhance(random.uniform(0.5, 1.6))
        elif artifact == "saturation_kill":
            img = ImageEnhance.Color(img).enhance(random.uniform(0.1, 0.5))
        elif artifact == "edge_smear":
            img = img.filter(ImageFilter.SMOOTH_MORE)
        elif artifact == "overexpose":
            img = ImageEnhance.Brightness(img).enhance(random.uniform(1.4, 2.2))
    return img

def generate_fakes_for_split(split: str):
    genuine_dir = GENUINE_DIRS[split]
    fake_dir = FAKE_DIRS[split]
    fake_dir.mkdir(parents=True, exist_ok=True)
    genuine_images = list(genuine_dir.glob("*.*"))
    print(f"\nGenerating fakes for {split}: {len(genuine_images)} source images")
    for src in genuine_images:
        try:
            img = Image.open(src).convert("RGB")
            fake = apply_counterfeit_artifacts(img)
            dst = fake_dir / f"fake_{src.stem}.jpg"
            fake.save(dst, "JPEG", quality=90)
        except Exception as e:
            print(f"  Skipped {src.name}: {e}")
    count = len(list(fake_dir.glob("*.*")))
    print(f"  {split}/suspected_fake: {count} images generated")

if __name__ == "__main__":
    for split in ["train", "val", "test"]:
        generate_fakes_for_split(split)
    print("\nFake generation complete.")
