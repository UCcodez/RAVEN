import { useCallback, useEffect, useState } from "react";
import { getOverview } from "../api/client";

 
export default function useOverview(analysisId) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    getOverview(analysisId)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: error.notImplemented ? "unavailable" : "error",
          data: null,
          error,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}