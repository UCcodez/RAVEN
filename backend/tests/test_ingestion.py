import hashlib
from pathlib import Path

import pytest

from app.services.ingestion import InvalidCaptureError, ingest_pcap

PCAPNG_MAGIC = b"\x0a\x0d\x0d\x0a"


def _write_fake_pcapng(tmp_path: Path) -> Path:
    
    p = tmp_path / "sample.pcapng"
    p.write_bytes(PCAPNG_MAGIC + b"\x00" * 32)
    return p


def test_ingest_valid_pcapng(tmp_path):
    fake = _write_fake_pcapng(tmp_path)
    analysis = ingest_pcap(fake, "sample.pcapng")

    assert analysis.capture_format == "pcapng"
    assert analysis.file_size_bytes == fake.stat().st_size
    assert analysis.file_sha256 == hashlib.sha256(fake.read_bytes()).hexdigest()


def test_ingest_rejects_bad_extension(tmp_path):
    bad = tmp_path / "notes.txt"
    bad.write_text("not a capture")
    with pytest.raises(InvalidCaptureError):
        ingest_pcap(bad, "notes.txt")


def test_ingest_rejects_bad_magic_bytes(tmp_path):
    bad = tmp_path / "fake.pcap"
    bad.write_bytes(b"NOTAPCAP" + b"\x00" * 20)
    with pytest.raises(InvalidCaptureError):
        ingest_pcap(bad, "fake.pcap")
