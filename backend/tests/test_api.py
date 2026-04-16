"""
MedVerify — API Integration Tests
Tests health, risk-policy, and core endpoints using fastapi TestClient.
"""

import io
import json
import os
import sys
import time
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def create_test_image() -> bytes:
    """Create a synthetic medicine image for testing."""
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "PARACETAMOL 500mg", fill=(0, 0, 0))
    draw.text((20, 60), "Mfd by Cipla Ltd", fill=(0, 0, 0))
    draw.text((20, 100), "Batch No: CP001", fill=(0, 0, 0))
    draw.text((20, 140), "EXP: 12/2099", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestHealthEndpoints:

    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["service"] == "MedVerify"
        assert data["status"] == "running"
        assert "version" in data

    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "api" in data
        assert data["api"] == "ok"
        assert "api_version" in data
        assert "threshold_policy_version" in data


class TestRiskPolicy:

    def test_risk_policy_returns_five_tiers(self, client):
        resp = client.get("/verify/risk-policy")
        assert resp.status_code == 200
        data = resp.json()
        assert "policy" in data
        assert len(data["policy"]) == 5
        assert "threshold_policy_version" in data
        assert "api_version" in data

    def test_risk_policy_has_correct_thresholds(self, client):
        resp = client.get("/verify/risk-policy")
        data = resp.json()
        thresholds = data.get("thresholds", {})
        assert thresholds.get("tier_1_min") == 99.0
        assert thresholds.get("tier_2_min") == 97.0
        assert thresholds.get("tier_3_min") == 95.0
        assert thresholds.get("tier_4_min") == 90.0


class TestVerifyImageEndpoint:

    def test_verify_image_returns_verification_result(self, client):
        img_bytes = create_test_image()
        resp = client.post(
            "/verify/image",
            files={"image": ("test.jpg", img_bytes, "image/jpeg")},
            data={"include_heatmap": "false"},
        )
        assert resp.status_code == 200
        data = resp.json()

        # Required fields
        assert "scan_id" in data
        assert "api_version" in data
        assert "threshold_policy_version" in data
        assert "final_confidence" in data
        assert "risk_tier" in data
        assert "risk_label" in data
        assert "vision" in data
        assert "ocr" in data
        assert "prescription_intel" in data
        assert data["risk_tier"] in (1, 2, 3, 4, 5)
        assert 0 <= data["final_confidence"] <= 100

    def test_verify_image_response_time_under_30s(self, client):
        img_bytes = create_test_image()
        start = time.time()
        resp = client.post(
            "/verify/image",
            files={"image": ("test.jpg", img_bytes, "image/jpeg")},
            data={"include_heatmap": "false"},
        )
        elapsed = time.time() - start
        assert resp.status_code == 200
        assert elapsed < 30.0, f"Response took {elapsed:.1f}s"

    def test_scan_stored_and_retrievable(self, client):
        img_bytes = create_test_image()
        # Post scan
        post_resp = client.post(
            "/verify/image",
            files={"image": ("test.jpg", img_bytes, "image/jpeg")},
            data={"include_heatmap": "false"},
        )
        assert post_resp.status_code == 200
        scan_id = post_resp.json()["scan_id"]

        # Retrieve scan
        get_resp = client.get(f"/verify/{scan_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["scan_id"] == scan_id

    def test_verify_image_accepts_scan_source_metadata(self, client):
        img_bytes = create_test_image()
        resp = client.post(
            "/verify/image",
            files={"image": ("test.jpg", img_bytes, "image/jpeg")},
            data={"include_heatmap": "false", "scan_source": "auto_capture"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "scan_id" in data
