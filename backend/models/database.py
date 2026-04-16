"""
MedVerify — SQLAlchemy Database Models + Initialization
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import create_engine, Text, Boolean, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session, Mapped, mapped_column, DeclarativeBase

import sys
# Ensure backend directory is in path for config import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import SQLITE_DB
except ImportError:
    # Fallback for different execution contexts
    SQLITE_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "medverify.db")

DATABASE_URL = f"sqlite:///{SQLITE_DB}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA cache_size=-64000")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scan_id: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    image_hash: Mapped[str] = mapped_column(nullable=False)
    timestamp: Mapped[str] = mapped_column(nullable=False)
    final_confidence: Mapped[float] = mapped_column(nullable=False)
    risk_tier: Mapped[int] = mapped_column(nullable=False)
    risk_label: Mapped[str] = mapped_column(nullable=False)
    medicine_name: Mapped[Optional[str]] = mapped_column(nullable=True)
    flags: Mapped[str] = mapped_column(Text, default="[]")   # JSON-serialised list
    result_json: Mapped[str] = mapped_column(Text, nullable=False)  # Full VerificationResult JSON
    processing_time_ms: Mapped[Optional[int]] = mapped_column(nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)


class FlaggedReport(Base):
    __tablename__ = "flagged_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scan_id: Mapped[str] = mapped_column(index=True, nullable=False)
    timestamp: Mapped[str] = mapped_column(nullable=False)
    user_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


def init_db():
    """Create all tables. Idempotent — safe to call on every startup."""
    os.makedirs(os.path.dirname(SQLITE_DB), exist_ok=True)
    Base.metadata.create_all(bind=engine)


from typing import Generator
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def save_scan(db: Session, scan_id: str, image_hash: str, timestamp: str,
              final_confidence: float, risk_tier: int, risk_label: str,
              medicine_name: Optional[str], flags: list, result_json: str,
              processing_time_ms: int):
    record = ScanRecord(
        scan_id=scan_id,
        image_hash=image_hash,
        timestamp=timestamp,
        final_confidence=final_confidence,
        risk_tier=risk_tier,
        risk_label=risk_label,
        medicine_name=medicine_name,
        flags=json.dumps(flags),
        result_json=result_json,
        processing_time_ms=processing_time_ms,
        is_flagged=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_scan_by_id(db: Session, scan_id: str) -> Optional[ScanRecord]:
    return db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id).first()


def save_flagged_report(db: Session, scan_id: str, user_note: Optional[str]):
    timestamp = datetime.now(timezone.utc).isoformat()
    report = FlaggedReport(scan_id=scan_id, timestamp=timestamp, user_note=user_note)
    db.add(report)
    # Mark original scan as flagged
    scan = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id).first()
    if scan:
        scan.is_flagged = True
    db.commit()
    return report


def delete_scan(db: Session, scan_id: str) -> bool:
    record = db.query(ScanRecord).filter(ScanRecord.scan_id == scan_id).first()
    if record:
        db.delete(record)
        db.commit()
        return True
    return False


def delete_all_scans(db: Session) -> int:
    num_deleted = db.query(ScanRecord).delete()
    db.commit()
    return num_deleted


def get_all_scans(db: Session, limit: int = 50, offset: int = 0):
    return (db.query(ScanRecord)
              .order_by(ScanRecord.id.desc())
              .offset(offset)
              .limit(limit)
              .all())
