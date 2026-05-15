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
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
      const errorMessage = typeof errorData.error === 'object' ? errorData.error.message : (errorData.error || `POST ${endpoint} failed: ${response.statusText}`);
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async postMultipart(endpoint: string, formData: FormData) {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
};
