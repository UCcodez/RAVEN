import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export default function useApiData(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });

  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }));
  }, [path]);

  useEffect(load, [load]);
  return { ...state, reload: load };
}