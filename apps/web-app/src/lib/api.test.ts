import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, apiUrl } from './api';

vi.mock('./firebase', () => ({ auth: { currentUser: null } }));

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
});
