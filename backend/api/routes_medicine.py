"""
MedVerify — Medicine Database Routes
"""

import json
import logging
import os
import sys

from fastapi import APIRouter, HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MEDICINES_DB, API_VERSION, THRESHOLD_POLICY_VERSION

logger = logging.getLogger("medverify.routes.medicine")
router = APIRouter()


def _load_db() -> list:
    if os.path.isfile(MEDICINES_DB):
        with open(MEDICINES_DB, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@router.get("/")
async def list_medicines(search: str = "", limit: int = 20):
    """GET /medicine/ — list/search medicines in knowledge base."""
    medicines = _load_db()
    if search:
        q = search.lower()
        medicines = [
            m for m in medicines
            if q in (m.get("brand_name") or "").lower()
            or q in (m.get("generic_name") or "").lower()
            or q in (m.get("salt_composition") or "").lower()
        ]
    return {
        "total": len(medicines),
        "results": medicines[:limit],
        "api_version": API_VERSION,
    }


@router.get("/{medicine_id}")
async def get_medicine(medicine_id: str):
    """GET /medicine/{medicine_id} — get a specific medicine by ID."""
    medicines = _load_db()
    for m in medicines:
        if m.get("id") == medicine_id:
            return m
    raise HTTPException(status_code=404, detail=f"Medicine {medicine_id} not found.")
