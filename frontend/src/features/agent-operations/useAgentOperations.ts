"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { agentOperationsApi } from "./api";
import type {
  AgentRun,
  Incident,
  OperationsAnalytics,
  OperationsFilters,
  OperationsStats,
  QueueItem,
  RunDetailResponse,
  RunEvent,
} from "./types";

const DEFAULT_FILTERS: OperationsFilters = {
  status: "",
  severity: "",
  environment: "",
  search: "",
};

export function useAgentOperations() {
  const [filters, setFilters] = useState<OperationsFilters>(DEFAULT_FILTERS);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analytics, setAnalytics] = useState<OperationsAnalytics | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<RunDetailResponse | null>(null);
  const [timeline, setTimeline] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [degradedRealtime, setDegradedRealtime] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const mounted = useRef(true);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsResult, runsResult, queuesResult, incidentsResult, analyticsResult] = await Promise.all([
        agentOperationsApi.getStats(),
        agentOperationsApi.listRuns({ ...filters, limit: 100, offset: 0 }),
        agentOperationsApi.listQueues(),
        agentOperationsApi.listIncidents(),
        agentOperationsApi.getAnalytics(),
      ]);
      if (!mounted.current) return;
      setStats(statsResult);
      setRuns(runsResult.runs);
      setTotalRuns(runsResult.total);
      setQueues(queuesResult.items);
      setIncidents(incidentsResult.incidents);
      setAnalytics(analyticsResult);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : "Agent Operations could not be loaded.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [filters]);

  const openRun = useCallback(async (runId: string) => {
    setSelectedRunId(runId);
    setDetailLoading(true);
    try {
      const [detail, events] = await Promise.all([
        agentOperationsApi.getRun(runId),
        agentOperationsApi.getTimeline(runId),
      ]);
      if (!mounted.current) return;
      setSelectedDetail(detail);
      setTimeline(events.events);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : "Run detail could not be loaded.");
    } finally {
      if (mounted.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    load();
    return () => {
      mounted.current = false;
    };
  }, [load, refreshToken]);

  useEffect(() => {
    if (!selectedRunId) return;
    openRun(selectedRunId);
  }, [selectedRunId, refreshToken, openRun]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDegradedRealtime(true);
      refresh();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const controller = new AbortController();

    async function connect() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setDegradedRealtime(true);
          return;
        }
        const response = await fetch(`${baseUrl}/api/v1/operations/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          setDegradedRealtime(true);
          return;
        }
        setDegradedRealtime(false);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.includes("event: operations")) refresh();
        }
      } catch {
        if (!controller.signal.aborted) {
          setDegradedRealtime(true);
        }
      }
    }

    connect();
    return () => {
      controller.abort();
    };
  }, [refresh]);

  return {
    filters,
    setFilters,
    runs,
    totalRuns,
    stats,
    queues,
    incidents,
    analytics,
    selectedRunId,
    selectedDetail,
    timeline,
    loading,
    detailLoading,
    error,
    degradedRealtime,
    lastUpdated,
    refresh,
    openRun,
    closeRun: () => {
      setSelectedRunId(null);
      setSelectedDetail(null);
      setTimeline([]);
    },
  };
}
