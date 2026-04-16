"""
MedVerify — History Routes
"""

import json
import os
import sys
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import API_VERSION, THRESHOLD_POLICY_VERSION
from models.database import (
    get_db, get_all_scans, get_scan_by_id, delete_all_scans, delete_scan,
)
from models.schemas import HistoryEntry, VerificationResult

router = APIRouter()


@router.get("/", response_model=List[HistoryEntry])
async def list_history(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    """GET /history/ — list all past scans (most recent first)."""
    records = get_all_scans(db, limit=limit, offset=offset)
    results = []
    for r in records:
        results.append(HistoryEntry(
            scan_id=r.scan_id,
            image_hash=r.image_hash,
            timestamp=r.timestamp,
            risk_tier=r.risk_tier,
            risk_label=r.risk_label,
            final_confidence=r.final_confidence,
            medicine_name=r.medicine_name,
            flags=json.loads(r.flags) if r.flags else [],
        ))
    return results


@router.get("/{scan_id}", response_model=VerificationResult)
async def get_history_scan(scan_id: str, db: Session = Depends(get_db)):
    """GET /history/{scan_id} — retrieve a specific past scan."""
    record = get_scan_by_id(db, scan_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found.")
    return VerificationResult(**json.loads(record.result_json))


@router.delete("/")
async def clear_history(db: Session = Depends(get_db)):
    """DELETE /history/ — clear all past scans."""
    count = delete_all_scans(db)
    return {"status": "SUCCESS", "message": f"Deleted {count} scans."}


@router.delete("/{scan_id}")
async def delete_history_entry(scan_id: str, db: Session = Depends(get_db)):
    """DELETE /history/{scan_id} — delete a specific scan."""
    success = delete_scan(db, scan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return {"status": "SUCCESS", "scan_id": scan_id}
