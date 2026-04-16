import torchvision.datasets as datasets
import torchvision.transforms as transforms
from pathlib import Path
from PIL import Image
import numpy as np
import os

GENUINE_DIR = Path("data/training_v2/train/genuine")
GENUINE_DIR.mkdir(parents=True, exist_ok=True)

print("Downloading CIFAR-10 as base...")
# This requires NO API key, downloads automatically
try:
    dataset = datasets.CIFAR10(root="data/raw/cifar", download=True, train=True)

    # Save first 500 images as base genuine class
    print("Saving images...")
    for i in range(500):
        img, label = dataset[i]
        # img is a PIL image in CIFAR-10
        img_resized = img.resize((300, 300), Image.LANCZOS)
        img_resized.save(GENUINE_DIR / f"base_{i:04d}.jpg")
        if i % 100 == 0:
            print(f"Saved {i}/500")

    print("\nBase dataset ready in", GENUINE_DIR)
except Exception as e:
    print(f"Failed to download CIFAR-10: {e}")
