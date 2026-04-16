"""
MedVerify — Image Processor: Preprocessing, enhancement, blur detection
"""

import hashlib
import io
import logging
import os

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("medverify.image_processor")


def load_image_bytes(file_bytes: bytes) -> np.ndarray:
    """Load image from raw bytes to BGR numpy array."""
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes")
    return img


def compute_sha256(data: bytes) -> str:
    """Compute SHA256 hash of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def save_image(file_bytes: bytes, uploads_dir: str) -> tuple[str, str]:
    """
    Save image to uploads_dir named by its SHA256 hash.
    Returns (sha256_hash, file_path).
    """
    sha256 = compute_sha256(file_bytes)
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, f"{sha256}.jpg")
    if not os.path.isfile(file_path):
        img = load_image_bytes(file_bytes)
        cv2.imwrite(file_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return sha256, file_path


def detect_blur(img_bgr: np.ndarray) -> dict:
    """
    Detect if an image is blurry using Laplacian variance.
    Returns: {is_blurry, blur_score, threshold}
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    threshold = 100.0
    return {
        "is_blurry": variance < threshold,
        "blur_score": round(variance, 2),
        "threshold": threshold,
    }


def enhance_for_verification(img_bgr: np.ndarray) -> np.ndarray:
    """
    Apply sharpening and contrast enhancement for visual verification.
    """
    # Unsharp mask for sharpening
    blurred = cv2.GaussianBlur(img_bgr, (0, 0), 3)
    sharpened = cv2.addWeighted(img_bgr, 1.5, blurred, -0.5, 0)

    # Mild contrast boost via CLAHE on L channel
    lab = cv2.cvtColor(sharpened, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    return enhanced


def resize_for_display(img_bgr: np.ndarray, max_dim: int = 800) -> np.ndarray:
    """Resize image keeping aspect ratio, max dimension = max_dim."""
    h, w = img_bgr.shape[:2]
    if max(h, w) <= max_dim:
        return img_bgr
    scale = max_dim / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)


def pil_to_bytes(pil_img: Image.Image, fmt: str = "JPEG") -> bytes:
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt, quality=95)
    return buf.getvalue()
