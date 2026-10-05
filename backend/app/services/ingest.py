""" capture file in, identified email streams out."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .capture import CaptureError, TsharkReader
from .identify import Identification, identify
from .streams import Stream, StreamAssembler, summarize

ProgressCb = Callable[[str, dict], None]


@dataclass
class EmailStream:
    stream: Stream
    ident: Identification


@dataclass
class IngestResult:
    capture_format: str
    packets: int
    truncated: bool
    warnings: list[str]
    summary: dict
    email_streams: list[EmailStream]
    other_streams: int


def ingest(path: str | Path, on_progress: ProgressCb | None = None) -> IngestResult:
    emit = on_progress or (lambda stage, info: None)
    reader = TsharkReader(path)  # raises CaptureError for bad files
    emit("validated", {"format": reader.format})

    asm = StreamAssembler()
    packets = 0
    for seg in reader:
        asm.add(seg)
        packets += 1
    if packets == 0:
        raise CaptureError("No TCP traffic found in this capture.")
    emit("streams_read", {"packets": packets})

    streams = asm.finalize()
    email, other = [], 0
    for s in streams:
        if s.empty:
            continue
        ident = identify(s)
        if ident.protocol:
            email.append(EmailStream(s, ident))
        else:
            other += 1
    summary = summarize(streams)
    summary["email_streams"] = len(email)
    emit("protocols", {"email_streams": len(email)})
    emit("streams", summary)
    warnings = list(reader.warnings)
    if summary["streams_unreconstructed"]:
        warnings.append(f"{summary['streams_unreconstructed']} stream(s) could not be fully reconstructed.")
    return IngestResult(reader.format, packets, reader.truncated, warnings, summary, email, other)