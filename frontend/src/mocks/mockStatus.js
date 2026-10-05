const KEYS = ["validated", "protocols", "streams", "tls", "certs", "risk", "report"];
const STEP_MS = 700;
const started = new Map();

export function mockStatus(id) {
  if (!started.has(id)) started.set(id, Date.now());
  const elapsed = Date.now() - started.get(id);
  const params = new URLSearchParams(window.location.search);
  const failAt = params.get("fail");
  const partial = params.get("partial") === "1";
  const current = Math.min(Math.floor(elapsed / STEP_MS), KEYS.length);

  let state = current >= KEYS.length ? (partial ? "partial" : "completed") : "running";
  const stages = KEYS.map((key, i) => {
    let s = i < current ? "done" : i === current ? "running" : "pending";
    if (failAt === key && i <= current) { s = "failed"; state = "failed"; }
    else if (failAt && KEYS.indexOf(failAt) < i) s = "pending";
    return { key, state: s };
  });
  const p = Math.min(current, KEYS.length) / KEYS.length;
  return {
    state,
    stages,
    counts: {
      packets: Math.round(4210 * p), streams: Math.round(38 * p),
      sessions: Math.round(31 * p), findings: Math.round(9 * p),
      streams_unreconstructed: partial && current >= 3 ? 3 : 0,
    },
    elapsed_seconds: elapsed / 1000,
    error: state === "failed" ? "Mock failure for testing." : null,
  };
}