import json
from fastapi import APIRouter, HTTPException
from ..core.db import load_analysis
from ..evidence import ledger, merkle, signing

router = APIRouter(prefix="/api")

def leaves(a):
    fs = sorted(a["findings"], key=lambda f: f["finding_id"])
    keys = ("finding_id", "rule_id", "session_id", "evidence_refs")
    return fs, [merkle.leaf({k: f[k] for k in keys}) for f in fs]

@router.get("/analyses/{aid}/evidence")
def evidence(aid: str):
    a = load_analysis(aid)
    fs, lv = leaves(a)
    rows = ledger.entries(aid)
    signed = next((r for r in reversed(rows) if r["event"] == "report_signed"), None)
    signature = None
    if signed:
        sig = json.loads(signed["meta"])["signature"]
        signature = {
            "valid": signing.verify(bytes.fromhex(signed["payload_hash"]), sig),
            "public_key": signing.public_hex(),
            "report_hash": signed["payload_hash"],
        }
    return {
        "pcap_sha256": a["file_sha256"],
        "merkle_root": merkle.root(merkle.build(lv)),
        "finding_ids": [f["finding_id"] for f in fs],
        "entries": rows,
        "signature": signature,
    }

@router.post("/analyses/{aid}/evidence/verify")
def verify(aid: str, simulate_tamper: int | None = None):
    rows = ledger.verify(aid, simulate_tamper)
    return {
        "valid": all(r["status"] == "ok" for r in rows),
        "simulated": simulate_tamper is not None,
        "entries": rows,
    }

@router.get("/analyses/{aid}/findings/{fid}/proof")
def proof(aid: str, fid: str):
    fs, lv = leaves(load_analysis(aid))
    ids = [f["finding_id"] for f in fs]
    if fid not in ids:
        raise HTTPException(404, "finding not found")
    levels, i = merkle.build(lv), ids.index(fid)
    path, root = merkle.proof(levels, i), merkle.root(levels)
    return {"leaf": lv[i].hex(), "path": path, "root": root,
            "valid": merkle.verify(lv[i].hex(), path, root)}