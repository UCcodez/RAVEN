"""
Storage layer.

"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "securemailscope.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS entities (
            kind TEXT NOT NULL,
            id TEXT NOT NULL,
            analysis_id TEXT,
            data TEXT NOT NULL,
            PRIMARY KEY (kind, id)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_analysis ON entities(analysis_id)")
    return conn


def save_entity(kind: str, entity_id: str, analysis_id: str | None, data: dict[str, Any]) -> None:
    conn = _connect()
    with conn:
        conn.execute(
            "INSERT OR REPLACE INTO entities (kind, id, analysis_id, data) VALUES (?, ?, ?, ?)",
            (kind, entity_id, analysis_id, json.dumps(data, default=str)),
        )
    conn.close()


def get_entity(kind: str, entity_id: str) -> dict[str, Any] | None:
    conn = _connect()
    row = conn.execute(
        "SELECT data FROM entities WHERE kind = ? AND id = ?", (kind, entity_id)
    ).fetchone()
    conn.close()
    return json.loads(row[0]) if row else None


def list_entities(kind: str, analysis_id: str | None = None) -> list[dict[str, Any]]:
    conn = _connect()
    if analysis_id is not None:
        rows = conn.execute(
            "SELECT data FROM entities WHERE kind = ? AND analysis_id = ?", (kind, analysis_id)
        ).fetchall()
    else:
        rows = conn.execute("SELECT data FROM entities WHERE kind = ?", (kind,)).fetchall()
    conn.close()
    return [json.loads(r[0]) for r in rows]


def get_conn() -> sqlite3.Connection:
    return _connect()


def load_analysis(analysis_id: str) -> dict[str, Any]:
    a = get_entity("analysis", analysis_id)
    if a is None:
        raise KeyError(analysis_id)
    return {
        **a,
        "file_sha256": a.get("file_sha256"),
        "findings": list_entities("finding", analysis_id),
        "sessions": list_entities("email_session", analysis_id),
    }


def load_finding(finding_id: str) -> dict[str, Any]:
    for f in list_entities("finding"):
        if f.get("finding_id") == finding_id:
            return f
    raise KeyError(finding_id)


def load_hellos(server: str) -> list[dict[str, Any]]:
    return [t for t in list_entities("tls_session") if t.get("server") == server]