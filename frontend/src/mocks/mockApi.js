// Mock API layer 

import before from "./fixtures/demo-before.json";
import after from "./fixtures/demo-after.json";
import compare from "./fixtures/compare.json";

const DATASETS = {
  [before.analysis.id]: before,
  [after.analysis.id]: after,
};

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function dataset(analysisId) {
  const d = DATASETS[analysisId];
  if (!d) throw new Error("Analysis not found");
  return d;
}

 
const BAND = {
  Strong: "STRONG",
  Good: "GOOD",
  Fair: "NEEDS_ATTENTION",
  Weak: "ELEVATED",
  Critical: "CRITICAL_EXPOSURE",
};

 
const CATEGORY = {
  "STARTTLS-STRIP-SIGNATURE": "STARTTLS",
  "STARTTLS-NOT-REQUIRED": "POLICY",
  "PFS-NOT-OBSERVED": "FORWARD_SECRECY",
};

function worstSeverity(d) {
  const totals = d.findings.totals;
  for (const level of ["critical", "high", "medium", "low"]) {
    if (totals[level] > 0) return level;
  }
  return null;
}

 
function toAnalysis(d) {
  const a = d.analysis;
  return {
    posture_score: a.posture_score,
    worst_severity: worstSeverity(d),
    analysis_id: a.id,
    file_name: a.filename,
    file_sha256: a.sha256,
    file_size_bytes: a.size_bytes,
    capture_format: "pcap",
    created_at: a.created_at,
    status: a.status,
    tool_version: "0.1.0",
    rule_set_version: "1.0.0",
    failure_reason: null,
  };
}

function toEncryptionState(s) {
  if (s.encryption === "implicit TLS") return "TLS_WRAPPED";
  if (s.encryption === "STARTTLS") return "STARTTLS_UPGRADED";
  return "TLS_FAILED";  
}

function toSession(s, index) {
  const start = new Date(s.started_at);
  return {
    session_id: s.session_id,
    analysis_id: s.analysis_id,
    protocol: s.protocol,
    identification_method: "port + banner (mock)",
    application_variant: s.server_software,
     
    client: { ip: s.client_ip, port: 49152 + index, transport: "TCP", role: "client", hostname: null },
    server: { ip: s.server_ip, port: s.port, transport: "TCP", role: "server", hostname: s.server },
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + s.duration_ms).toISOString(),
    encryption_state: toEncryptionState(s),
    tls_session_id: s.tls ? `tls-${s.session_id}` : null,
  };
}

 
function toFindings(d) {
  const out = [];
  for (const g of d.findings.groups) {
    const detail = d.finding_details[g.id];
    for (const sid of g.session_ids) {
      out.push({
        finding_id: `${g.id}-${sid}`,
        session_id: sid,
        category: CATEGORY[g.rule_id] ?? "OTHER",
        rule_id: g.rule_id,
        title: g.title,
        severity: g.severity.toUpperCase(),
        confidence: g.confidence,
        evidence_refs: [{ type: "session", id: sid }],
        standard_reference: null,
        recommendation: detail.recommendation,
        status: "OPEN",
        source: "Deterministic",
      });
    }
  }
  return out;
}

function toPosture(d) {
  const p = d.posture;
  const totals = d.findings.totals;
  const secure = d.sessions.filter((s) => s.risk === "clean" || s.risk === "low").length;
  return {
    overall_score: p.score,
    risk_band: BAND[p.band],
    sessions_analyzed: d.sessions.length,
    secure_sessions: secure,
    at_risk_sessions: d.sessions.length - secure,
    critical_findings: totals.critical,
    high_findings: totals.high,
    medium_findings: totals.medium,
    low_findings: totals.low,
  };
}

 
export async function createAnalysis(file) {
  await delay();
  const d = file?.name?.toLowerCase().includes("after") ? after : before;
  return toAnalysis(d);
}

export async function listAnalyses() {
  await delay();
  return [before, after].map((d) => toAnalysis(d));
}

