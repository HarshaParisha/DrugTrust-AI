"""
MedVerify — OCR Engine Tests
Uses synthetic Pillow-generated medicine label images.
"""

import os
import sys
import pytest
from PIL import Image, ImageDraw, ImageFont
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.ocr_engine import OCREngine


def create_label_image(text_lines: list, width=600, height=400) -> bytes:
    """Create a synthetic medicine label image with given lines of text."""
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 20)
        font_large = ImageFont.truetype("arial.ttf", 24)
    except OSError:
        font = ImageFont.load_default()
        font_large = font

    y = 20
    for i, line in enumerate(text_lines):
        f = font_large if i == 0 else font
        draw.text((30, y), line, fill=(0, 0, 0), font=f)
        y += 35

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestOCRFieldParsing:
    """Direct regex parser tests — no GPU/model required."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = OCREngine()

    def test_parse_medicine_name(self):
        text = "Paracetamol Tablets I.P. Each tablet contains paracetamol 500mg B.No: BN1234A"
        fields = self.engine.parse_fields(text)
        assert fields["medicine_name"] is not None
        assert "PARACETAMOL" in fields["medicine_name"].upper() or "500mg" in fields["medicine_name"]

    def test_parse_dosage_strength(self):
        text = "Ibuprofen 400mg tablets Mfd by ABC Pharma"
        fields = self.engine.parse_fields(text)
        assert fields["dosage_strength"] is not None
        assert "400mg" in fields["dosage_strength"]

    def test_parse_batch_number(self):
        text = "B.No: BN20240101 Exp: 12/2026"
        fields = self.engine.parse_fields(text)
        assert fields["batch_number"] is not None
        assert "BN20240101" in fields["batch_number"]

    def test_parse_expiry_date_slash(self):
        text = "EXP: 06/2025 Mfd: 06/2023"
        fields = self.engine.parse_fields(text)
        assert fields["expiry_date"] == "06/2025"

    def test_parse_manufacturer(self):
        text = "Mfd by Cipla Ltd. Batch No: CP001 India"
        fields = self.engine.parse_fields(text)
        assert fields["manufacturer_name"] is not None
        assert "Cipla" in fields["manufacturer_name"]


class TestExpiryValidation:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = OCREngine()

    def test_expired_medicine(self):
        result = self.engine.validate_expiry("01/2020")
        assert result["expiry_status"] == "EXPIRED"
        assert result["is_expired"] is True

    def test_valid_future_expiry(self):
        result = self.engine.validate_expiry("12/2099")
        assert result["expiry_status"] == "VALID"
        assert result["is_expired"] is False

    def test_unknown_expiry(self):
        result = self.engine.validate_expiry(None)
        assert result["expiry_status"] == "UNKNOWN"

    def test_expiry_month_year_format(self):
        result = self.engine.validate_expiry("Jan 2099")
        assert result["expiry_status"] == "VALID"

    def test_expiry_soon(self):
        from datetime import datetime, timezone, timedelta
        # Create date 20 days from now
        future = datetime.now(timezone.utc) + timedelta(days=20)
        exp_str = future.strftime("%m/%Y")
        result = self.engine.validate_expiry(exp_str)
        assert result["expiry_status"] in ("EXPIRING_SOON", "VALID")


class TestOCRConfidenceScoring:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = OCREngine()

    def test_score_all_fields_detected(self):
        fields = {
            "medicine_name": "Paracetamol 500mg",
            "dosage_strength": "500mg",
            "batch_number": "BN001",
            "expiry_date": "12/2025",
            "manufacturer_name": "Cipla Ltd"
        }
        score = self.engine.score_ocr_confidence(fields)
        assert score == 100.0

    def test_score_zero_fields(self):
        fields = {
            "medicine_name": None,
            "dosage_strength": None,
            "batch_number": None,
            "expiry_date": None,
            "manufacturer_name": None,
        }
        score = self.engine.score_ocr_confidence(fields)
        assert score == 0.0

    def test_score_partial_fields(self):
        fields = {
            "medicine_name": "Ibuprofen",
            "dosage_strength": "400mg",
            "batch_number": None,
            "expiry_date": None,
            "manufacturer_name": None,
        }
        score = self.engine.score_ocr_confidence(fields)
        assert score == 40.0  # 2 of 5 fields = 40%

    def test_score_formula_correct(self):
        """Score = (detected / 5) * 100"""
        for detected in range(0, 6):
            fields = {k: "value" if i < detected else None
                      for i, k in enumerate(["medicine_name", "dosage_strength",
                                             "batch_number", "expiry_date", "manufacturer_name"])}
            score = self.engine.score_ocr_confidence(fields)
            expected = (detected / 5) * 100
            assert abs(score - expected) < 0.001
