import { supabase } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  } catch (err) {
    console.warn('[API Auth] Unable to read Supabase session. Clearing stale local auth state.', err);
    if (typeof document !== 'undefined') {
      document.cookie = 'zv_auth=; path=/; SameSite=Strict; max-age=0';
    }
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('zv_role_cache'); } catch {}
    }
    return {};
  }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    console.error(`[API Network Error] Failed to connect to backend at ${url}. Ensure the server is running.`, err);
    throw new Error('Connection to backend failed. Please ensure the backend server is running and accessible.');
  }
}

async function apiError(response: Response, endpoint: string, method: string) {
  const errorData = await response.json().catch(() => ({}));
  const errorMessage = typeof errorData.error === 'object'
    ? errorData.error.message
    : (
        errorData.error ||
        errorData.message ||
        errorData.detail ||
        response.statusText ||
        `${method} ${endpoint} failed`
      );
  return { success: false, error: errorMessage, status: response.status, data: errorData };
}

export const api = {
  async get(endpoint: string) {
    const authHeader = await getAuthHeader();
    const response = await safeFetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        ...authHeader,
      },
    });
    if (!response.ok) {
      return apiError(response, endpoint, 'GET');
    }
    return response.json();
  },

  async post(endpoint: string, body: any) {
    const authHeader = await getAuthHeader();
    const response = await safeFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return apiError(response, endpoint, 'POST');
    }
    return response.json();
  },

  async postMultipart(endpoint: string, formData: FormData) {
    const authHeader = await getAuthHeader();
    const response = await safeFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...authHeader,
      },
      body: formData,
    });
    if (!response.ok) {
      return apiError(response, endpoint, 'POST (Multipart)');
    }
    return response.json();
  },

  async put(endpoint: string, body: any) {
    const authHeader = await getAuthHeader();
    const response = await safeFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return apiError(response, endpoint, 'PUT');
    }
    return response.json();
  },

  async delete(endpoint: string) {
    const authHeader = await getAuthHeader();
    const response = await safeFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...authHeader,
      },
    });
    if (!response.ok) {
      return apiError(response, endpoint, 'DELETE');
    }
    return response.json();
  },

  async patch(endpoint: string, body: any) {
    const authHeader = await getAuthHeader();
    const response = await safeFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return apiError(response, endpoint, 'PATCH');
    }
    return response.json();
  },

  // Operations API
  async getOperationsStats() {
    return this.get('/api/v1/operations/stats');
  },

  async listAgentRuns(params?: { status?: string; severity?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return this.get(`/api/v1/operations/runs?${query.toString()}`);
  },

  async getAgentRun(id: string) {
    return this.get(`/api/v1/operations/runs/${id}`);
  },

  async getRunTimeline(id: string) {
    return this.get(`/api/v1/operations/runs/${id}/timeline`);
  },

  async pauseRun(id: string, reason?: string) {
    return this.post(`/api/v1/operations/runs/${id}/pause`, { reason });
  },

  async resumeRun(id: string, reason?: string) {
    return this.post(`/api/v1/operations/runs/${id}/resume`, { reason });
  },

  async stopRun(id: string, reason?: string) {
    return this.post(`/api/v1/operations/runs/${id}/stop`, { reason });
  },

  async retryRun(id: string, scope?: string) {
    return this.post(`/api/v1/operations/runs/${id}/retry`, { scope });
  },

  async quarantineRun(id: string, reason?: string) {
    return this.post(`/api/v1/operations/runs/${id}/quarantine`, { reason });
  },

  async listQueues(params?: { queue_type?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.queue_type) query.set('queue_type', params.queue_type);
    if (params?.status) query.set('status', params.status);
    return this.get(`/api/v1/operations/queues?${query.toString()}`);
  },

  async assignQueueItem(id: string, assignee_id: string) {
    return this.post(`/api/v1/operations/queues/${id}/assign`, { assignee_id });
  },

  async createIncident(data: { run_id?: string; severity: string; category: string; root_cause?: string; due_at?: string; remediation?: string }) {
    return this.post('/api/v1/operations/incidents', data);
  },

  async listIncidents(params?: { severity?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.severity) query.set('severity', params.severity);
    if (params?.status) query.set('status', params.status);
    return this.get(`/api/v1/operations/incidents?${query.toString()}`);
  },

  async resolveIncident(id: string, resolution?: string, remediation?: string) {
    return this.patch(`/api/v1/operations/incidents/${id}/resolve`, { resolution, remediation });
  },


  async getRunEvidence(bundleId: string) {
    return this.get(`/api/v1/operations/evidence/${bundleId}`);
  },

  async exportEvidence(bundleId: string, reason?: string) {
    return this.post(`/api/v1/operations/evidence/${bundleId}/export`, { reason });
  },

  async getRunDetail(id: string) {
    return this.get(`/api/v1/operations/runs/${id}`);
  },

  async getOperationsAnalytics(params?: { time_range?: string; metric?: string }) {
    const query = new URLSearchParams();
    if (params?.time_range) query.set('time_range', params.time_range);
    if (params?.metric) query.set('metric', params.metric);
    return this.get(`/api/v1/operations/analytics?${query.toString()}`);
  },

  async emergencyPause(id: string, reason?: string) {
    return this.post(`/api/v1/operations/runs/${id}/emergency-pause`, { reason });
  },

  async escalateRun(id: string, reason?: string) {
    return this.post(`/api/v1/operations/runs/${id}/escalate`, { reason });
  },

  // ─── AGENTS API CLIENT ───
  async listAgents(params?: { workspaceId?: string; status?: string; risk?: string }) {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set('workspaceId', params.workspaceId);
    if (params?.status) query.set('status', params.status);
    if (params?.risk) query.set('risk', params.risk);
    return this.get(`/api/v1/agents?${query.toString()}`);
  },

  async getAgent(id: string) {
    return this.get(`/api/v1/agents/${id}`);
  },

  async registerAgent(data: any) {
    return this.post('/api/v1/agents', data);
  },

  async certifyAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/certify`, {});
  },

  async updateAgentAutonomy(id: string, level: string, reason?: string) {
    return this.patch(`/api/v1/agents/${id}/autonomy`, { level, reason });
  },

  async deployAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/deploy`, {});
  },

  async pauseAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/pause`, {});
  },

  async resumeAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/resume`, {});
  },

  async retireAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/retire`, {});
  },

  async cloneAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/clone`, {});
  },

  async requestAgentApproval(id: string) {
    return this.post(`/api/v1/agents/${id}/approval/request`, {});
  },

  async approveAgent(id: string) {
    return this.post(`/api/v1/agents/${id}/approval/approve`, {});
  },

  async rejectAgentApproval(id: string) {
    return this.post(`/api/v1/agents/${id}/approval/reject`, {});
  },

  async updateAgentRuntime(id: string, data: any) {
    return this.patch(`/api/v1/agents/${id}/runtime`, data);
  },

  // ─── WORKFLOWS API CLIENT ───
  async listWorkflows() {
    return this.get('/api/v1/agents/workflows');
  },

  async getWorkflowStats() {
    return this.get('/api/v1/agents/workflows/stats');
  },

  async getWorkflowControlStrip() {
    return this.get('/api/v1/agents/workflows/control-strip');
  },

  async getWorkflowAnalytics() {
    return this.get('/api/v1/agents/workflows/analytics');
  },

  async getActiveOrchestrations() {
    return this.get('/api/v1/agents/workflows/active');
  },

  async getWorkflowGraphGeneral() {
    return this.get('/api/v1/agents/workflows/graph');
  },

  async getEscalationPaths() {
    return this.get('/api/v1/agents/workflows/escalations');
  },

  async getWorkflowApprovals() {
    return this.get('/api/v1/agents/workflows/approvals');
  },

  async getWorkflowApprovalStats() {
    return this.get('/api/v1/agents/workflows/approvals/stats');
  },

  async createWorkflow(data: any) {
    return this.post('/api/v1/agents/workflows', data);
  },

  async getWorkflow(id: string) {
    return this.get(`/api/v1/agents/workflows/${id}`);
  },

  async updateWorkflow(id: string, data: any) {
    return this.patch(`/api/v1/agents/workflows/${id}`, data);
  },

  async deleteWorkflow(id: string) {
    return this.delete(`/api/v1/agents/workflows/${id}`);
  },

  async duplicateWorkflow(id: string) {
    return this.post(`/api/v1/agents/workflows/${id}/duplicate`, {});
  },

  async listWorkflowVersions(id: string) {
    return this.get(`/api/v1/agents/workflows/${id}/versions`);
  },

  async createWorkflowDraftVersion(id: string, data: any) {
    return this.post(`/api/v1/agents/workflows/${id}/versions`, data);
  },

  async submitWorkflowForApproval(versionId: string) {
    return this.get(`/api/v1/agents/workflows/versions/${versionId}/submit`);
  },

  async approveWorkflowVersion(versionId: string) {
    return this.post(`/api/v1/agents/workflows/versions/${versionId}/approve`, {});
  },

  async rejectWorkflowVersion(versionId: string) {
    return this.post(`/api/v1/agents/workflows/versions/${versionId}/reject`, {});
  },

  async activateWorkflowVersion(versionId: string) {
    return this.post(`/api/v1/agents/workflows/versions/${versionId}/activate`, {});
  },

  async pauseWorkflow(versionId: string) {
    return this.post(`/api/v1/agents/workflows/versions/${versionId}/pause`, {});
  },

  async retireWorkflow(versionId: string) {
    return this.post(`/api/v1/agents/workflows/versions/${versionId}/retire`, {});
  },

  async startWorkflowInstance(data: any) {
    return this.post('/api/v1/agents/workflows/instances', data);
  },

  async listWorkflowInstances() {
    return this.get('/api/v1/agents/workflows/instances');
  },

  async getWorkflowInstance(instanceId: string) {
    return this.get(`/api/v1/agents/workflows/instances/${instanceId}`);
  },

  async transitionWorkflowInstance(instanceId: string, data: any) {
    return this.patch(`/api/v1/agents/workflows/instances/${instanceId}/transition`, data);
  },

  // ─── PROMPTS API CLIENT ───
  async getPromptStats() {
    return this.get('/api/v1/prompts/stats');
  },

  async getPromptApprovalStats() {
    return this.get('/api/v1/prompts/approvals/stats');
  },

  async approvePromptVersion(versionId: string) {
    return this.post(`/api/v1/prompts/versions/${versionId}/approve`, {});
  },

  async rejectPromptVersion(versionId: string) {
    return this.post(`/api/v1/prompts/versions/${versionId}/reject`, {});
  },

  async deployPromptVersion(versionId: string) {
    return this.post(`/api/v1/prompts/versions/${versionId}/deploy`, {});
  },

  async listPromptTestRuns(versionId: string) {
    return this.get(`/api/v1/prompts/versions/${versionId}/tests/runs`);
  },

  async runPromptTests(versionId: string) {
    return this.post(`/api/v1/prompts/versions/${versionId}/tests/run`, {});
  },

  async listPrompts() {
    return this.get('/api/v1/prompts');
  },

  async createPrompt(data: any) {
    return this.post('/api/v1/prompts', data);
  },

  async getPrompt(id: string) {
    return this.get(`/api/v1/prompts/${id}`);
  },

  async updatePrompt(id: string, data: any) {
    return this.patch(`/api/v1/prompts/${id}`, data);
  },

  async clonePrompt(id: string) {
    return this.post(`/api/v1/prompts/${id}/clone`, {});
  },

  async pausePrompt(id: string) {
    return this.post(`/api/v1/prompts/${id}/pause`, {});
  },

  async resumePrompt(id: string) {
    return this.post(`/api/v1/prompts/${id}/resume`, {});
  },

  async archivePrompt(id: string) {
    return this.post(`/api/v1/prompts/${id}/archive`, {});
  },

  async retirePrompt(id: string) {
    return this.post(`/api/v1/prompts/${id}/retire`, {});
  },

  async submitPromptForReview(id: string) {
    return this.post(`/api/v1/prompts/${id}/submit-review`, {});
  },

  async rollbackPrompt(id: string) {
    return this.post(`/api/v1/prompts/${id}/rollback`, {});
  },

  async listPromptVersions(id: string) {
    return this.get(`/api/v1/prompts/${id}/versions`);
  },

  async createPromptVersion(id: string, data: any) {
    return this.post(`/api/v1/prompts/${id}/versions`, data);
  },

  // ─── KNOWLEDGE BASE API CLIENT ───
  async listKnowledgeBases() {
    return this.get('/api/v1/knowledge/bases');
  },

  async createKnowledgeBase(data: any) {
    return this.post('/api/v1/knowledge/bases', data);
  },

  async deleteKnowledgeBase(baseId: string) {
    return this.delete(`/api/v1/knowledge/bases/${baseId}`);
  },

  async listKnowledgeCollections() {
    return this.get('/api/v1/knowledge/collections');
  },

  async getKnowledgeCollection(id: string) {
    return this.get(`/api/v1/knowledge/collections/${id}`);
  },

  async createKnowledgeCollection(data: any) {
    return this.post('/api/v1/knowledge/collections', data);
  },

  async updateKnowledgeCollection(id: string, data: any) {
    return this.patch(`/api/v1/knowledge/collections/${id}`, data);
  },

  async deleteKnowledgeCollection(id: string) {
    return this.delete(`/api/v1/knowledge/collections/${id}`);
  },

  async listKnowledgeSources() {
    return this.get('/api/v1/knowledge/sources');
  },

  async createKnowledgeSource(collectionId: string, formData: FormData) {
    return this.postMultipart(`/api/v1/knowledge/collections/${collectionId}/sources`, formData);
  },

  async approveKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/approve`, {});
  },

  async rejectKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/reject`, {});
  },

  async retireKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/retire`, {});
  },

  async activateKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/activate`, {});
  },

  async publishKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/publish`, {});
  },

  async restrictKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/restrict`, {});
  },

  async quarantineKnowledgeSource(id: string) {
    return this.post(`/api/v1/knowledge/sources/${id}/quarantine`, {});
  },

  async getKnowledgeStats() {
    return this.get('/api/v1/knowledge/stats');
  },

  async listKnowledgeConflicts() {
    return this.get('/api/v1/knowledge/conflicts');
  },

  async listKnowledgeRetrievalLogs() {
    return this.get('/api/v1/knowledge/retrieval-logs');
  },
};