export async function getAnalysis(analysisId) {
  await delay();
  return toAnalysis(dataset(analysisId));
}

export async function runAnalysis(analysisId) {
  await delay(600);
  const d = dataset(analysisId);
  return { analysis_id: analysisId, status: "completed", sessions_found: d.sessions.length };
}

export async function getStatus(analysisId) {
  await delay(100);
  dataset(analysisId);
  return { analysis_id: analysisId, status: "completed" };
}

export async function getSessions(analysisId) {
  await delay();
  return Object.values(dataset(analysisId).session_details).map(toSession);
}

export async function getFindings(analysisId) {
  await delay();
  return toFindings(dataset(analysisId));
}

export async function getPosture(analysisId) {
  await delay();
  return toPosture(dataset(analysisId));
}

 
export async function getRecommendations() {
  const err = new Error("Not implemented yet");
  err.notImplemented = true;
  throw err;
}

 
export async function getComparison() {
  await delay();
  return compare;
}

const sessionOf = (d, sid) =>
  Object.values(d.session_details).find((s) => s.session_id === sid) ?? {};

const keyOf = (d, g) => `${sessionOf(d, g.session_ids[0]).server}|${g.rule_id}`;

function groupedFindings(d) {
  return d.findings.groups.map((g) => {
    const s = sessionOf(d, g.session_ids[0]);
    return {
      id: g.id,
      rule_id: g.rule_id,
      title: g.title,
      severity: g.severity,
      server: s.server,
      server_software: s.server_software,
      affected_sessions: g.session_ids.length,
    };
  });
}

function remediationOf(id) {
  const hit = [before, after]
    .map((d) => ({ d, g: d.findings.groups.find((x) => x.id === id) }))
    .find((x) => x.g);
  if (!hit) throw new Error("Finding not found");
  const r = hit.d.remediations?.[id] ?? {};
  return {
    kind: r.kind,
    software: r.server_software,
    detected_from: r.detected_from,
    path: r.snippet?.path,
    snippet: r.snippet?.code ?? r.note ?? "",
    test_command: r.validation?.command ?? "",
    expected: r.validation?.expected ?? "",
    break_risk: r.break_risk?.clients ?? [],
    break_summary: r.break_risk?.summary,
    warning: r.warning,
  };
}
function compareOf(beforeId, afterId) {
  const b = dataset(beforeId);
  const a = dataset(afterId);
  const afterKeys = new Set(a.findings.groups.map((g) => keyOf(a, g)));
  const afterServers = new Set(Object.values(a.session_details).map((s) => s.server));
  const beforeKeys = new Set(b.findings.groups.map((g) => keyOf(b, g)));

  const resolved = b.findings.groups
    .filter((g) => !afterKeys.has(keyOf(b, g)))
    .map((g) => {
      const server = sessionOf(b, g.session_ids[0]).server;
      return {
        rule_id: g.rule_id,
        server,
        severity: g.severity.toUpperCase(),
        status: afterServers.has(server) ? "RESOLVED" : "UNKNOWN",
      };
    });

  const added = a.findings.groups
    .filter((g) => !beforeKeys.has(keyOf(a, g)))
    .map((g) => ({
      rule_id: g.rule_id,
      server: sessionOf(a, g.session_ids[0]).server,
      severity: g.severity.toUpperCase(),
    }));

  const t = (d) => d.findings.totals;
  const atRisk = (d) => d.sessions.filter((s) => s.risk !== "clean" && s.risk !== "low").length;

  return {
    before: { posture_score: b.analysis.posture_score },
    after: { posture_score: a.analysis.posture_score },
    metrics: [
      { label: "Critical findings", before: t(b).critical, after: t(a).critical },
      { label: "High findings", before: t(b).high, after: t(a).high },
      { label: "Medium findings", before: t(b).medium, after: t(a).medium },
      { label: "Sessions at risk", before: atRisk(b), after: atRisk(a) },
    ],
    resolved,
    new: added,
    verified: resolved.length > 0 && resolved.every((r) => r.status === "RESOLVED"),
  };
}

