import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function getAuthHeaders(includeContentType = true): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    return includeContentType ? { 'Content-Type': 'application/json' } : {};
  }
  const token = await user.getIdToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const errMsg = body.error?.message || body.error || res.statusText;
    throw new ApiError(res.status, typeof errMsg === 'string' ? errMsg : res.statusText);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

// requestForm submits FormData (e.g. file uploads) — omits Content-Type so
// the browser sets the multipart boundary itself.
async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const headers = await getAuthHeaders(false);
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    body,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const errMsg = errorBody.error?.message || errorBody.error || res.statusText;
    throw new ApiError(res.status, typeof errMsg === 'string' ? errMsg : res.statusText);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),

  postForm: <T>(path: string, body: FormData) => requestForm<T>(path, body),
};
