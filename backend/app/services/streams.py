"""B2 TCP stream reconstruction"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from .capture import Segment

MAIL_PORTS = {25, 587, 465, 143, 993, 110, 995}
_HALF = 1 << 31
_MOD = 1 << 32


def _signed_delta(seq: int, ref: int) -> int:
    
    return ((seq - ref + _HALF) % _MOD) - _HALF


@dataclass
class DirectionData:
    data: bytes = b""
     
    gaps: list[tuple[int, int]] = field(default_factory=list)
    segments: int = 0
    retransmitted: int = 0
    out_of_order: int = 0
    syn_seen: bool = False
    fin_seen: bool = False
    rst_seen: bool = False
    first_ts: float | None = None
    last_ts: float | None = None

    @property
    def has_gap(self) -> bool:
        return bool(self.gaps)

    @property
    def contiguous(self) -> bytes:
        
        return self.data[: self.gaps[0][0]] if self.gaps else self.data


class _DirectionAssembler:
    def __init__(self) -> None:
        self.items: list[tuple[int, bytes]] = []   
        self.syn_seq: int | None = None
        self.out_of_order = 0
        self._high: int | None = None   
        self._ref: int | None = None
        self.d = DirectionData()

    def add(self, seg: Segment) -> None:
        d = self.d
        if self._ref is None:
            self._ref = seg.seq
        d.first_ts = seg.ts if d.first_ts is None else min(d.first_ts, seg.ts)
        d.last_ts = seg.ts if d.last_ts is None else max(d.last_ts, seg.ts)
        if seg.syn:
            d.syn_seen = True
            self.syn_seq = seg.seq
        d.fin_seen |= seg.fin
        d.rst_seen |= seg.rst
        if not seg.payload:
            return
        off = _signed_delta(seg.seq, self._ref)
        if self._high is not None and off < self._high:
            self.out_of_order += 1  
        self._high = max(self._high or off, off + len(seg.payload))
        self.items.append((seg.seq, seg.payload))
        d.segments += 1

    def finish(self) -> DirectionData:
        d = self.d
        if not self.items:
            return d
        ref = self._ref if self._ref is not None else self.items[0][0]
        placed = [(_signed_delta(seq, ref), p) for seq, p in self.items]
        placed.sort(key=lambda x: x[0])   
        start = _signed_delta(self.syn_seq, ref) + 1 if self.syn_seq is not None else placed[0][0]
        cursor = start
        out = bytearray()
        retrans = 0
        for off, payload in placed:
            end = off + len(payload)
            if end <= cursor:
                retrans += 1
                continue
            if off > cursor:
                d.gaps.append((len(out), off - cursor))
                cursor = off
            elif off < cursor:
                retrans += 1   
            out += payload[cursor - off:]
            cursor = end
        d.data = bytes(out)
        d.retransmitted = retrans
        d.out_of_order = self.out_of_order
        return d


@dataclass
class Stream:
    stream_id: int
    client: tuple[str, int]
    server: tuple[str, int]
    c2s: DirectionData
    s2c: DirectionData

    @property
    def empty(self) -> bool:
        return not self.c2s.data and not self.s2c.data

    @property
    def reconstructed(self) -> bool:
        
        return not (self.c2s.has_gap or self.s2c.has_gap)

    @property
    def mid_stream(self) -> bool:
         
        return not (self.c2s.syn_seen or self.s2c.syn_seen)


class StreamAssembler:
    def __init__(self) -> None:
        self._streams: dict[int, dict] = {}

    def add(self, seg: Segment) -> None:
        s = self._streams.get(seg.stream)
        if s is None:
            s = {"first": (seg.src, seg.sport, seg.dst, seg.dport), "client": None,
                 "a": _DirectionAssembler(), "b": _DirectionAssembler()}
            self._streams[seg.stream] = s
        if seg.syn and not seg.ack:
            s["client"] = (seg.src, seg.sport)
         
        fsrc, fsport = s["first"][0], s["first"][1]
        (s["a"] if (seg.src, seg.sport) == (fsrc, fsport) else s["b"]).add(seg)

    def finalize(self) -> list[Stream]:
        result = []
        for sid in sorted(self._streams):
            s = self._streams[sid]
            fsrc, fsport, fdst, fdport = s["first"]
            first, other = (fsrc, fsport), (fdst, fdport)
            client = s["client"]
            if client is None:  
                if other[1] in MAIL_PORTS and first[1] not in MAIL_PORTS:
                    client = first
                elif first[1] in MAIL_PORTS and other[1] not in MAIL_PORTS:
                    client = other
                else:
                    client = first
            a, b = s["a"].finish(), s["b"].finish()
            if client == first:
                c2s, s2c, server = a, b, other
            else:
                c2s, s2c, server = b, a, first
            result.append(Stream(sid, client, server, c2s, s2c))
        return result


def reassemble(segments: Iterable[Segment]) -> list[Stream]:
    asm = StreamAssembler()
    for seg in segments:
        asm.add(seg)
    return asm.finalize()


def summarize(streams: list[Stream]) -> dict:
     
    data_streams = [s for s in streams if not s.empty]
    partial = [s for s in data_streams if not s.reconstructed]
    return {
        "streams_total": len(streams),
        "streams_with_data": len(data_streams),
        "streams_reconstructed": len(data_streams) - len(partial),
        "streams_unreconstructed": len(partial),
        "streams_mid_capture": sum(1 for s in data_streams if s.mid_stream),
    }