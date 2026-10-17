import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export function useApiData<T>(path: string, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError("");
    try { setData(await api<T>(path)); } catch (e) { setError(e instanceof Error ? e.message : "Could not load data"); }
    finally { setLoading(false); }
  }, [path, enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}
