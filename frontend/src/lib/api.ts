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

export const api = {
  async get(endpoint: string) {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        ...authHeader,
      },
    });
    if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
    return response.json();
  },

  async post(endpoint: string, body: any) {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `POST ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async put(endpoint: string, body: any) {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`PUT ${endpoint} failed: ${response.statusText}`);
    return response.json();
  },

  async delete(endpoint: string) {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...authHeader,
      },
    });
    if (!response.ok) throw new Error(`DELETE ${endpoint} failed: ${response.statusText}`);
    return response.json();
  },
};
