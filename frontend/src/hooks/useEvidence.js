import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export function useEvidence(id) {
  const [s, setS] = useState({ data: null, error: null, loading: true });
  const load = useCallback(
    () => api(`/analyses/${id}/evidence`)
      .then((data) => setS({ data, error: null, loading: false }))
      .catch((error) => setS({ data: null, error, loading: false })),
    [id],
  );
  useEffect(() => { load(); }, [load]);
  const verify = (t) =>
    api(`/analyses/${id}/evidence/verify${t != null ? `?simulate_tamper=${t}` : ""}`, { method: "POST" });
  const proof = (fid) => api(`/analyses/${id}/findings/${fid}/proof`);
  return { ...s, verify, proof };
}