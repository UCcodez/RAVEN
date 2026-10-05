import { useEffect, useState } from "react";
import { getAnalysisStatus } from "../api/client";

const TERMINAL = new Set(["completed", "partial", "failed"]);

export default function useAnalysisStatus(analysisId, intervalMs = 800) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    async function tick() {
      try {
        const s = await getAnalysisStatus(analysisId);
        if (cancelled) return;
        setStatus(s);
        setError(null);
        if (!TERMINAL.has(s.state)) timer = setTimeout(tick, intervalMs);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || "Could not read analysis status.");
        timer = setTimeout(tick, intervalMs * 3);  // keep trying, slower
      }
    }
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [analysisId, intervalMs]);

  return { status, error };
}