"""
Protocol identification + first-pass TCP stream grouping.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

import pyshark

from app.core.db import save_entity
from app.models.schemas import EmailSession, EncryptionState, NetworkEndpoint, Protocol

# Port  
PORT_MAP: dict[int, tuple[Protocol, bool, str]] = {
    25: (Protocol.SMTP, False, "SMTP"),
    587: (Protocol.SMTP, False, "SMTP-Submission"),
    465: (Protocol.SMTP, True, "SMTPS"),
    143: (Protocol.IMAP, False, "IMAP"),
    993: (Protocol.IMAP, True, "IMAPS"),
    110: (Protocol.POP3, False, "POP3"),
    995: (Protocol.POP3, True, "POP3S"),
}

# Banner/greeting signatures 
BANNER_SIGNATURES: dict[Protocol, tuple[str, ...]] = {
    Protocol.SMTP: ("220 ", "ehlo", "helo", "starttls"),
    Protocol.IMAP: ("* ok", "a001", "capability", "starttls"),
    Protocol.POP3: ("+ok", "stls", "user ", "pass "),
}


def _classify_by_port(server_port: int) -> tuple[Protocol, bool, str, str]:
    if server_port in PORT_MAP:
        proto, implicit_tls, variant = PORT_MAP[server_port]
        return proto, implicit_tls, variant, "Port"
    return Protocol.UNKNOWN, False, "UNKNOWN", "Port"


def _refine_by_banner(payloads: list[str], port_guess: Protocol) -> tuple[Protocol, str]:
     
    lowered = " ".join(payloads).lower()
    for proto, signatures in BANNER_SIGNATURES.items():
        if any(sig in lowered for sig in signatures):
            if proto == port_guess:
                return proto, "Port+BannerSignature"
            return proto, "BannerSignature(OverridesPort)"
    if port_guess != Protocol.UNKNOWN:
        return port_guess, "Port(NoBannerConfirmation)"
    return Protocol.UNKNOWN, "Unclassified"


def identify_sessions(pcap_path: Path, analysis_id: str) -> list[EmailSession]:
     
    cap = pyshark.FileCapture(str(pcap_path), keep_packets=False)

    streams: dict[str, dict] = {}

    for pkt in cap:
        if "TCP" not in pkt or "IP" not in pkt:
            continue
        stream_id = pkt.tcp.stream
        entry = streams.setdefault(
            stream_id,
            {
                "src_ip": pkt.ip.src,
                "dst_ip": pkt.ip.dst,
                "src_port": int(pkt.tcp.srcport),
                "dst_port": int(pkt.tcp.dstport),
                "first_time": float(pkt.sniff_timestamp),
                "last_time": float(pkt.sniff_timestamp),
                "payloads": [],
            },
        )
        entry["last_time"] = float(pkt.sniff_timestamp)
        if hasattr(pkt.tcp, "payload"):
            try:
                raw = bytes.fromhex(pkt.tcp.payload.replace(":", ""))
                entry["payloads"].append(raw.decode("utf-8", errors="ignore"))
            except Exception:
                pass

    cap.close()

    sessions: list[EmailSession] = []
    for stream_id, entry in streams.items():
         
        server_port = entry["dst_port"] if entry["dst_port"] in PORT_MAP else entry["src_port"]
        port_guess, implicit_tls, variant, _ = _classify_by_port(server_port)
        protocol, method = _refine_by_banner(entry["payloads"], port_guess)

        if protocol == Protocol.UNKNOWN:
            continue  

        is_server_dst = entry["dst_port"] == server_port
        client_ip, client_port = (
            (entry["src_ip"], entry["src_port"])
            if is_server_dst
            else (entry["dst_ip"], entry["dst_port"])
        )
        server_ip = entry["dst_ip"] if is_server_dst else entry["src_ip"]

        session = EmailSession(
            session_id=f"sess_{uuid.uuid4().hex[:10]}",
            analysis_id=analysis_id,
            protocol=protocol,
            identification_method=method,
            application_variant=variant,
            client=NetworkEndpoint(ip=client_ip, port=client_port, role="client"),
            server=NetworkEndpoint(ip=server_ip, port=server_port, role="server"),
            start_time=datetime.fromtimestamp(entry["first_time"], tz=timezone.utc),
            end_time=datetime.fromtimestamp(entry["last_time"], tz=timezone.utc),
            encryption_state=(
                EncryptionState.TLS_WRAPPED if implicit_tls else EncryptionState.UNKNOWN
            ),
        )
        sessions.append(session)
        save_entity("email_session", session.session_id, analysis_id, session.model_dump())

    return sessions
