"""
PCAP ingestion
"""
from __future__ import annotations

import hashlib
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.db import save_entity
from app.models.schemas import Analysis, AnalysisStatus

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "pcaps"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

VALID_EXTENSIONS = {".pcap", ".pcapng"}
 
MAGIC_BYTES = {
    b"\xa1\xb2\xc3\xd4": "pcap",  
    b"\xd4\xc3\xb2\xa1": "pcap",   
    b"\x0a\x0d\x0d\x0a": "pcapng",   
}


class InvalidCaptureError(Exception):
    pass


def _detect_format(file_path: Path) -> str:
    with open(file_path, "rb") as f:
        header = f.read(4)
    for magic, fmt in MAGIC_BYTES.items():
        if header == magic:
            return fmt
    raise InvalidCaptureError(
        f"'{file_path.name}' does not look like a valid pcap/pcapng file "
        f"(unrecognized header bytes: {header!r})."
    )


def _sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ingest_pcap(upload_path: Path, original_filename: str) -> Analysis:
    
    suffix = Path(original_filename).suffix.lower()
    if suffix not in VALID_EXTENSIONS:
        raise InvalidCaptureError(
            f"Unsupported file extension '{suffix}'. Expected one of {VALID_EXTENSIONS}."
        )

    capture_format = _detect_format(upload_path)
    file_hash = _sha256(upload_path)
    file_size = upload_path.stat().st_size

    analysis_id = f"ana_{uuid.uuid4().hex[:12]}"
    stored_path = STORAGE_DIR / f"{analysis_id}{suffix}"
    shutil.copy2(upload_path, stored_path)

    analysis = Analysis(
        analysis_id=analysis_id,
        file_name=original_filename,
        file_sha256=file_hash,
        file_size_bytes=file_size,
        capture_format=capture_format,
        created_at=datetime.now(timezone.utc),
        status=AnalysisStatus.QUEUED,
    )
    save_entity("analysis", analysis_id, analysis_id, analysis.model_dump())
    return analysis


def stored_pcap_path(analysis: Analysis) -> Path:
    suffix = ".pcapng" if analysis.capture_format == "pcapng" else ".pcap"
    return STORAGE_DIR / f"{analysis.analysis_id}{suffix}"
