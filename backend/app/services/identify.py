"""B1 protocol identification by content"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .streams import Stream

PORT_PROTOCOL = {25: "SMTP", 587: "SMTP", 465: "SMTP", 143: "IMAP", 993: "IMAP", 110: "POP3", 995: "POP3"}
IMPLICIT_TLS_PORTS = {465, 993, 995}

_SMTP_BANNER = re.compile(rb"^220[ -][^\r\n]*\b(E?SMTP)\b", re.I)
_SMTP_CLIENT = re.compile(rb"^(EHLO|HELO)[ \r\n]", re.I)
_IMAP_BANNER = re.compile(rb"^\* (OK|PREAUTH|BYE)\b[^\r\n]*", re.I)
_IMAP_CLIENT = re.compile(rb"^\S+ (CAPABILITY|LOGIN|STARTTLS|AUTHENTICATE|LOGOUT|NOOP)\b", re.I)
_POP_BANNER = re.compile(rb"^\+OK\b", re.I)
_POP_CLIENT = re.compile(rb"^(USER|PASS|CAPA|STLS|APOP|AUTH|QUIT)\b", re.I)

_STARTTLS_CMD = {
    "SMTP": re.compile(rb"^STARTTLS\r?$", re.I | re.M),
    "IMAP": re.compile(rb"^\S+ STARTTLS\r?$", re.I | re.M),
    "POP3": re.compile(rb"^STLS\r?$", re.I | re.M),
}


@dataclass
class Identification:
    protocol: str | None       
    mode: str                  
    method: str                
    confidence: str            
    server_port: int
    banner: str
    evidence: list[str]


def _starts_tls(data: bytes) -> bool:
    return len(data) >= 3 and data[0] == 0x16 and data[1] == 0x03 and data[2] <= 0x04


def _content_protocol(c2s: bytes, s2c: bytes) -> tuple[str | None, list[str]]:
    ev: list[str] = []
    if _SMTP_BANNER.match(s2c):
        ev.append("server banner: 220 ... SMTP")
        return "SMTP", ev
    if _SMTP_CLIENT.match(c2s):
        ev.append("client opens with EHLO/HELO")
        return "SMTP", ev
    m = _IMAP_BANNER.match(s2c)
    if m and b"IMAP" in m.group(0).upper():
        ev.append("server banner: * OK ... IMAP")
        return "IMAP", ev
    if _IMAP_CLIENT.match(c2s):
        ev.append("client sends tagged IMAP command")
        return "IMAP", ev
    if _POP_BANNER.match(s2c) and (not c2s or _POP_CLIENT.match(c2s)):
        ev.append("server banner: +OK, POP3-style command")
        return "POP3", ev
    return None, ev


def identify(stream: Stream) -> Identification:
    c2s, s2c = stream.c2s.contiguous, stream.s2c.contiguous
    port = stream.server[1]
    port_proto = PORT_PROTOCOL.get(port)
    banner = s2c.split(b"\n", 1)[0].decode("latin-1", "replace").strip()[:200] if not _starts_tls(s2c) else ""

    if _starts_tls(c2s):  
        if port_proto:
            return Identification(port_proto, "implicit_tls", "port", "low", port, "",
                                  [f"TLS handshake from first byte on port {port}"])
        return Identification(None, "unknown", "none", "none", port, "", ["TLS on a non-mail port"])

    proto, ev = _content_protocol(c2s, s2c)
    if proto is None:
        if port_proto and (c2s or s2c):
            return Identification(port_proto, "unknown", "port", "low", port, banner,
                                  [f"port {port} only; no recognisable banner or command"])
        return Identification(None, "unknown", "none", "none", port, banner, [])

    if port_proto == proto:
        conf = "high"
        ev.append(f"port {port} agrees")
    elif port_proto:
        conf = "medium"
        ev.append(f"port {port} suggests {port_proto}; content wins")
    else:
        conf = "medium"
        ev.append(f"non-standard port {port}")
    mode = "starttls_command" if _STARTTLS_CMD[proto].search(c2s) else "plaintext"
    return Identification(proto, mode, "content", conf, port, banner, ev)