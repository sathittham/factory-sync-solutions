import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

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
});
