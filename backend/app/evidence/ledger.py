import hashlib
import json
from datetime import datetime, timezone
from ..core.db import get_conn

GENESIS = "0" * 64

def sha(b):
    return hashlib.sha256(b).hexdigest()

def entry_hash(prev, seq, event, payload_hash, ts):
    return sha(f"{prev}|{seq}|{event}|{payload_hash}|{ts}".encode())

def init():
    with get_conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS evidence_ledger(
            analysis_id TEXT, seq INTEGER, event TEXT, payload_hash TEXT,
            prev_hash TEXT, entry_hash TEXT, ts TEXT, meta TEXT,
            PRIMARY KEY(analysis_id, seq))""")

def entries(aid):
    with get_conn() as c:
        cur = c.execute("SELECT * FROM evidence_ledger WHERE analysis_id=? ORDER BY seq", (aid,))
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]

def append(aid, event, payload, meta=None):
    with get_conn() as c:
        last = c.execute(
            "SELECT seq, entry_hash FROM evidence_ledger WHERE analysis_id=? ORDER BY seq DESC LIMIT 1",
            (aid,),
        ).fetchone()
        seq, prev = (last[0] + 1, last[1]) if last else (0, GENESIS)
        ph = sha(payload)
        ts = datetime.now(timezone.utc).isoformat()
        c.execute(
            "INSERT INTO evidence_ledger VALUES(?,?,?,?,?,?,?,?)",
            (aid, seq, event, ph, prev, entry_hash(prev, seq, event, ph, ts), ts,
             json.dumps(meta) if meta else None),
        )
    return ph

def verify(aid, tamper=None):
    out, prev = [], GENESIS
    for r in entries(aid):
        ph = r["payload_hash"]
        if r["seq"] == tamper:
            ph = ("0" if ph[0] != "0" else "1") + ph[1:]
        calc = entry_hash(r["prev_hash"], r["seq"], r["event"], ph, r["ts"])
        status = ("tampered" if calc != r["entry_hash"]
                  else "broken_link" if r["prev_hash"] != prev else "ok")
        out.append({**r, "status": status})
        prev = calc
    return out