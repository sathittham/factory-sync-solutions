import { auth } from './firebase';

/** Exported for consumers outside this module's `request()` wrapper — e.g. the shared
 * `ChatWidget` (`@shared/ui/chat-widget`), which is host-agnostic and takes its base URL as a prop. */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function getAuthHeaders(includeContentType = true): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[api] getAuthHeaders — auth.currentUser is null, sending request without token');
    return includeContentType ? { 'Content-Type': 'application/json' } : {};
  }
  const token = await user.getIdToken();
  console.debug(
    '[api] getAuthHeaders — token obtained for uid:',
    user.uid,
    '(first 20):',
    token.slice(0, 20),
  );
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
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
  // API wraps all responses as { success, data, ... } — unwrap automatically
  return json.data === undefined ? json : json.data;
}

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
  return json.data === undefined ? json : json.data;
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

  postForm: <T>(path: string, body: FormData) => requestForm<T>(path, body),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
