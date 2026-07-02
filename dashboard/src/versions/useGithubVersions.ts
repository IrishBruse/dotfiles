import { useCallback, useEffect, useState } from "react";

import type { VersionsData } from "./types.ts";

type VersionsResponse = {
  ok: boolean;
  error?: string;
  groups?: VersionsData["groups"];
  fetchedAt?: string;
};

let clientInFlight: Promise<VersionsData> | null = null;

async function requestVersions(force = false): Promise<VersionsData> {
  if (clientInFlight) {
    return clientInFlight;
  }

  clientInFlight = (async () => {
    const res = await fetch("/api/github-versions", {
      method: force ? "POST" : "GET"
    });
    const body = (await res.json()) as VersionsResponse;
    if (!res.ok || !body.ok || !body.groups || !body.fetchedAt) {
      throw new Error(body.error ?? "Fetch failed");
    }
    return {
      groups: body.groups,
      fetchedAt: body.fetchedAt
    };
  })().finally(() => {
    clientInFlight = null;
  });

  return clientInFlight;
}

export function useGithubVersions(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<VersionsData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setFetching(true);
    setError(null);
    try {
      setData(await requestVersions(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [enabled]);

  const loadCached = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setData(await requestVersions(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void loadCached();
  }, [enabled, loadCached]);

  return { data, loading, fetching, error, refresh };
}
