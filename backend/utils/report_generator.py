"""
MedVerify — Report Generator: Flagged report JSON builder
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import REPORTS_DIR

logger = logging.getLogger("medverify.report")


def build_flagged_report(scan_id: str, scan_result: dict, user_note: Optional[str]) -> dict:
    """Construct a flagged report dict from a scan result."""
    return {
        "report_type": "SUSPICIOUS_MEDICINE_FLAG",
        "scan_id": scan_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_note": user_note or "",
        "risk_tier": scan_result.get("risk_tier"),
        "risk_label": scan_result.get("risk_label"),
        "final_confidence": scan_result.get("final_confidence"),
        "flags": scan_result.get("flags", []),
        "image_hash": scan_result.get("image_hash"),
        "medicine_name": (scan_result.get("ocr", {}) or {}).get("medicine_name"),
        "manufacturer": (scan_result.get("ocr", {}) or {}).get("manufacturer_name"),
        "batch_number": (scan_result.get("ocr", {}) or {}).get("batch_number"),
        "expiry_date": (scan_result.get("ocr", {}) or {}).get("expiry_date"),
        "action": "REPORT_SUBMITTED — Under review by pharmacovigilance team.",
        "disclaimer": "This report is submitted for human review. Do not use this system as the sole basis for regulatory action.",
    }


def save_flagged_report(scan_id: str, report: dict) -> str:
    """Save report JSON to REPORTS_DIR. Returns file path."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"flagged_{scan_id}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Flagged report saved: {report_path}")
    return report_path
