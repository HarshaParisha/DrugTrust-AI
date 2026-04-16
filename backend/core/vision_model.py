"""
MedVerify — Vision Model: EfficientNet-B3 + MCDropout
"""

import io
import logging
import os
import warnings
from typing import Union

import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as T
from PIL import Image
from torchvision.models import efficientnet_b3, EfficientNet_B3_Weights

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    MODEL_PATH, NUM_CLASSES, MC_DROPOUT_PASSES,
    IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD,
    UNCERTAINTY_LOW_THRESHOLD, UNCERTAINTY_MEDIUM_THRESHOLD,
)

logger = logging.getLogger("medverify.vision")


class VisionVerifier:
    """EfficientNet-B3 classifier with MCDropout uncertainty estimation."""

    CLASSES = {0: "genuine", 1: "suspected_fake"}

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: nn.Module = self._build_model()
        self.model_finetuned = self._load_weights()
        self.model.to(self.device)
        logger.info(f"VisionVerifier initialized on {self.device}. Fine-tuned: {self.model_finetuned}")

        self.transform = T.Compose([
            T.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            T.ToTensor(),
            T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ])

    def _build_model(self) -> nn.Module:
        # Use weights=None for inference since we load our own fine-tuned weights
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = efficientnet_b3(weights=None)
        
        # New production classifier head (matches train_production.py)
        in_features = model.classifier[1].in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(256, NUM_CLASSES)
        )
        return model

    def _load_weights(self) -> bool:
        if os.path.isfile(MODEL_PATH):
            try:
                state = torch.load(MODEL_PATH, map_location=self.device)
                self.model.load_state_dict(state)
                logger.info(f"Loaded production weights from {MODEL_PATH}")
                return True
            except Exception as e:
                logger.error(f"Failed to load production checkpoint: {e}. Model requires retraining.")
                return False
        else:
            logger.warning(
                f"MODEL_NOT_FINETUNED — Checkpoint not found at {MODEL_PATH}. "
                "Using untrained baseline. Results are NOT clinically validated."
            )
            return False

    def preprocess(self, image_input) -> torch.Tensor:
        """Accept file path, bytes, PIL image, or NumPy array. Return tensor."""
        if isinstance(image_input, str):
            img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            img = Image.fromarray(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            raise ValueError(f"Unsupported image type: {type(image_input)}")
        return self.transform(img).unsqueeze(0).to(self.device)

    def predict(self, image_input) -> dict:
        """
        Run MC_DROPOUT_PASSES forward passes with dropout active.
        Returns mean confidence, std, uncertainty-penalised adjusted confidence.
        """
        tensor = self.preprocess(image_input)

        # MCDropout: keep dropout active (train mode) but freeze BN layers
        self.model.train()
        for module in self.model.modules():
            if isinstance(module, (nn.BatchNorm1d, nn.BatchNorm2d)):
                module.eval()

        softmax_outputs = []
        with torch.no_grad():
            for _ in range(MC_DROPOUT_PASSES):
                logits = self.model(tensor)
                probs  = torch.softmax(logits, dim=1)
                softmax_outputs.append(probs.cpu().numpy())

        self.model.eval()

        stacked = np.stack(softmax_outputs, axis=0)  # (passes, 1, num_classes)
        mean_probs = stacked.mean(axis=0)[0]         # (num_classes,)
        std_probs  = stacked.std(axis=0)[0]          # (num_classes,)

        class_id   = int(np.argmax(mean_probs))
        raw_conf   = float(mean_probs[class_id])
        mc_std     = float(std_probs[class_id])

        # Uncertainty penalty: adjusted = mean - 2 × std, clamped to [0, 1]
        adjusted_conf = float(np.clip(raw_conf - 2.0 * mc_std, 0.0, 1.0))

        # Top-2 predictions
        top2_idx = np.argsort(mean_probs)[::-1][:2]
        top2 = [
            {"class": self.CLASSES[int(i)], "confidence": float(mean_probs[i])}
            for i in top2_idx
        ]

        # Uncertainty level
        std_pct = mc_std * 100
        if std_pct < UNCERTAINTY_LOW_THRESHOLD:
            uncertainty_level = "LOW"
        elif std_pct < UNCERTAINTY_MEDIUM_THRESHOLD:
            uncertainty_level = "MEDIUM"
        else:
            uncertainty_level = "HIGH"

        result = {
            "class_id": class_id,
            "class_name": self.CLASSES[class_id],
            "raw_confidence": raw_conf,
            "mc_mean": float(mean_probs[class_id]),
            "mc_std": mc_std,
            "adjusted_confidence": adjusted_conf,
            "top2_predictions": top2,
            "uncertainty_level": uncertainty_level,
            "model_finetuned": self.model_finetuned,
        }
        return result

    def generate_heatmap(self, image_input) -> str:
        """
        Generate GradCAM heatmap on the last conv layer.
        Returns base64-encoded PNG of overlay on original image.
        """
        import base64
        import cv2
        from core.gradcam import GradCAM

        # Prepare original PIL image for overlay
        if isinstance(image_input, str):
            pil_img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, bytes):
            pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            pil_img = Image.fromarray(image_input).convert("RGB")
        else:
            pil_img = image_input.convert("RGB")

        tensor = self.preprocess(image_input)

        # Target layer: last conv block of EfficientNet-B3
        target_layer = self.model.features[-1]
        gradcam = GradCAM(self.model, target_layer)
        cam = gradcam.generate(tensor)  # returns numpy HxW in [0,1]
        gradcam.remove_hooks()

        # Resize cam to original image size
        h, w = pil_img.size[1], pil_img.size[0]
        cam_resized = cv2.resize(cam, (w, h))
        heatmap_colored = cv2.applyColorMap(
            (cam_resized * 255).astype(np.uint8), cv2.COLORMAP_JET
        )
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        # Overlay with alpha blending
        original_np = np.array(pil_img)
        overlay = (0.6 * original_np + 0.4 * heatmap_colored).astype(np.uint8)
        overlay_pil = Image.fromarray(overlay)

        buf = io.BytesIO()
        overlay_pil.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
