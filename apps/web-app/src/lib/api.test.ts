import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apiUrl } from './api';
import { auth } from './firebase';

vi.mock('./firebase', () => ({ auth: { currentUser: null } }));

// `auth.currentUser` is a read-only getter on the real firebase.Auth type — the
// mock above is a plain mutable object, so cast the setter to bypass the
// compile-time readonly check without resorting to `any`.
const mutableAuth = auth as { currentUser: typeof auth.currentUser };

function setCurrentUser(user: { uid: string; getIdToken: () => Promise<string> } | null) {
  mutableAuth.currentUser = user as typeof auth.currentUser;
}

describe('ApiError', () => {
  it('sets name, status, and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('apiUrl', () => {
  it('builds URLs from the configured API base', () => {
    expect(apiUrl('/profile')).toBe('/api/v1/profile');
  });
});

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setCurrentUser(null);
  });

  function respond(status: number, body: unknown) {
    fetchMock.mockResolvedValue({
      ok: status < 400,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
    });
  }

  function respondNoContent() {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: vi.fn(),
    });
  }

  it('unwraps { data } envelope from a successful response', async () => {
    respond(200, { data: { id: '1', name: 'Test' } });
    expect(await api.get('/test')).toEqual({ id: '1', name: 'Test' });
  });

  it('returns raw body when no data field is present', async () => {
    respond(200, { items: [1, 2, 3] });
    expect(await api.get('/test')).toEqual({ items: [1, 2, 3] });
  });

  it('throws ApiError with status and message on non-ok response', async () => {
    respond(404, { error: { message: 'Not found' } });
    await expect(api.get('/missing')).rejects.toMatchObject({
      status: 404,
      message: 'Not found',
    });
  });

  it('throws ApiError using statusText when error body is empty', async () => {
    respond(500, {});
    await expect(api.get('/error')).rejects.toMatchObject({ status: 500 });
  });

  it('throws ApiError using statusText when the error field is not a string', async () => {
    respond(500, { error: { code: 'X' } });
    await expect(api.get('/error')).rejects.toMatchObject({ status: 500, message: 'Error' });
  });

  it('falls back to res.json().catch when the error response body is not valid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('invalid json')),
    });
    await expect(api.get('/error')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('attaches an Authorization header and token when a user is signed in', async () => {
    setCurrentUser({
      uid: 'uid-factory-1',
      getIdToken: vi.fn().mockResolvedValue('token-abc'),
    });

    respond(200, { data: {} });
    await api.get('/profile');

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-abc');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('api.post sends method POST with serialized JSON body', async () => {
    respond(200, { data: {} });
    await api.post('/items', { name: 'x' });
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'x' });
  });

  it('api.put sends method PUT with serialized JSON body', async () => {
    respond(200, { data: {} });
    await api.put('/items/1', { name: 'y' });
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'y' });
  });

  it('api.delete sends method DELETE', async () => {
    respond(200, { data: {} });
    await api.delete('/items/1');
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('DELETE');
  });

  it('returns undefined for 204 responses', async () => {
    respondNoContent();
    await expect(api.delete('/items/1')).resolves.toBeUndefined();
  });

  it('api.postForm sends multipart body without JSON content type', async () => {
    respond(200, { data: { ok: true } });
    const body = new FormData();
    body.append('file', new Blob(['x']), 'x.png');

    await api.postForm('/upload/avatar', body);

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(body);
    expect(opts.headers).not.toHaveProperty('Content-Type');
  });

  it('api.postForm omits Content-Type even when a user is signed in', async () => {
    setCurrentUser({
      uid: 'uid-factory-1',
      getIdToken: vi.fn().mockResolvedValue('token-abc'),
    });

    respond(200, { data: { ok: true } });
    await api.postForm('/upload/avatar', new FormData());

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-abc');
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('api.postForm returns raw body when no data field is present', async () => {
    respond(200, { ok: true });
    expect(await api.postForm('/upload/avatar', new FormData())).toEqual({ ok: true });
  });

  it('api.postForm returns undefined for 204 responses', async () => {
    respondNoContent();
    await expect(api.postForm('/upload/avatar', new FormData())).resolves.toBeUndefined();
  });

  it('api.postForm throws ApiError with the message from the error body', async () => {
    respond(400, { error: { message: 'Bad request' } });
    await expect(api.postForm('/upload/avatar', new FormData())).rejects.toMatchObject({
      status: 400,
      message: 'Bad request',
    });
  });

  it('api.postForm throws ApiError using statusText when the error field is not a string', async () => {
    respond(500, { error: { code: 'X' } });
    await expect(api.postForm('/upload/avatar', new FormData())).rejects.toMatchObject({
      status: 500,
      message: 'Error',
    });
  });
});
