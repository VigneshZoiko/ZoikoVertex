import { supabase } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
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
    : (errorData.error || response.statusText || `${method} ${endpoint} failed`);
  return { success: false, error: errorMessage };
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
};
