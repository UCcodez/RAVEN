 
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import get_entity, list_entities, save_entity
from app.evidence import ledger
from app.models.schemas import Analysis, AnalysisStatus
from app.routers import compare, evidence, remediation
from app.services.ingestion import InvalidCaptureError, ingest_pcap, stored_pcap_path
from app.services.protocol_identification import identify_sessions

app = FastAPI(title="raven", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ledger.init()
app.include_router(compare.router)
app.include_router(remediation.router)
app.include_router(evidence.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/analyses", response_model=Analysis)
async def create_analysis(file: UploadFile = File(...)) -> Analysis:
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        analysis = ingest_pcap(tmp_path, file.filename)
        ledger.append(analysis.analysis_id, "upload", tmp_path.read_bytes())
    except InvalidCaptureError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    return analysis


@app.get("/api/analyses", response_model=list[Analysis])
def list_analyses() -> list[dict]:
    return list_entities("analysis")


@app.get("/api/analyses/{analysis_id}", response_model=Analysis)
def get_analysis(analysis_id: str) -> dict:
    analysis = get_entity("analysis", analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@app.post("/api/analyses/{analysis_id}/run")
def run_analysis(analysis_id: str) -> dict:
    raw = get_entity("analysis", analysis_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    analysis = Analysis(**raw)

    analysis.status = AnalysisStatus.PROCESSING
    save_entity("analysis", analysis_id, analysis_id, analysis.model_dump())

    try:
        sessions = identify_sessions(stored_pcap_path(analysis), analysis_id)
    except Exception as exc:  # noqa: BLE001
        analysis.status = AnalysisStatus.PARTIAL
        analysis.failure_reason = str(exc)
        save_entity("analysis", analysis_id, analysis_id, analysis.model_dump())
        raise HTTPException(status_code=500, detail=f"Protocol identification failed: {exc}") from exc

    analysis.status = AnalysisStatus.COMPLETED
    save_entity("analysis", analysis_id, analysis_id, analysis.model_dump())
    ledger.append(analysis_id, "analysis", analysis.model_dump_json().encode())

    return {
        "analysis_id": analysis_id,
        "status": analysis.status,
        "sessions_found": len(sessions),
    }


@app.get("/api/analyses/{analysis_id}/sessions")
def get_sessions(analysis_id: str) -> list[dict]:
    return list_entities("email_session", analysis_id)


@app.get("/api/analyses/{analysis_id}/status")
def get_status(analysis_id: str) -> dict:
    analysis = get_entity("analysis", analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"analysis_id": analysis_id, "status": analysis["status"]}


@app.get("/api/analyses/{analysis_id}/findings")
def get_findings(analysis_id: str) -> list[dict]:
    return list_entities("finding", analysis_id)


@app.get("/api/analyses/{analysis_id}/posture")
def get_posture(analysis_id: str) -> dict:
    raise HTTPException(status_code=501, detail="Posture engine not yet implemented (Tier 2, F9)")


@app.get("/api/analyses/{analysis_id}/recommendations")
def get_recommendations(analysis_id: str) -> dict:
    raise HTTPException(status_code=501, detail="Recommendation engine not yet implemented (F14)")