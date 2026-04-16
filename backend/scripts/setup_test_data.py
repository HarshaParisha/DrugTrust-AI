import os
from PIL import Image
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "training")

def create_dummy_images(path, count=5):
    os.makedirs(path, exist_ok=True)
    for i in range(count):
        # Create a random color image
        img_array = np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)
        img = Image.fromarray(img_array)
        img.save(os.path.join(path, f"dummy_{i}.jpg"))

def setup():
    for split in ['train', 'val']:
        for cls in ['0_genuine', '1_suspected_fake']:
            path = os.path.join(DATA_DIR, split, cls)
            print(f"[INFO] Creating {path}...")
            create_dummy_images(path, count=10 if split == 'train' else 5)
    
    print("\n[OK] Minimal dummy dataset created for training smoke test.")

if __name__ == "__main__":
    setup()
