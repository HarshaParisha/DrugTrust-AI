"""
MedVerify — Text Validator: Expiry date parser, batch number validator
"""

import re
from datetime import datetime, timezone
from typing import Optional


def validate_batch_number(batch: Optional[str]) -> dict:
    """Validate batch number format."""
    if not batch:
        return {"valid": False, "reason": "Batch number not detected"}
    batch = batch.strip()
    # Typical Indian pharma batch: letters+numbers, 4-20 chars
    if re.match(r'^[A-Z0-9\-/]{3,20}$', batch, re.IGNORECASE):
        return {"valid": True, "batch": batch, "reason": "Valid format"}
    return {"valid": False, "batch": batch, "reason": "Unusual format — manual check recommended"}


def parse_expiry(expiry_str: Optional[str]) -> Optional[datetime]:
    """Try to parse expiry string to datetime. Returns None if unparseable."""
    if not expiry_str:
        return None

    # MM/YYYY or MM-YYYY
    m = re.match(r'(\d{1,2})[/\-](\d{4})', expiry_str.strip())
    if m:
        try:
            import calendar
            month, year = int(m.group(1)), int(m.group(2))
            last_day = calendar.monthrange(year, month)[1]
            return datetime(year, month, last_day, tzinfo=timezone.utc)
        except ValueError:
            pass

    # "Jan 2025"
    m = re.match(r'([A-Za-z]+)\s+(\d{4})', expiry_str.strip())
    if m:
        try:
            import calendar
            month = datetime.strptime(m.group(1)[:3], "%b").month
            year = int(m.group(2))
            last_day = calendar.monthrange(year, month)[1]
            return datetime(year, month, last_day, tzinfo=timezone.utc)
        except ValueError:
            pass

    return None


def is_expired(expiry_str: Optional[str]) -> bool:
    parsed = parse_expiry(expiry_str)
    if parsed is None:
        return False
    return parsed < datetime.now(timezone.utc)


def days_until_expiry(expiry_str: Optional[str]) -> Optional[int]:
    parsed = parse_expiry(expiry_str)
    if parsed is None:
        return None
    return (parsed - datetime.now(timezone.utc)).days
