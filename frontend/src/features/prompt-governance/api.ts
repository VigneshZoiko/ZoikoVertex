import { api } from "@/lib/api";

// All Prompt Governance endpoints return { success, data }. Unwrap to data,
// throw on an explicit failure envelope (auth-expired / backend error).
async function getData<T = unknown>(path: string): Promise<T> {
  const r: any = await api.get(path);
  if (r && r.success === false) throw new Error(r.error || r.data?.error?.message || "Request failed");
  return (r?.data ?? r) as T;
}
async function postData<T = unknown>(path: string, body: unknown = {}): Promise<T> {
  const r: any = await api.post(path, body);
  if (r && r.success === false) throw new Error(r.error || r.data?.error?.message || "Request failed");
  return (r?.data ?? r) as T;
}

export interface PromptRow {
  id: string;
  name: string;
  use_case_key?: string | null;
  status?: string;
  risk_tier?: string;
  current_version_id?: string | null;
  owner_name?: string;
  updated_at?: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number?: number;
  body?: string;
  body_hash?: string;
  variables_json?: Record<string, unknown> | null;
  immutable?: boolean;
  change_summary?: string;
  created_at?: string;
  created_by?: string;
}

export interface PreflightCheck { check: string; passed: boolean; details: string }
export interface PreflightResult { canCommission: boolean; checks: PreflightCheck[] }

export const promptGovApi = {
  async listPrompts(): Promise<PromptRow[]> {
    const r: any = await api.get("/api/v1/prompts");
    if (r && r.success === false) throw new Error(r.error || "Unable to load prompts");
    if (Array.isArray(r)) return r;
    return (r?.data ?? r?.prompts ?? []) as PromptRow[];
  },
  getPrompt: (id: string) => getData<PromptRow & Record<string, unknown>>(`/api/v1/prompts/${id}`),
  listVersions: (id: string) => getData<PromptVersion[]>(`/api/v1/prompts/${id}/versions`),
  getVersion: (id: string, versionId: string) => getData<PromptVersion>(`/api/v1/prompts/${id}/versions/${versionId}`),
  governanceSnapshot: (id: string) => getData<Record<string, any>>(`/api/v1/prompts/${id}/governance-snapshot`),
  evidence: (id: string) => getData<any[]>(`/api/v1/prompts/${id}/evidence`),
  audit: (id: string) => getData<any[]>(`/api/v1/prompts/${id}/audit`),
  auditTimeline: (id: string) => getData<any[]>(`/api/v1/prompts/${id}/audit/timeline`),
  runtimeTraces: (id: string) => getData<any[]>(`/api/v1/prompts/${id}/runtime-traces`),
  sealedHistory: (versionId: string) => getData<Record<string, any>>(`/api/v1/prompts/versions/${versionId}/sealed-history`),
  threeKeyStatus: (versionId: string) => getData<Record<string, any>>(`/api/v1/prompts/versions/${versionId}/three-key/status`),
  sodCheck: (versionId: string, role: string) => postData<Record<string, any>>(`/api/v1/prompts/versions/${versionId}/sod/check`, { role }),
  commissionPreflight: (id: string) => postData<PreflightResult>(`/api/v1/prompts/${id}/commission/preflight`, {}),
  commission: (id: string, notes?: string) => postData<Record<string, any>>(`/api/v1/prompts/${id}/commission`, { notes }),
};
