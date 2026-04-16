"""
Calibrate REFERENCE_MATCH_THRESHOLD using labeled validation data.

Expected eval structure:
  backend/data/training/val/genuine/*.jpg
  backend/data/training/val/suspected_fake/*.jpg

It computes nearest reference distance per image and finds threshold maximizing F1.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Tuple

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import REFERENCE_MATCH_THRESHOLD
from core.reference_matcher import ReferenceMatcher
from core.vision_model import VisionVerifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("calibrate_reference_threshold")

VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def list_images(folder: Path) -> List[Path]:
    if not folder.exists():
        return []
    return [p for p in sorted(folder.rglob("*")) if p.is_file() and p.suffix.lower() in VALID_EXT]


def load_samples(eval_root: Path) -> List[Tuple[Path, int]]:
    # label: 1 = genuine, 0 = suspected_fake
    samples: List[Tuple[Path, int]] = []
    for p in list_images(eval_root / "genuine"):
        samples.append((p, 1))
    for p in list_images(eval_root / "suspected_fake"):
        samples.append((p, 0))
    return samples


def evaluate_threshold(distances: np.ndarray, labels: np.ndarray, thr: float) -> dict:
    pred = (distances <= thr).astype(np.int32)  # <= threshold => genuine match
    tp = int(((pred == 1) & (labels == 1)).sum())
    tn = int(((pred == 0) & (labels == 0)).sum())
    fp = int(((pred == 1) & (labels == 0)).sum())
    fn = int(((pred == 0) & (labels == 1)).sum())

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    acc = (tp + tn) / max(1, len(labels))

    return {
        "threshold": float(thr),
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
    }


def parse_args():
    p = argparse.ArgumentParser(description="Calibrate MedVerify reference match threshold")
    p.add_argument("--eval-root", default="backend/data/training/val", help="Validation folder with genuine/suspected_fake")
    p.add_argument("--out", default="backend/checkpoints/reference_threshold_calibration.json", help="Output JSON report path")
    p.add_argument("--min-thr", type=float, default=0.10)
    p.add_argument("--max-thr", type=float, default=0.70)
    p.add_argument("--steps", type=int, default=61, help="Number of thresholds to sweep")
    return p.parse_args()


def main():
    args = parse_args()

    eval_root = Path(args.eval_root)
    samples = load_samples(eval_root)
    if not samples:
        raise RuntimeError(f"No eval samples found under {eval_root}")

    vision = VisionVerifier()
    matcher = ReferenceMatcher(vision)
    if not matcher.embeddings:
        raise RuntimeError("Reference embeddings unavailable. Run build_reference_embeddings.py first.")

    distances: List[float] = []
    labels: List[int] = []

    for img_path, y in samples:
        medicine_hint = img_path.parent.name if img_path.parent.name else None
        res = matcher.match(str(img_path), medicine_name=medicine_hint)
        d = res.get("best_distance")
        if d is None:
            continue
        distances.append(float(d))
        labels.append(int(y))

    if not distances:
        raise RuntimeError("Matcher returned no valid distances for eval set.")

    d_arr = np.array(distances, dtype=np.float32)
    y_arr = np.array(labels, dtype=np.int32)

    thresholds = np.linspace(args.min_thr, args.max_thr, args.steps)
    results = [evaluate_threshold(d_arr, y_arr, float(t)) for t in thresholds]
    best = max(results, key=lambda r: (r["f1"], r["accuracy"]))

    payload = {
        "default_threshold": REFERENCE_MATCH_THRESHOLD,
        "recommended_threshold": best["threshold"],
        "best_metrics": best,
        "num_samples": int(len(y_arr)),
        "distance_stats": {
            "min": float(np.min(d_arr)),
            "max": float(np.max(d_arr)),
            "mean": float(np.mean(d_arr)),
            "std": float(np.std(d_arr)),
        },
        "sweep": results,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    logger.info("Saved calibration report: %s", out_path)
    logger.info(
        "Recommended threshold %.4f | F1 %.4f | Acc %.4f",
        best["threshold"], best["f1"], best["accuracy"],
    )


if __name__ == "__main__":
    main()
