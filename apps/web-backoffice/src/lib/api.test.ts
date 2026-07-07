import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apiUrl } from './api';

const mockAuth = vi.hoisted(() => {
  const state: { currentUser: { uid: string; getIdToken: () => Promise<string> } | null } = {
    currentUser: null,
  };
  return state;
});

vi.mock('./firebase', () => ({ auth: mockAuth }));

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
    expect(apiUrl('/dashboard/summary')).toBe('/api/v1/dashboard/summary');
  });
});

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockAuth.currentUser = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function respond(status: number, body: unknown) {
    fetchMock.mockResolvedValue({
      ok: status < 400,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
    });
  }

  it('unwraps { data } envelope from a successful response', async () => {
    respond(200, { data: { id: 'proj-1', name: 'Test Project' } });
    expect(await api.get('/projects/proj-1')).toEqual({ id: 'proj-1', name: 'Test Project' });
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

  it('api.post sends method POST with serialized JSON body', async () => {
    respond(200, { data: {} });
    await api.post('/projects', { name: 'x' });
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'x' });
  });

  it('api.put sends method PUT with serialized JSON body', async () => {
    respond(200, { data: {} });
    await api.put('/projects/1', { name: 'y' });
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ name: 'y' });
  });

  it('returns undefined on a 204 No Content response without reading the body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: () => Promise.reject(new Error('should not be called on 204')),
    });
    await expect(api.delete('/projects/1')).resolves.toBeUndefined();
  });

  it('api.delete sends method DELETE and unwraps the { data } envelope', async () => {
    respond(200, { data: { removed: true } });
    await expect(api.delete('/projects/1')).resolves.toEqual({ removed: true });
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('DELETE');
  });

  it('api.postForm sends multipart body without JSON content type', async () => {
    respond(200, { data: { ok: true } });
    const body = new FormData();
    body.append('file', new Blob(['x']), 'x.png');

    await api.postForm('/utilities/upload', body);

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(body);
    expect(opts.headers).not.toHaveProperty('Content-Type');
  });

  it('attaches a Bearer token header when a user is signed in', async () => {
    mockAuth.currentUser = {
      uid: 'uid-staff-1',
      getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
    };
    respond(200, { data: {} });

    await api.get('/dashboard/summary');

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer mock-id-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('api.postForm returns undefined on a 204 No Content response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: () => Promise.reject(new Error('should not be called on 204')),
    });
    const body = new FormData();
    body.append('file', new Blob(['x']), 'x.png');

    await expect(api.postForm('/utilities/upload', body)).resolves.toBeUndefined();
  });

  it('api.postForm throws ApiError on a non-ok response', async () => {
    respond(403, { error: { message: 'Forbidden' } });
    const body = new FormData();
    body.append('file', new Blob(['x']), 'x.png');

    await expect(api.postForm('/utilities/upload', body)).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
  });
});
