import { supabase } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    // AuthApiError with "Refresh Token Not Found" means the stored session is stale.
    // Sign out silently so the middleware can redirect to /login on the next request.
    if (error) {
      console.warn('[api] Session error — signing out:', error.message);
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') window.location.replace('/login');
      return {};
    }
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  } catch (err: any) {
    // Catches AuthApiError thrown when the refresh token is completely gone
    if (err?.name === 'AuthApiError' || err?.message?.includes('Refresh Token')) {
      console.warn('[api] Invalid refresh token — clearing session and redirecting to login');
      try { await supabase.auth.signOut(); } catch { /* best effort */ }
      if (typeof window !== 'undefined') window.location.replace('/login');
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

async function handleResponse(response: Response, endpoint: string, method: string) {
  if (!response.ok) {
    if (response.status === 404) {
      console.warn(`[API] Endpoint not found: ${endpoint}. Check if NEXT_PUBLIC_BACKEND_URL is set correctly.`);
      return { success: false, error: 'Not Found' };
    }
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = typeof errorData.error === 'object' 
      ? errorData.error.message 
      : (errorData.error || response.statusText);
    throw new Error(errorMessage || `${method} ${endpoint} failed`);
  }
  return response.json();
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
      // Avoid crashing if the backend is just not there (e.g. localhost vs production)
      if (response.status === 404) {
        console.warn(`[API] Endpoint not found: ${endpoint}. Check if NEXT_PUBLIC_BACKEND_URL is set correctly.`);
        return { success: false, error: 'Not Found' };
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData.error === 'object' ? errorData.error.message : (errorData.error || `GET ${endpoint} failed: ${response.statusText}`);
      throw new Error(errorMessage);
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData.error === 'object' ? errorData.error.message : (errorData.error || `POST ${endpoint} failed: ${response.statusText}`);
      throw new Error(errorMessage);
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
    return handleResponse(response, endpoint, 'POST (Multipart)');
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData.error === 'object' ? errorData.error.message : (errorData.error || `PUT ${endpoint} failed: ${response.statusText}`);
      throw new Error(errorMessage);
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData.error === 'object' ? errorData.error.message : (errorData.error || `DELETE ${endpoint} failed: ${response.statusText}`);
      throw new Error(errorMessage);
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData.error === 'object' ? errorData.error.message : (errorData.error || `PATCH ${endpoint} failed: ${response.statusText}`);
      throw new Error(errorMessage);
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

  // Inbox & Engagement API
  async getInboxMessages(params?: { tab?: string; platform?: string; type?: string; risk?: string; search?: string; page?: number; limit?: number }) {
    return this.listInboxMessages(params);
  },

  async listInboxMessages(params?: { tab?: string; platform?: string; type?: string; risk?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.tab) query.set('tab', params.tab);
    if (params?.platform) query.set('platform', params.platform);
    if (params?.type) query.set('type', params.type);
    if (params?.risk) query.set('risk', params.risk);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return this.get(`/api/v1/inbox/messages?${query.toString()}`);
  },

  async getInboxMessage(id: string) {
    return this.get(`/api/v1/inbox/messages/${id}`);
  },

  async createInboxReply(messageId: string, body: { reply_body: string; reply_type?: string; ai_tone?: string }) {
    return this.post(`/api/v1/inbox/messages/${messageId}/reply`, body);
  },

  async generateAiDraft(messageId: string, tone?: string) {
    return this.post(`/api/v1/inbox/messages/${messageId}/reply/generate`, { tone: tone || 'professional' });
  },

  async sendInboxReply(messageId: string) {
    return this.post(`/api/v1/inbox/messages/${messageId}/reply/send`, {});
  },

  async assignInboxMessage(messageId: string, assigned_to: string | null) {
    return this.post(`/api/v1/inbox/messages/${messageId}/assign`, { assigned_to });
  },

  async updateInboxMessageStatus(messageId: string, status: string) {
    return this.patch(`/api/v1/inbox/messages/${messageId}/status`, { status });
  },

  async escalateInboxMessage(messageId: string, body: { escalation_reason: string; risk_category: string; assigned_reviewer?: string }) {
    return this.post(`/api/v1/inbox/messages/${messageId}/escalate`, body);
  },

  async archiveInboxMessage(messageId: string) {
    return this.post(`/api/v1/inbox/messages/${messageId}/archive`, {});
  },

  async deleteInboxMessages(ids: string[]) {
    return this.post('/api/v1/inbox/messages/delete', { ids });
  },

  async addInboxNote(messageId: string, note_body: string) {
    return this.post(`/api/v1/inbox/messages/${messageId}/notes`, { note_body });
  },

  async getInboxMessageAudit(messageId: string) {
    return this.get(`/api/v1/inbox/messages/${messageId}/audit`);
  },

  async getInboxEscalationQueue() {
    return this.get('/api/v1/inbox/escalations');
  },

  async resolveInboxEscalation(escalationId: string, body: { decision: 'APPROVED' | 'REJECTED'; decision_note?: string }) {
    return this.post(`/api/v1/inbox/escalations/${escalationId}/resolve`, body);
  },

  async syncInboxMessages() {
    return this.post('/api/v1/inbox/sync', {});
  },

  async getInboxPostPreview(messageId: string) {
    return this.get(`/api/v1/inbox/messages/${messageId}/post-preview`);
  },

  async getPlatformReach() {
    return this.get('/api/v1/analytics/platform-reach');
  },
};
