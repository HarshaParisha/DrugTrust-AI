"""
Downloads medicine images from public sources without Kaggle API.
Includes GitHub mirrors and Google Image scraping.
"""
import requests
from pathlib import Path
import time
from icrawler.builtin import GoogleImageCrawler

GENUINE_DIR = Path("data/training_v2/train/genuine")
GENUINE_DIR.mkdir(parents=True, exist_ok=True)

# Method A: GitHub Mirrors
IMAGE_SOURCES = [
    "https://raw.githubusercontent.com/RxNLP/medicine-image-dataset/main/images/paracetamol_1.jpg",
    "https://raw.githubusercontent.com/RxNLP/medicine-image-dataset/main/images/amoxicillin_1.jpg",
    "https://raw.githubusercontent.com/RxNLP/medicine-image-dataset/main/images/aspirin_1.jpg",
    "https://raw.githubusercontent.com/RxNLP/medicine-image-dataset/main/images/metformin_1.jpg"
]

def download_url(url, dest_path):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200 and len(r.content) > 5000:
            with open(dest_path, "wb") as f:
                f.write(r.content)
            return True
    except Exception as e:
        print(f"  Failed: {e}")
    return False

print("Starting Method A: GitHub Downloads...")
downloaded = 0
for i, url in enumerate(IMAGE_SOURCES):
    dest = GENUINE_DIR / f"genuine_gh_{i:04d}.jpg"
    if download_url(url, dest):
        downloaded += 1
        print(f"Downloaded {downloaded}: {url}")
    time.sleep(0.3)

# Method D: Google Image Scraping
print("\nStarting Method D: Google Image Scraping...")
crawler = GoogleImageCrawler(storage={"root_dir": str(GENUINE_DIR)})
queries = [
    "medicine blister pack India",
    "pharmaceutical tablet strip packaging",
    "medicine bottle label India",
    "paracetamol strip packaging",
    "antibiotic capsule blister pack",
    "medicine box India pharmaceutical"
]

count = downloaded
for query in queries:
    print(f"Crawling query: {query}")
    crawler.crawl(keyword=query, max_num=30, file_idx_offset=count)
    count += 30

print(f"\nFinal Genuine images in {GENUINE_DIR}: {len(list(GENUINE_DIR.glob('*.*')))}")
