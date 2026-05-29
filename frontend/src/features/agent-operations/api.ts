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
  if (filters.search) query.set("search", filters.search);
  query.set("limit", String(filters.limit ?? 75));
  query.set("offset", String(filters.offset ?? 0));
  return query.toString();
}

export const agentOperationsApi = {
  async getStats() {
    return assertOk<OperationsStats>(await api.get("/api/v1/operations/stats"), "Unable to load operations stats");
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

  async listQueues(queueType?: string) {
    const query = new URLSearchParams();
    if (queueType && queueType !== "all") query.set("queue_type", queueType);
    return assertOk<{ items: QueueItem[]; total: number }>(await api.get(`/api/v1/operations/queues?${query.toString()}`), "Unable to load queues");
  },

  async listIncidents() {
    return assertOk<{ incidents: Incident[]; total: number }>(await api.get("/api/v1/operations/incidents"), "Unable to load incidents");
  },

  async getAnalytics() {
    return assertOk<OperationsAnalytics>(await api.get("/api/v1/operations/analytics"), "Unable to load analytics");
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
};
