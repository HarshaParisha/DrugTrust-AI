"""
MedVerify — Reference Matcher
Clean-room distance-based package matching using MedVerify's own vision backbone.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List, Optional

import numpy as np
import torch
import torch.nn.functional as F

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import REFERENCE_EMBEDDINGS_PATH, REFERENCE_MATCH_THRESHOLD

logger = logging.getLogger("medverify.reference_matcher")


def compute_backbone_embedding(vision_engine, image_input) -> np.ndarray:
    """Compute an L2-normalized embedding from EfficientNet backbone features."""
    tensor = vision_engine.preprocess(image_input)
    model = vision_engine.model

    model.eval()
    with torch.no_grad():
        features = model.features(tensor)
        pooled = F.adaptive_avg_pool2d(features, 1)
        flat = torch.flatten(pooled, 1)
        norm = F.normalize(flat, p=2, dim=1)

    return norm.squeeze(0).detach().cpu().numpy().astype(np.float32)


class ReferenceMatcher:
    """Distance-based matcher against internal genuine reference embeddings."""

    def __init__(self, vision_engine):
        self.vision_engine = vision_engine
        self.threshold = REFERENCE_MATCH_THRESHOLD
        self.embeddings = self._load_embeddings()

    def _load_embeddings(self) -> Dict[str, np.ndarray]:
        if not os.path.isfile(REFERENCE_EMBEDDINGS_PATH):
            logger.warning("Reference embeddings file not found: %s", REFERENCE_EMBEDDINGS_PATH)
            return {}

        try:
            with open(REFERENCE_EMBEDDINGS_PATH, "r", encoding="utf-8") as f:
                payload = json.load(f)

            labels = payload.get("labels", {}) if isinstance(payload, dict) else {}
            out: Dict[str, np.ndarray] = {}
            for label, vectors in labels.items():
                arr = np.array(vectors, dtype=np.float32)
                if arr.ndim == 2 and arr.shape[0] > 0:
                    out[label] = arr

            logger.info("Loaded reference embeddings: %d labels", len(out))
            return out
        except Exception as e:
            logger.error("Failed to load reference embeddings: %s", e)
            return {}

    def _candidate_labels(self, medicine_name: Optional[str]) -> List[str]:
        labels = list(self.embeddings.keys())
        if not medicine_name:
            return labels

        needle = medicine_name.lower().strip()
        matched = [label for label in labels if needle in label.lower() or label.lower() in needle]
        return matched or labels

    def match(self, image_path: str, medicine_name: Optional[str] = None) -> dict:
        if not self.embeddings:
            return {
                "available": False,
                "checked_references": 0,
                "best_distance": None,
                "threshold": self.threshold,
                "is_match": None,
                "matched_label": None,
            }

        try:
            query = compute_backbone_embedding(self.vision_engine, image_path)
        except Exception as e:
            logger.warning("Reference embedding extraction failed: %s", e)
            return {
                "available": True,
                "checked_references": 0,
                "best_distance": None,
                "threshold": self.threshold,
                "is_match": None,
                "matched_label": None,
            }

        best_distance = float("inf")
        best_label = None
        checked = 0

        for label in self._candidate_labels(medicine_name):
            refs = self.embeddings.get(label)
            if refs is None or refs.size == 0:
                continue

            dists = np.linalg.norm(refs - query[None, :], axis=1)
            if dists.size == 0:
                continue

            checked += int(dists.size)
            local_min = float(np.min(dists))
            if local_min < best_distance:
                best_distance = local_min
                best_label = label

        if checked == 0 or best_label is None:
            return {
                "available": True,
                "checked_references": 0,
                "best_distance": None,
                "threshold": self.threshold,
                "is_match": None,
                "matched_label": None,
            }

        return {
            "available": True,
            "checked_references": checked,
            "best_distance": round(best_distance, 6),
            "threshold": self.threshold,
            "is_match": bool(best_distance <= self.threshold),
            "matched_label": best_label,
        }
