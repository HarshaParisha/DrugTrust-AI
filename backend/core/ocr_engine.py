"""
MedVerify — OCR Engine: EasyOCR + Pytesseract + PaddleOCR + Field Parser
"""

import io
import logging
import os
import re
import json
import difflib
import calendar
from datetime import datetime, timezone
from typing import Optional, Union, Any, List, Dict

import cv2
import numpy as np
from PIL import Image

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import OCR_LANGUAGES, OCR_MIN_TEXT_LENGTH, OCR_KEY_FIELDS

logger = logging.getLogger("medverify.ocr")


PATTERNS = {
    "medicine_name": [
        r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Tablets?|Capsules?|Syrup|Injection|I\.P\.|U\.S\.P\.)',
        r'((?:[A-Z][a-z]+\s*){1,3}(?:500|250|100|650|10|5|2\.5|50|400|200|800)\s*(?:mg|mcg|ml|g))',
        r'\b([A-Z]{3,}[A-Z0-9]*-\d{2,4})\b',
    ],
    "dosage_strength": [
        r'(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|IU|%|units?))',
    ],
    "brand_name": [
        r'(?:Brand|Trade)\s*[:\-]?\s*([A-Z][A-Za-z0-9\-]+)',
        r'^([A-Z][A-Za-z0-9\-]{2,})\s*[-–]\s*\d',  # e.g. "Olidol-500"
    ],
    "batch_number": [
        r'(?:Batch|B\.?\s*No\.?|Lot|LOT)[\.:\s#]*([A-Z0-9\-\/]+)',
    ],
    "expiry_date": [
        r'(?:Exp(?:iry)?|Use\s+[Bb]efore|EXP)[\.:\s]*(\d{2}[\/\-]\d{4})',
        r'(?:Exp(?:iry)?|Use\s+[Bb]efore|EXP)[\.:\s]*([A-Za-z]{3,9}[\s\-]\d{4})',
        r'(?:Exp(?:iry)?|Use\s+[Bb]efore|EXP)[\.:\s]*([A-Za-z]{3,9}[\.\s\-/]\d{2,4})',
        r'(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})',
    ],
    "mfg_date": [
        r'(?:Mfg|Mfd|Manufactured)[\.:\s]*(?:Date)?[\.:\s]*(\d{2}[\/\-]\d{4})',
        r'(?:Mfg|Mfd|Manufactured)[\.:\s]*(?:Date)?[\.:\s]*([A-Za-z]{3,9}[\.\s\-/]\d{2,4})',
    ],
    "manufacturer_name": [
        r'(?:Mfd\.?\s+by|Manufactured\s+by|Marketed\s+by)[\.:\s]*([A-Za-z][\w\s\.,]+?)(?:\n|Pvt|Ltd|Inc|LLC)',
    ],
    "mrp": [
        r'(?:MRP|M\.R\.P\.?)[\.:\s]*(?:Rs\.?|₹)?\s*(\d+(?:\.\d{2})?)',
    ],
    "license_number": [
        r'(?:Lic(?:ence|ense)?\.?\s*No\.?|Drug\s+Lic)[\.:\s]*([A-Z0-9\/\-]+)',
    ],
    "salt_composition": [
        r'(?:Each\s+(?:tablet|capsule|ml)\s+contains?|Composition)[\.:\s]*(.+?)(?:\n|IP|USP|$)',
    ],
    "storage_instructions": [
        r'(?:Store|Keep|Protect)[^\.]{0,80}(?:\.|$)',
    ],
}


