import { api } from "@/lib/api";
import type {
  AgentRun,
  EvidenceBundle,
  Incident,
  OperationsAnalytics,
  OperationsFilters,
  OperationsStats,
  QueueItem,
  RunDetailResponse,
  RunEvent,
  RuntimeAction,
} from "./types";

function assertOk<T>(response: any, fallback: string): T {
  if (response?.success === false) {
    throw new Error(response.error || response.data?.error?.message || fallback);
  }
  return response as T;
}

function queryFrom(filters: Partial<OperationsFilters> & { limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.severity) query.set("severity", filters.severity);
  if (filters.environment) query.set("environment", filters.environment);
  if (filters.policy_result) query.set("policy_result", filters.policy_result);
  if (filters.search) query.set("search", filters.search);
  if (filters.brand_id) query.set("brand_id", filters.brand_id);
  if (filters.brand_name) query.set("brand_name", filters.brand_name);
  query.set("limit", String(filters.limit ?? 75));
  query.set("offset", String(filters.offset ?? 0));
  return query.toString();
}

export const agentOperationsApi = {
  async getStats(filters?: Partial<OperationsFilters>) {
    const params = new URLSearchParams();
    if (filters?.brand_id) params.set("brand_id", filters.brand_id);
    if (filters?.brand_name) params.set("brand_name", filters.brand_name);
    const qs = params.toString();
    return assertOk<OperationsStats>(await api.get(`/api/v1/operations/stats${qs ? `?${qs}` : ''}`), "Unable to load operations stats");
  },

  async listRuns(filters: Partial<OperationsFilters> & { limit?: number; offset?: number }) {
    return assertOk<{ runs: AgentRun[]; total: number; limit: number; offset: number }>(
      await api.get(`/api/v1/operations/runs?${queryFrom(filters)}`),
      "Unable to load agent runs",
    );
  },

  async getRun(id: string) {
    return assertOk<RunDetailResponse>(await api.get(`/api/v1/operations/runs/${id}`), "Unable to load run detail");
  },

  async getTimeline(id: string) {
    return assertOk<{ events: RunEvent[] }>(await api.get(`/api/v1/operations/runs/${id}/timeline`), "Unable to load run timeline");
  },

  async listQueues(queueType?: string, filters?: Partial<OperationsFilters>) {
    const query = new URLSearchParams();
    if (queueType && queueType !== "all") query.set("queue_type", queueType);
    if (filters?.brand_id) query.set("brand_id", filters.brand_id);
    if (filters?.brand_name) query.set("brand_name", filters.brand_name);
    if (filters?.environment) query.set("environment", filters.environment);
    return assertOk<{ items: QueueItem[]; total: number }>(await api.get(`/api/v1/operations/queues?${query.toString()}`), "Unable to load queues");
  },

  async listIncidents(filters?: Partial<OperationsFilters>) {
    const params = new URLSearchParams();
    if (filters?.brand_id) params.set("brand_id", filters.brand_id);
    if (filters?.brand_name) params.set("brand_name", filters.brand_name);
    const qs = params.toString();
    return assertOk<{ incidents: Incident[]; total: number }>(await api.get(`/api/v1/operations/incidents${qs ? `?${qs}` : ''}`), "Unable to load incidents");
  },

  async getAnalytics(filters?: Partial<OperationsFilters>) {
    const params = new URLSearchParams();
    if (filters?.brand_id) params.set("brand_id", filters.brand_id);
    if (filters?.brand_name) params.set("brand_name", filters.brand_name);
    const qs = params.toString();
    return assertOk<OperationsAnalytics>(await api.get(`/api/v1/operations/analytics${qs ? `?${qs}` : ''}`), "Unable to load analytics");
  },

  async performRunAction(runId: string, action: RuntimeAction, reason: string, impactScope = "selected_run") {
    const endpointByAction: Record<RuntimeAction, string> = {
      pause: "pause",
      resume: "resume",
      stop: "stop",
      retry: "retry",
      quarantine: "quarantine",
      escalate: "escalate",
      emergency_pause: "emergency-pause",
      restricted_mode: "restricted-mode",
      hold: "hold",
      release_hold: "release-hold",
      export_evidence: "",
    };
    if (action === "export_evidence") {
      throw new Error("Evidence exports require an evidence bundle id");
    }
    return assertOk<{ success: boolean; message?: string; new_run_id?: string }>(
      await api.post(`/api/v1/operations/runs/${runId}/${endpointByAction[action]}`, {
        reason,
        impact_scope: impactScope,
      }),
      `Unable to ${action.replace(/_/g, " ")} run`,
    );
  },

  async createIncident(input: {
    run_id?: string;
    severity: string;
    category: string;
    root_cause?: string;
    remediation?: string;
    due_at?: string;
  }) {
    return assertOk<{ success: boolean; incident: Incident }>(
      await api.post("/api/v1/operations/incidents", input),
      "Unable to create incident",
    );
  },

  async assignQueueItem(id: string, assigneeId?: string, assigneeName?: string) {
    return assertOk<{ success: boolean }>(
      await api.post(`/api/v1/operations/queues/${id}/assign`, {
        assignee_id: assigneeId,
        assignee_name: assigneeName,
      }),
      "Unable to assign queue item",
    );
  },

  async resolveQueueItem(id: string) {
    return assertOk<{ success: boolean }>(await api.post(`/api/v1/operations/queues/${id}/resolve`, {}), "Unable to resolve queue item");
  },

  async exportEvidence(bundle: EvidenceBundle, reason: string) {
    return assertOk<{ success: boolean; id: string; exported_at: string }>(
      await api.post(`/api/v1/operations/evidence/${bundle.id}/export`, { reason }),
      "Unable to export evidence",
    );
  },

  async exportAnalyticsCSV(reason: string) {
    const blob = await api.postBlob("/api/v1/operations/analytics/export", { reason });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `operations-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  async exportOutputSnapshot(runId: string, reason: string) {
    return assertOk<{ success: boolean; message?: string }>(
      await api.post(`/api/v1/operations/runs/${runId}/export-output`, { reason }),
      "Unable to export output snapshot",
    );
  },
};
