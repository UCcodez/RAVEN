"""B1 ingestion"""
from __future__ import annotations

import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

PCAP_MAGICS = {
    b"\xa1\xb2\xc3\xd4",
    b"\xd4\xc3\xb2\xa1",
    b"\xa1\xb2\x3c\x4d",
    b"\x4d\x3c\xb2\xa1",
}
PCAPNG_MAGIC = b"\x0a\x0d\x0d\x0a"

FIELDS = [
    "frame.number",
    "frame.time_epoch",
    "tcp.stream",
    "ip.src",
    "ipv6.src",
    "ip.dst",
    "ipv6.dst",
    "tcp.srcport",
    "tcp.dstport",
    "tcp.seq_raw",
    "tcp.flags",
    "tcp.payload",
]


class CaptureError(Exception):
    """The capture cannot be read. The message is safe to show to the user."""


@dataclass(slots=True)
class Segment:
    frame: int
    ts: float
    stream: int
    src: str
    sport: int
    dst: str
    dport: int
    seq: int
    flags: int
    payload: bytes

    @property
    def syn(self) -> bool:
        return bool(self.flags & 0x02)

    @property
    def ack(self) -> bool:
        return bool(self.flags & 0x10)

    @property
    def fin(self) -> bool:
        return bool(self.flags & 0x01)

    @property
    def rst(self) -> bool:
        return bool(self.flags & 0x04)


def sniff_format(path: str | Path) -> str:
    """Return 'pcap' or 'pcapng' from the magic bytes, or raise CaptureError."""
    try:
        with open(path, "rb") as fh:
            magic = fh.read(4)
    except OSError as exc:
        raise CaptureError(f"Cannot open capture: {exc.strerror}") from exc
    if magic in PCAP_MAGICS:
        return "pcap"
    if magic == PCAPNG_MAGIC:
        return "pcapng"
    raise CaptureError("Not a .pcap or .pcapng file (unrecognised file header).")


def require_tshark() -> str:
    exe = shutil.which("tshark")
    if not exe:
        raise CaptureError("tshark is not installed or not on PATH.")
    return exe


def parse_row(line: str) -> Segment | None:
    """Parse one tab-separated tshark row. Returns None for unusable rows."""
    cols = line.rstrip("\r\n").split("\t")
    cols += [""] * (len(FIELDS) - len(cols))
    (frame, ts, stream, ip4s, ip6s, ip4d, ip6d,
     sport, dport, seq, flags, payload) = cols[: len(FIELDS)]
    if not (stream and seq and sport and dport):
        return None
    try:
        return Segment(
            frame=int(frame),
            ts=float(ts),
            stream=int(stream),
            src=ip4s or ip6s,
            sport=int(sport),
            dst=ip4d or ip6d,
            dport=int(dport),
            seq=int(seq),
            flags=int(flags, 16) if flags else 0,
            payload=bytes.fromhex(payload.replace(":", "")) if payload else b"",
        )
    except ValueError:
        return None


class TsharkReader:
    

    def __init__(self, path: str | Path):
        self.path = str(path)
        self.format = sniff_format(path)
        self.tshark = require_tshark()
        self.truncated = False
        self.skipped_rows = 0
        self.warnings: list[str] = []

    def __iter__(self) -> Iterator[Segment]:
        cmd = [
            self.tshark, "-r", self.path, "-n", "-Y", "tcp",
            "-o", "tcp.desegment_tcp_streams:FALSE",
            "-T", "fields", "-E", "separator=/t", "-E", "occurrence=f",
        ]
        for f in FIELDS:
            cmd += ["-e", f]
        rows = 0
        with tempfile.TemporaryFile() as err:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, text=True)
            assert proc.stdout is not None
            for line in proc.stdout:
                seg = parse_row(line)
                if seg is None:
                    self.skipped_rows += 1
                    continue
                rows += 1
                yield seg
            proc.wait()
            err.seek(0)
            stderr = err.read().decode("utf-8", "replace").strip()
        if proc.returncode != 0:
            if rows == 0:
                raise CaptureError(f"tshark could not read the capture: {stderr[:300]}")
            self.truncated = True
            self.warnings.append("Capture ended unexpectedly; results cover the readable part only.")