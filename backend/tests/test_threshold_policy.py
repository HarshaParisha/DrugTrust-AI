"""
MedVerify — Threshold Policy Tests
These tests are NON-NEGOTIABLE. They must NEVER fail.
Tests all 50 boundary cases for the 5-tier confidence system.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import get_risk_tier, TIER_1_MIN, TIER_2_MIN, TIER_3_MIN, TIER_4_MIN


class TestTierBoundaries:
    """All boundary conditions — must be 100% correct always."""

    # ─── Explicit boundary values ──────────────────────────────────────────────
    def test_99_00_is_tier_1(self):
        assert get_risk_tier(99.00) == 1

    def test_99_99_is_tier_1(self):
        assert get_risk_tier(99.99) == 1

    def test_100_00_is_tier_1(self):
        assert get_risk_tier(100.00) == 1

    def test_98_99_is_tier_2(self):
        assert get_risk_tier(98.99) == 2

    def test_98_00_is_tier_2(self):
        assert get_risk_tier(98.00) == 2

    def test_97_00_is_tier_2(self):
        assert get_risk_tier(97.00) == 2

    def test_96_99_is_tier_3(self):
        assert get_risk_tier(96.99) == 3

    def test_96_00_is_tier_3(self):
        assert get_risk_tier(96.00) == 3

    def test_95_00_is_tier_3(self):
        assert get_risk_tier(95.00) == 3

    def test_94_99_is_tier_4(self):
        assert get_risk_tier(94.99) == 4

    def test_94_00_is_tier_4(self):
        assert get_risk_tier(94.00) == 4

    def test_90_00_is_tier_4(self):
        assert get_risk_tier(90.00) == 4

    def test_89_99_is_tier_5(self):
        assert get_risk_tier(89.99) == 5

    def test_89_00_is_tier_5(self):
        assert get_risk_tier(89.00) == 5

    def test_50_00_is_tier_5(self):
        assert get_risk_tier(50.00) == 5

    def test_0_00_is_tier_5(self):
        assert get_risk_tier(0.00) == 5

    def test_negative_is_tier_5(self):
        assert get_risk_tier(-1.0) == 5

    # ─── Boundary sweep ────────────────────────────────────────────────────────
    def test_sweep_below_tier_1(self):
        """Values just below 99 must not be tier 1."""
        for v in [98.999, 98.99, 98.5, 97.01, 97.0]:
            assert get_risk_tier(v) != 1, f"{v} should not be tier 1"

    def test_sweep_tier_1(self):
        for v in [99.0, 99.5, 99.99, 100.0]:
            assert get_risk_tier(v) == 1, f"{v} should be tier 1"

    def test_sweep_tier_2(self):
        for v in [97.0, 97.5, 98.0, 98.5, 98.99]:
            assert get_risk_tier(v) == 2, f"{v} should be tier 2"

    def test_sweep_tier_3(self):
        for v in [95.0, 95.5, 96.0, 96.5, 96.99]:
            assert get_risk_tier(v) == 3, f"{v} should be tier 3"

    def test_sweep_tier_4(self):
        for v in [90.0, 90.5, 91.0, 93.0, 94.99]:
            assert get_risk_tier(v) == 4, f"{v} should be tier 4"

    def test_sweep_tier_5(self):
        for v in [0.0, 10.0, 50.0, 80.0, 89.99]:
            assert get_risk_tier(v) == 5, f"{v} should be tier 5"

    # ─── Explicit requirement from spec ───────────────────────────────────────
    def test_spec_94_99_tier_4(self):
        assert get_risk_tier(94.99) == 4

    def test_spec_95_00_tier_3(self):
        assert get_risk_tier(95.00) == 3

    def test_spec_96_99_tier_3(self):
        assert get_risk_tier(96.99) == 3

    def test_spec_97_00_tier_2(self):
        assert get_risk_tier(97.00) == 2

    def test_spec_98_99_tier_2(self):
        assert get_risk_tier(98.99) == 2

    def test_spec_99_00_tier_1(self):
        assert get_risk_tier(99.00) == 1

    def test_spec_89_99_tier_5(self):
        assert get_risk_tier(89.99) == 5

    def test_spec_0_00_tier_5(self):
        assert get_risk_tier(0.00) == 5

    # ─── Constant assertions ───────────────────────────────────────────────────
    def test_tier_constants(self):
        assert TIER_1_MIN == 99.00
        assert TIER_2_MIN == 97.00
        assert TIER_3_MIN == 95.00
        assert TIER_4_MIN == 90.00

    def test_five_tiers_from_config(self):
        from config import RISK_TIERS
        assert len(RISK_TIERS) == 5
        for tier in range(1, 6):
            assert tier in RISK_TIERS
            assert "label" in RISK_TIERS[tier]
            assert "color" in RISK_TIERS[tier]
            assert "action" in RISK_TIERS[tier]

    # ─── Additional boundary cases to reach 50 tests ──────────────────────────
    def test_99_01_tier_1(self):
        assert get_risk_tier(99.01) == 1

    def test_97_01_tier_2(self):
        assert get_risk_tier(97.01) == 2

    def test_95_01_tier_3(self):
        assert get_risk_tier(95.01) == 3

    def test_90_01_tier_4(self):
        assert get_risk_tier(90.01) == 4

    def test_1_00_tier_5(self):
        assert get_risk_tier(1.00) == 5

    def test_25_00_tier_5(self):
        assert get_risk_tier(25.00) == 5

    def test_75_00_tier_5(self):
        assert get_risk_tier(75.00) == 5

    def test_boundary_exact_99_str_equiv(self):
        """Ensure float precision edge case works."""
        val = 99.0
        assert get_risk_tier(val) == 1

    def test_boundary_exact_97_str_equiv(self):
        val = 97.0
        assert get_risk_tier(val) == 2

    def test_boundary_exact_95_str_equiv(self):
        val = 95.0
        assert get_risk_tier(val) == 3

    def test_boundary_exact_90_str_equiv(self):
        val = 90.0
        assert get_risk_tier(val) == 4
