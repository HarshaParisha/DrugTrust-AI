"""
MedVerify — Pydantic Request/Response Schemas
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class OCRFields(BaseModel):
    medicine_name: Optional[str] = None
    salt_composition: Optional[str] = None
    dosage_strength: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[str] = None
    mfg_date: Optional[str] = None
    manufacturer_name: Optional[str] = None
    license_number: Optional[str] = None
    mrp: Optional[str] = None
    storage_instructions: Optional[str] = None
    expiry_status: str = "UNKNOWN"   # VALID / EXPIRING_SOON / EXPIRED / UNKNOWN
    ocr_confidence_score: float = 0.0
    ocr_engine_used: str = "unknown"
    ocr_debug_trace: Optional[Dict[str, Any]] = None


class VisionResult(BaseModel):
    class_id: int
    class_name: str
    raw_confidence: float
    adjusted_confidence: float
    mc_mean: float
    mc_std: float
    top2_predictions: List[Dict[str, Any]] = []
    uncertainty_level: str = "UNKNOWN"  # LOW / MEDIUM / HIGH


class PrescriptionIntel(BaseModel):
    medicine_name: Optional[str] = None
    category: Optional[str] = None
    used_for: List[str] = []
    how_to_take: Optional[str] = None
    common_side_effects: List[str] = []
    serious_side_effects: List[str] = []
    do_not_combine_with: List[str] = []
    requires_prescription: Optional[bool] = None
    safe_for_pregnant: Optional[str] = None
    safe_for_children: Optional[str] = None
    safe_for_elderly: Optional[str] = None
    safe_for_diabetics: Optional[str] = None
    overdose_warning: Optional[str] = None
    storage_reminder: Optional[str] = None
    disclaimer: str
    llm_available: bool = True
    consult_reminder: str = "Always consult your doctor or a licensed pharmacist before using any medicine."


class ReferenceMatchResult(BaseModel):
    available: bool = False
    checked_references: int = 0
    best_distance: Optional[float] = None
    threshold: Optional[float] = None
    is_match: Optional[bool] = None
    matched_label: Optional[str] = None


class VerificationResult(BaseModel):
    scan_id: str
    image_hash: str
    timestamp: str
    processing_time_ms: int
    final_confidence: float
    risk_tier: int
    risk_label: str
    risk_color: str
    action_required: str
    flags: List[str] = []
    vision: VisionResult
    ocr: OCRFields
    prescription_intel: PrescriptionIntel
    reference_match: Optional[ReferenceMatchResult] = None
    heatmap_base64: Optional[str] = None
    api_version: str
    model_version: str
    threshold_policy_version: str
    consult_reminder: str = "Always consult your doctor or a licensed pharmacist before using any medicine."


class ReportRequest(BaseModel):
    user_note: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    scan_id: Optional[str] = None
    api_version: str
    threshold_policy_version: str


class HistoryEntry(BaseModel):
    scan_id: str
    image_hash: str
    timestamp: str
    risk_tier: int
    risk_label: str
    final_confidence: float
    medicine_name: Optional[str] = None
    flags: List[str] = []