const enc = new TextEncoder();
const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const GENESIS = "0".repeat(64);
const entryHash = (prev, seq, event, ph, ts) => sha(`${prev}|${seq}|${event}|${ph}|${ts}`);

const ledgers = {};
async function ledgerOf(id) {
  if (ledgers[id]) return ledgers[id];
  const t0 = new Date(dataset(id).analysis.created_at).getTime();
  const rows = [];
  let prev = GENESIS;
  for (const [seq, event] of ["upload", "analysis", "report"].entries()) {
    const ph = await sha(`${id}:${event}`);
    const ts = new Date(t0 + seq * 4000).toISOString();
    const h = await entryHash(prev, seq, event, ph, ts);
    rows.push({ seq, event, payload_hash: ph, prev_hash: prev, entry_hash: h, ts });
    prev = h;
  }
  return (ledgers[id] = rows);
}

async function merkleTree(ids) {
  let level = await Promise.all(ids.map(sha));
  const tree = [level];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(await sha(level[i] + (level[i + 1] ?? level[i])));
    tree.push((level = next));
  }
  return tree;
}

const findingIds = (id) => dataset(id).findings.groups.map((g) => g.id);

async function evidenceOf(id) {
  const tree = await merkleTree(findingIds(id));
  return {
    pcap_sha256: dataset(id).analysis.sha256,
    merkle_root: tree.at(-1)[0],
    signature: { valid: true, public_key: await sha("raven-demo-key") },
    entries: await ledgerOf(id),
    finding_ids: findingIds(id),
  };
}

async function verifyOf(id, tamper) {
  let prev = GENESIS;
  const entries = [];
  for (const r of await ledgerOf(id)) {
    let ph = r.payload_hash;
    if (r.seq === tamper) ph = (ph[0] === "0" ? "1" : "0") + ph.slice(1);
    const calc = await entryHash(r.prev_hash, r.seq, r.event, ph, r.ts);
    const status = calc !== r.entry_hash ? "tampered" : r.prev_hash !== prev ? "broken_link" : "ok";
    entries.push({ ...r, status });
    prev = calc;
  }
  return { valid: entries.every((e) => e.status === "ok"), simulated: tamper != null, entries };
}

async function proofOf(id, fid) {
  const i0 = findingIds(id).indexOf(fid);
  if (i0 < 0) throw new Error("Finding not found");
  const tree = await merkleTree(findingIds(id));
  const path = [];
  let i = i0;
  for (const lvl of tree.slice(0, -1)) {
    path.push(lvl[i ^ 1] ?? lvl[i]);
    i >>= 1;
  }
  let h = tree[0][i0];
  i = i0;
  for (const s of path) {
    h = await sha(i & 1 ? s + h : h + s);
    i >>= 1;
  }
  return { leaf: tree[0][i0], root: tree.at(-1)[0], path, valid: h === tree.at(-1)[0] };
}

export async function mockRequest(path) {
  await delay();
  const [p, qs] = path.split("?");
  const q = new URLSearchParams(qs);
  let m;
  
  if ((m = p.match(/^\/analyses\/([^/]+)\/evidence\/verify$/))) {
    const t = q.get("simulate_tamper");
    return verifyOf(m[1], t == null ? null : Number(t));
  }
  if ((m = p.match(/^\/analyses\/([^/]+)\/evidence$/))) return evidenceOf(m[1]);
  if ((m = p.match(/^\/analyses\/([^/]+)\/findings\/([^/]+)\/proof$/))) return proofOf(m[1], m[2]);
  if (p === "/compare") return compareOf(q.get("before"), q.get("after"));
  if ((m = p.match(/^\/analyses\/([^/]+)\/findings$/))) return groupedFindings(dataset(m[1]));
  if ((m = p.match(/^\/findings\/([^/]+)\/remediation$/))) return remediationOf(m[1]);
  if ((m = p.match(/^\/analyses\/([^/]+)\/run$/))) return runAnalysis(m[1]);
  throw new Error(`No mock for ${p}`);
}