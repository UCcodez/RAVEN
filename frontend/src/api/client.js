 
import * as mock from "../mocks/mockApi";

import { mockStatus } from "../mocks/mockStatus";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api`;

export async function api(path, options = {}) {
  if (USE_MOCKS) return mock.mockRequest(path, options);
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function handle(res) {
  if (!res.ok) {
     
    if (res.status === 501) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body.detail || "Not implemented yet");
      err.notImplemented = true;
      throw err;
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

 
export async function createAnalysis(file) {
  if (USE_MOCKS) return mock.createAnalysis(file);
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/analyses`, { method: "POST", body: formData });
  return handle(res);
}

 
export async function listAnalyses() {
  if (USE_MOCKS) return mock.listAnalyses();
  const res = await fetch(`${API_BASE}/analyses`);
  return handle(res);
}

 
export async function getAnalysis(analysisId) {
  if (USE_MOCKS) return mock.getAnalysis(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}`);
  return handle(res);
}

 
export async function runAnalysis(analysisId) {
  if (USE_MOCKS) return mock.runAnalysis(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/run`, { method: "POST" });
  return handle(res);
}

 
export async function getStatus(analysisId) {
  if (USE_MOCKS) return mock.getStatus(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/status`);
  return handle(res);
}

 
export async function getSessions(analysisId) {
  if (USE_MOCKS) return mock.getSessions(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/sessions`);
  return handle(res);
}

 
export async function getFindings(analysisId) {
  if (USE_MOCKS) return mock.getFindings(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/findings`);
  return handle(res);
}

 
export async function getPosture(analysisId) {
  if (USE_MOCKS) return mock.getPosture(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/posture`);
  return handle(res);
}

 
export async function getRecommendations(analysisId) {
  if (USE_MOCKS) return mock.getRecommendations(analysisId);
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/recommendations`);
  return handle(res);
}

 
export async function getComparison(beforeId, afterId) {
  if (USE_MOCKS) return mock.getComparison(beforeId, afterId);
  const err = new Error("Comparison isn't available on the backend yet");
  err.notImplemented = true;
  throw err;
}

export async function getAnalysisStatus(id) {
  if (import.meta.env.VITE_USE_MOCKS === "true") return mockStatus(id);
  const res = await fetch(`${API_BASE}/analyses/${id}/status`);
  if (!res.ok) throw new Error(`Status request failed (${res.status})`);
  return res.json();
}