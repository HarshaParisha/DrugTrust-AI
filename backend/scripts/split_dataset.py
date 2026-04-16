"""
Splits genuine images from train into val and test sets.
"""
import shutil, random
from pathlib import Path

src = Path("data/training_v2/train/genuine")
val_dir = Path("data/training_v2/val/genuine")
test_dir = Path("data/training_v2/test/genuine")
val_dir.mkdir(parents=True, exist_ok=True)
test_dir.mkdir(parents=True, exist_ok=True)

all_imgs = [f for f in src.glob("*.*") if f.suffix.lower() in {".jpg",".jpeg",".png"}]
random.shuffle(all_imgs)

n = len(all_imgs)
if n < 10:
    print(f"Not enough images to split safely: {n}")
else:
    val_end = int(n * 0.85)
    test_end = int(n * 0.925)

    # Move to val/genuine
    for img in all_imgs[val_end:test_end]:
        shutil.move(str(img), val_dir / img.name)
    
    # Move to test/genuine
    for img in all_imgs[test_end:]:
        shutil.move(str(img), test_dir / img.name)

    print(f"Split complete:")
    print(f"Train: {len(list(src.glob('*.*')))}")
    print(f"Val:   {len(list(val_dir.glob('*.*')))}")
    print(f"Test:  {len(list(test_dir.glob('*.*')))}")
