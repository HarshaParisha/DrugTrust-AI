"""
MedVerify — Fusion Engine Tests
Tests weight math, expiry override, manufacturer mismatch, boundary rounding.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import VISION_WEIGHT, OCR_WEIGHT, MATCH_BONUS, MISMATCH_PENALTY, get_risk_tier
from core.fusion_engine import FusionEngine


def _mock_vision(adj_conf=0.95, mc_std=0.01, finetuned=True):
    return {
        "class_id": 0,
        "class_name": "genuine",
        "raw_confidence": adj_conf,
        "mc_mean": adj_conf,
        "mc_std": mc_std,
        "adjusted_confidence": adj_conf,
        "top2_predictions": [],
        "uncertainty_level": "LOW",
        "model_finetuned": finetuned,
    }


def _mock_ocr(conf=80.0, expiry_status="VALID", medicine_name=None, mfg=None, expiry_date=None):
    return {
        "medicine_name": medicine_name,
        "salt_composition": None,
        "dosage_strength": "500mg",
        "batch_number": "BN001",
        "expiry_date": expiry_date or "12/2099",
        "mfg_date": None,
        "manufacturer_name": mfg,
        "license_number": None,
        "mrp": None,
        "storage_instructions": None,
        "expiry_status": expiry_status,
        "ocr_confidence_score": conf,
        "ocr_engine_used": "easyocr",
    }


def _mock_llm():
    return {
        "medicine_name": "Test Medicine",
        "category": "Analgesic",
        "used_for": ["Pain"],
        "how_to_take": "Once daily",
        "common_side_effects": ["Nausea"],
        "serious_side_effects": [],
        "do_not_combine_with": [],
        "requires_prescription": False,
        "safe_for_pregnant": "Consult doctor",
        "safe_for_children": "Consult doctor",
        "safe_for_elderly": "Yes",
        "safe_for_diabetics": "Yes",
        "overdose_warning": "Seek help.",
        "storage_reminder": "Cool dry place.",
        "disclaimer": "For info only.",
        "llm_available": True,
    }


class TestFusionWeights:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = FusionEngine()

    def test_weight_math(self):
        """final_conf = vision_adj * 100 * 0.65 + OCR_score * 0.35"""
        vision_adj = 0.99   # 99%
        ocr_score  = 80.0
        expected   = (vision_adj * 100 * VISION_WEIGHT) + (ocr_score * OCR_WEIGHT)
        assert abs(VISION_WEIGHT + OCR_WEIGHT - 1.0) < 0.001
        assert abs(expected - (99 * 0.65 + 80 * 0.35)) < 0.001

    def test_confidence_at_tier1(self):
        """High vision + high OCR → Tier 1."""
        v = _mock_vision(adj_conf=0.999)
        o = _mock_ocr(conf=100.0)
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert result.risk_tier == 1

    def test_confidence_at_tier5_low(self):
        """Low vision + low OCR → Tier 5."""
        v = _mock_vision(adj_conf=0.5)
        o = _mock_ocr(conf=20.0)
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert result.risk_tier == 5


class TestExpiryOverride:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = FusionEngine()

    def test_expired_forces_tier5(self):
        """EXPIRED medicine MUST always be tier 5, even with perfect vision."""
        v = _mock_vision(adj_conf=1.0)
        o = _mock_ocr(conf=100.0, expiry_status="EXPIRED")
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert result.risk_tier == 5
        assert result.final_confidence == 0.0
        assert "EXPIRED" in result.flags

    def test_expired_overrides_high_vision(self):
        """99.9% vision confidence means nothing if medicine is expired."""
        v = _mock_vision(adj_conf=0.999)
        o = _mock_ocr(conf=95.0, expiry_status="EXPIRED")
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert result.risk_tier == 5

    def test_valid_expiry_not_overridden(self):
        """Valid expiry → normal tier calculation applies."""
        v = _mock_vision(adj_conf=0.999)
        o = _mock_ocr(conf=95.0, expiry_status="VALID")
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert result.risk_tier in (1, 2, 3)


class TestManufacturerMismatch:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = FusionEngine()

    def test_manufacturer_mismatch_flag(self):
        """If medicine found in DB but manufacturer doesn't match → MANUFACTURER_MISMATCH flag."""
        v = _mock_vision(adj_conf=0.98)
        o = _mock_ocr(conf=80.0, medicine_name="Crocin", mfg="Fake Pharma Ltd")
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert "MANUFACTURER_MISMATCH" in result.flags

    def test_no_mismatch_when_no_db_entry(self):
        """Medicine not in DB → no mismatch flag."""
        v = _mock_vision(adj_conf=0.98)
        o = _mock_ocr(conf=80.0, medicine_name="ObscureMedXYZ", mfg="Any Pharma")
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        assert "MANUFACTURER_MISMATCH" not in result.flags


class TestModelNotFinetunedFlag:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = FusionEngine()

    def test_not_finetuned_flag_present(self):
        v = _mock_vision(adj_conf=0.95, finetuned=False)
        o = _mock_ocr(conf=70.0)
        result = self.engine.fuse(v, o, _mock_llm(), "fakehash")
        flags_upper = [f.upper() for f in result.flags]
        assert any("MODEL_NOT_FINETUNED" in f for f in result.flags)


class TestBoundaryRounding:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.engine = FusionEngine()

    def test_tier_boundary_at_95(self):
        assert get_risk_tier(95.0) == 3
        assert get_risk_tier(94.99) == 4

    def test_tier_boundary_at_99(self):
        assert get_risk_tier(99.0) == 1
        assert get_risk_tier(98.99) == 2

    def test_tier_boundary_at_90(self):
        assert get_risk_tier(90.0) == 4
        assert get_risk_tier(89.99) == 5