class OCREngine:
    """PaddleOCR primary + EasyOCR fallback + pytesseract tertiary fallback."""

    def __init__(self):
        self.easyocr_reader = None
        self.paddle_reader = None
        self.pytesseract = None
        self._init_easyocr()
        self._init_pytesseract()
        if os.getenv("MEDVERIFY_ENABLE_PADDLE_OCR", "0") == "1":
            self._init_paddleocr()
        else:
            logger.info("PaddleOCR disabled (set MEDVERIFY_ENABLE_PADDLE_OCR=1 to enable).")

    def _init_easyocr(self):
        try:
            import easyocr
            self.easyocr_reader = easyocr.Reader(OCR_LANGUAGES, gpu=False, verbose=False)
            logger.info("EasyOCR initialized.")
        except Exception as e:
            logger.warning(f"EasyOCR unavailable: {e}")

    def _init_pytesseract(self):
        try:
            import pytesseract
            # On Windows, set path if not in PATH
            common_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ]
            for p in common_paths:
                if os.path.isfile(p):
                    pytesseract.pytesseract.tesseract_cmd = p
                    break
            self.pytesseract = pytesseract
            logger.info("Pytesseract initialized.")
        except Exception as e:
            self.pytesseract = None
            logger.warning(f"Pytesseract unavailable: {e}")

    def _init_paddleocr(self):
        """Initialize PaddleOCR as an optional tertiary OCR backend."""
        try:
            # Windows compatibility for mixed OpenMP runtimes (torch + paddle).
            os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
            from paddleocr import PaddleOCR
            # Keep CPU mode for broader compatibility in local/dev environments.
            # Language 'en' is stable for medicine strip alphanumerics.
            self.paddle_reader = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=False,
                show_log=False,
            )
            logger.info("PaddleOCR initialized.")
        except Exception as e:
            self.paddle_reader = None
            logger.warning(f"PaddleOCR unavailable: {e}")

    # ─── Image Preprocessing ───────────────────────────────────────────────────

    def _to_numpy(self, image_input) -> np.ndarray:
        if isinstance(image_input, np.ndarray):
            return image_input
        elif isinstance(image_input, Image.Image):
            return np.array(image_input.convert("RGB"))
        elif isinstance(image_input, bytes):
            arr = np.frombuffer(image_input, np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        elif isinstance(image_input, str):
            return cv2.imread(image_input)
        raise ValueError(f"Unsupported type: {type(image_input)}")

    def _suppress_foil_glare(self, bgr: np.ndarray) -> np.ndarray:
        """Reduce specular highlights from shiny blister foils before OCR."""
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Bright + low saturation zones are usually glare on foil.
        glare_mask = cv2.inRange(hsv, (0, 0, 210), (180, 70, 255))
        glare_mask = cv2.medianBlur(glare_mask, 5)

        # Inpaint highlighted regions to recover nearby text strokes.
        glare_fixed = cv2.inpaint(bgr, glare_mask, 3, cv2.INPAINT_TELEA)
        return glare_fixed

    def _normalize_numerals(self, text: str) -> str:
        """Normalize Devanagari digits to ASCII for regex extraction (e.g. ५०० -> 500)."""
        devanagari_to_ascii = str.maketrans("०१२३४५६७८९", "0123456789")
        return text.translate(devanagari_to_ascii)

    def preprocess_for_ocr(self, image_input: Any) -> np.ndarray:
        img = self._to_numpy(image_input)
        h, w = img.shape[:2]
        
        # 1. Resize to at least 1500px width (crucial for very small medicine text)
        if w < 1500:
            scale = 1500 / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            
        # 2. Foil-glare suppression before grayscale conversion
        glare_fixed = self._suppress_foil_glare(img)

        # 3. Convert to Grayscale
        gray = cv2.cvtColor(glare_fixed, cv2.COLOR_BGR2GRAY)
        
        # 4. Increase Contrast (Adaptive CLAHE prevents washing out text)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        
        # 5. Denoise lightly (Median filter destroys small text, Gaussian is safer)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        
        # Create lightweight OCR views for robust extraction without latency spikes
        thresh = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2,
        )

        # Keep just two variants to avoid expensive multi-engine combinatorics.
        self._ocr_variants = [gray, thresh]
        self._last_thresh = thresh
        return gray

    def _score_extraction(self, raw_text: str, avg_conf: float) -> float:
        token_count = len([t for t in raw_text.split() if len(t) > 1])
        keyword_bonus = 0
        upper = raw_text.upper()
        for kw in ["TABLETS", "IP", "MG", "EXP", "MFD", "B.NO", "BATCH", "LOT"]:
            if kw in upper:
                keyword_bonus += 3
        return (avg_conf * 100.0) + (token_count * 2.0) + keyword_bonus

    def _run_paddle(self, img: np.ndarray) -> Optional[dict]:
        if self.paddle_reader is None:
            return None
        paddle_result = self.paddle_reader.ocr(img, cls=True)
        text_blocks: List[str] = []
        confs: List[float] = []

        if paddle_result:
            for page in paddle_result:
                if not page:
                    continue
                for line in page:
                    if not line or len(line) < 2:
                        continue
                    txt_info = line[1]
                    if not isinstance(txt_info, (list, tuple)) or len(txt_info) < 2:
                        continue
                    text_val = str(txt_info[0]).strip()
                    conf_val = float(txt_info[1]) if txt_info[1] is not None else 0.0
                    if text_val:
                        text_blocks.append(text_val)
                        confs.append(conf_val)

        raw_text = " ".join(text_blocks)
        avg_conf = float(sum(confs) / len(confs)) if confs else 0.0
        if len(raw_text.strip()) >= OCR_MIN_TEXT_LENGTH:
            return {
                "raw_text": raw_text,
                "word_list": text_blocks,
                "ocr_engine_used": "paddleocr",
                "avg_confidence": avg_conf,
            }
        return None

    def _run_easyocr(self, img: np.ndarray) -> Optional[dict]:
        if self.easyocr_reader is None:
            return None
        results = self.easyocr_reader.readtext(img, detail=1, paragraph=False)
        text_blocks = [r[1] for r in results if r[2] > 0.1]
        avg_conf = sum(r[2] for r in results) / len(results) if results else 0
        raw_text = " ".join(text_blocks)
        if len(raw_text.strip()) >= OCR_MIN_TEXT_LENGTH:
            return {
                "raw_text": raw_text,
                "word_list": text_blocks,
                "ocr_engine_used": "easyocr",
                "avg_confidence": avg_conf,
            }
        return None

    def _run_tesseract(self, img: np.ndarray) -> Optional[dict]:
        if self.pytesseract is None:
            return None
        data = self.pytesseract.image_to_data(
            img,
            output_type=self.pytesseract.Output.DICT,
            config='--psm 6 --oem 3'
        )
        confidences = [int(c) for c in data['conf'] if str(c) != '-1']
        words = [
            data['text'][i] for i, c in enumerate(data['conf'])
            if str(c) != '-1' and int(c) > 30 and data['text'][i].strip()
        ]
        avg_conf = sum(confidences) / len(confidences) / 100 if confidences else 0.0
        raw_text = " ".join(words)
        if len(raw_text.strip()) >= OCR_MIN_TEXT_LENGTH:
            return {
                "raw_text": raw_text,
                "word_list": words,
                "ocr_engine_used": "pytesseract",
                "avg_confidence": avg_conf,
            }
        return None

    # ─── Text Extraction ───────────────────────────────────────────────────────

    def extract_text(self, image_input):
        self.preprocess_for_ocr(image_input)
        variants = getattr(self, "_ocr_variants", None) or []
        if not variants:
            variants = [self._last_thresh]

        primary = variants[0]
        alternate = variants[1] if len(variants) > 1 else variants[0]

        # 1) EasyOCR primary (faster and stable for this workflow)
        try:
            res = self._run_easyocr(primary)
            if res:
                return res
        except Exception:
            pass

        # 2) EasyOCR alternate thresholded view
        try:
            res = self._run_easyocr(alternate)
            if res:
                return res
        except Exception:
            pass

        # 3) Tesseract fallback
        try:
            res = self._run_tesseract(alternate)
            if res:
                return res
        except Exception:
            pass

        # 4) Paddle last-resort fallback (slow on some CPUs)
        try:
            res = self._run_paddle(primary)
            if res:
                return res
        except Exception:
            pass

        # 5) Paddle alternate final fallback
        try:
            res = self._run_paddle(alternate)
            if res:
                return res
        except Exception:
            pass

        return {"raw_text": "", "word_list": [], "ocr_engine_used": "none", "avg_confidence": 0.0}

    # ─── Field Parser ──────────────────────────────────────────────────────────

    def parse_fields(self, raw_text: str) -> Dict[str, Any]:
        raw_text = self._normalize_numerals(raw_text or "")
        fields: Dict[str, Any] = {}
        match_sources: Dict[str, str] = {}
        for field, patterns in PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, raw_text, re.IGNORECASE | re.MULTILINE)
                if match:
                    fields[field] = match.group(1).strip()
                    match_sources[field] = f"regex:{pattern}"
                    break
            if field not in fields:
                fields[field] = None

        # Heuristic fallback extractions for common strip patterns
        if not fields.get("dosage_strength"):
            m = re.search(r'\b(\d{2,4}\s*(?:mg|mcg|ml|g|IU|units?))\b', raw_text, re.IGNORECASE)
            if m:
                fields["dosage_strength"] = m.group(1).strip()
                match_sources["dosage_strength"] = "heuristic:dosage_token"

        if not fields.get("batch_number"):
            m = re.search(r'\b([A-Z]{1,4}\d{4,10})\b', raw_text)
            if m:
                fields["batch_number"] = m.group(1).strip()
                match_sources["batch_number"] = "heuristic:batch_alnum"

        # DB-assisted name correction/fallback
        # - If medicine_name is missing: fill from closest DB match
        # - If medicine_name is present but noisy: autocorrect to closest DB brand/generic
        try:
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "medicines.json")
            with open(db_path, "r", encoding="utf-8") as f:
                db = json.load(f)

            db_names: List[str] = []
            for med in db:
                if med.get("brand_name"):
                    db_names.append(med["brand_name"])
                if med.get("generic_name"):
                    db_names.append(med["generic_name"])

            # Evaluate candidate tokens from OCR text
            words = [w.strip(".,:;()[]{}") for w in raw_text.split()]
            tokens = [w for w in words if len(w) >= 4]
            current_name = (fields.get("medicine_name") or "").strip()
            if current_name:
                tokens.insert(0, current_name)

            best_match: Optional[str] = None
            best_ratio = 0.0

            for token in tokens:
                candidates = difflib.get_close_matches(token, db_names, n=1, cutoff=0.75)
                if not candidates:
                    continue
                cand = candidates[0]
                ratio = difflib.SequenceMatcher(None, token.lower(), cand.lower()).ratio()
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = cand

            # If we already had a name, only autocorrect when match is reasonably strong
            if current_name and best_match and best_ratio >= 0.80:
                if current_name.lower() != best_match.lower():
                    fields["medicine_name"] = best_match
                    fields["_fuzzy_name_match"] = True
                    match_sources["medicine_name"] = f"fuzzy_db:{best_ratio:.3f}"

            # If no name found, use best fuzzy match
            if not current_name and best_match:
                fields["medicine_name"] = best_match
                fields["_fuzzy_name_match"] = True
                match_sources["medicine_name"] = f"fuzzy_db:{best_ratio:.3f}"

        except Exception as e:
            logger.error(f"Failed to load medicines.json for fuzzy matching: {e}")

        fields["_match_sources"] = match_sources
        return fields

    # ─── Expiry Validation ─────────────────────────────────────────────────────

    def validate_expiry(self, expiry_str: Optional[str]) -> dict:
        """Parse expiry date and determine status."""
        if not expiry_str:
            return {"is_expired": False, "days_remaining": None,
                    "formatted_date": None, "expiry_status": "UNKNOWN"}

        now = datetime.now(timezone.utc)
        parsed = None

        formats_to_try = [
            r'(\d{2})/(\d{4})',
            r'(\d{2})-(\d{4})',
        ]
        for fmt in formats_to_try:
            m = re.match(fmt, expiry_str.strip())
            if m:
                try:
                    month, year = int(m.group(1)), int(m.group(2))
                    # Last day of that month = first day of next month - 1 day
                    last_day = calendar.monthrange(year, month)[1]
                    parsed = datetime(year, month, last_day, tzinfo=timezone.utc)
                    break
                except (ValueError, OverflowError):
                    pass

        # "Jan 2025", "January 2025", "JUL.24"
        if parsed is None:
            m = re.match(r'([A-Za-z]+)[\.\s\-/]+(\d{2,4})', expiry_str.strip())
            if m:
                try:
                    month = datetime.strptime(m.group(1)[:3], "%b").month
                    year_raw = int(m.group(2))
                    year = (2000 + year_raw) if year_raw < 100 else year_raw
                    last_day = calendar.monthrange(year, month)[1]
                    parsed = datetime(year, month, last_day, tzinfo=timezone.utc)
                except ValueError:
                    pass

        if parsed is None:
            return {"is_expired": False, "days_remaining": None,
                    "formatted_date": expiry_str, "expiry_status": "UNKNOWN"}

        days_remaining = (parsed - now).days
        formatted = parsed.strftime("%B %Y")

        if days_remaining < 0:
            status = "EXPIRED"
        elif days_remaining <= 30:
            status = "EXPIRING_SOON"
        else:
            status = "VALID"

        return {
            "is_expired": days_remaining < 0,
            "days_remaining": days_remaining,
            "formatted_date": formatted,
            "expiry_status": status,
        }

    # ─── OCR Confidence Scoring ────────────────────────────────────────────────

    def score_ocr_confidence(self, parsed_fields: dict) -> float:
        """
        Formula: score = (detected_fields / total_key_fields) × 100
        Key fields each worth 20 points: medicine_name, dosage_strength,
        batch_number, expiry_date, manufacturer_name.
        """
        detected = sum(
            1 for field in OCR_KEY_FIELDS
            if parsed_fields.get(field) not in (None, "")
        )
        return (detected / len(OCR_KEY_FIELDS)) * 100.0

    # ─── Main Entry Point ─────────────────────────────────────────────────────

    def process(self, image_input) -> dict:
        """Full pipeline: extract → parse → validate → score."""
        extraction = self.extract_text(image_input)
        raw_text   = extraction.get("raw_text", "")
        parsed     = self.parse_fields(raw_text)
        match_sources = parsed.pop("_match_sources", {}) if isinstance(parsed, dict) else {}
        fuzzy_name_match = bool(parsed.pop("_fuzzy_name_match", False)) if isinstance(parsed, dict) else False
        expiry_info = self.validate_expiry(parsed.get("expiry_date"))
        parsed["expiry_status"] = expiry_info["expiry_status"]
        score = self.score_ocr_confidence(parsed)

        raw_snippets = extraction.get("word_list", []) or []
        top_snippets: List[str] = []
        for s in raw_snippets:
            t = str(s).strip()
            if t and t not in top_snippets:
                top_snippets.append(t)
            if len(top_snippets) >= 20:
                break

        debug_trace = {
            "engine_used": extraction.get("ocr_engine_used", "unknown"),
            "avg_confidence": float(extraction.get("avg_confidence", 0.0)),
            "top_candidate_text_snippets": top_snippets,
            "matched_regex_source": match_sources,
            "fuzzy_name_match": fuzzy_name_match,
        }

        return {
            **parsed,
            "raw_text": raw_text,
            "word_list": extraction.get("word_list", []),
            "ocr_engine_used": extraction.get("ocr_engine_used", "unknown"),
            "avg_confidence": extraction.get("avg_confidence", 0.0),
            "ocr_confidence_score": score,
            "expiry_detail": expiry_info,
            "ocr_debug_trace": debug_trace,
        }
