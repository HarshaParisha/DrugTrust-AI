"""
Build reference package embeddings for clean-room distance matching.

Expected folder structure (either style works):

Style A - one label folder with images:
    backend/data/training/train/genuine/*.jpg

Style B - multiple label folders:
    backend/data/reference_packages/
        crocin_500_genuine/
            img1.jpg
            img2.jpg
        dolo_650_genuine/
            img1.jpg

Output:
  backend/checkpoints/reference_embeddings.json
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import REFERENCE_DATA_DIR, REFERENCE_EMBEDDINGS_PATH
from core.vision_model import VisionVerifier
from core.reference_matcher import compute_backbone_embedding

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build_reference_embeddings")

VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def list_images(folder: str) -> List[str]:
    out = []
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        if os.path.isfile(path) and os.path.splitext(name.lower())[1] in VALID_EXT:
            out.append(path)
    return out


def collect_images_with_label(source_root: str) -> Dict[str, List[str]]:
    root = Path(source_root)
    if not root.exists():
        raise FileNotFoundError(f"Source root not found: {source_root}")

    # If the folder directly contains images, treat everything as a single generic label.
    direct_images = list_images(str(root))
    if direct_images:
        label = root.name.strip().lower().replace(" ", "_") or "genuine"
        return {label: direct_images}

    labels: Dict[str, List[str]] = {}
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        images = list_images(str(child))
        if images:
            label = child.name.strip().lower().replace(" ", "_")
            labels[label] = images
    if not labels:
        raise RuntimeError(f"No images found under {source_root}")
    return labels


def build_embeddings(reference_root: str) -> Dict[str, List[List[float]]]:
    vision = VisionVerifier()
    labels: Dict[str, List[List[float]]] = {}

    for label, images in collect_images_with_label(reference_root).items():
        if not images:
            continue

        vectors: List[List[float]] = []
        for image_path in images:
            try:
                emb = compute_backbone_embedding(vision, image_path)
                vectors.append(emb.astype(np.float32).tolist())
            except Exception as e:
                logger.warning("Skipping %s due to error: %s", image_path, e)

        if vectors:
            labels[label] = vectors
            logger.info("Label %s: %d embeddings", label, len(vectors))

    if not labels:
        raise RuntimeError("No embeddings were generated. Check your reference dataset folders/images.")

    return labels


def parse_args():
    parser = argparse.ArgumentParser(description="Build MedVerify reference embeddings")
    parser.add_argument("--reference-root", default=REFERENCE_DATA_DIR, help="Folder containing reference package images (either a single image folder or per-label folders)")
    parser.add_argument("--output", default=REFERENCE_EMBEDDINGS_PATH, help="Output JSON path")
    return parser.parse_args()


def main():
    args = parse_args()
    labels = build_embeddings(args.reference_root)

    payload = {
        "format_version": 1,
        "method": "medverify_backbone_l2",
        "labels": labels,
    }

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(payload, f)

    logger.info("Saved reference embeddings to %s", args.output)
    logger.info("Total labels: %d", len(labels))


if __name__ == "__main__":
    main()
