import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRequest } from '../src/index.js';

const env = {
  UPSTREAM_ORIGIN: 'https://cloud-run.example.run.app',
  ALLOWED_ORIGINS: 'https://app.factorysyncsolutions.com,https://backoffice.factorysyncsolutions.com',
};

test('handles CORS preflight for allowed origins', async () => {
  const request = new Request('https://api.factorysyncsolutions.com/v1/profile', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://app.factorysyncsolutions.com',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });

  const response = await handleRequest(request, env);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.factorysyncsolutions.com');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'authorization,content-type');
});

test('does not reflect disallowed origins', async () => {
  const request = new Request('https://api.factorysyncsolutions.com/v1/profile', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil.example.com',
    },
  });

  const response = await handleRequest(request, env);

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
});

test('rewrites public v1 path and query to the configured upstream', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let proxiedRequest;
  globalThis.fetch = async (request) => {
    proxiedRequest = request;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  const request = new Request('https://api.factorysyncsolutions.com/v1/dbd/profile/check/0115560016313?locale=th', {
    method: 'GET',
    headers: {
      Origin: 'https://app.factorysyncsolutions.com',
      Authorization: 'Bearer token',
    },
  });

  const response = await handleRequest(request, env);

  assert.equal(proxiedRequest.url, 'https://cloud-run.example.run.app/api/v1/dbd/profile/check/0115560016313?locale=th');
  assert.equal(proxiedRequest.headers.get('Authorization'), 'Bearer token');
  assert.equal(proxiedRequest.headers.get('X-Forwarded-Host'), 'api.factorysyncsolutions.com');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.factorysyncsolutions.com');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('forwards a POST body upstream and overwrites the client X-Forwarded-For', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let proxiedRequest;
  let proxiedBody;
  globalThis.fetch = async (request) => {
    proxiedRequest = request;
    proxiedBody = await request.text();
    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const request = new Request('https://api.factorysyncsolutions.com/v1/profile', {
    method: 'POST',
    headers: {
      Origin: 'https://app.factorysyncsolutions.com',
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      'X-Forwarded-For': '198.51.100.4',
    },
    body: JSON.stringify({ name: 'Factory A' }),
  });

  const response = await handleRequest(request, env);

  assert.equal(response.status, 201);
  assert.equal(proxiedRequest.url, 'https://cloud-run.example.run.app/api/v1/profile');
  assert.equal(proxiedBody, JSON.stringify({ name: 'Factory A' }));
  assert.equal(proxiedRequest.headers.get('X-Forwarded-For'), '203.0.113.7');
});

test('rejects api v1 path at the gateway', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response();
  };

  const request = new Request('https://api.factorysyncsolutions.com/api/v1/profile', {
    headers: {
      Origin: 'https://app.factorysyncsolutions.com',
    },
  });

  const response = await handleRequest(request, env);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(fetchCalled, false);
  assert.equal(body.success, false);
});

test('returns a JSON 502 when upstream fetch fails', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  console.error = () => {};
  globalThis.fetch = async () => {
    throw new Error('network failed');
  };

  const request = new Request('https://api.factorysyncsolutions.com/v1/profile', {
    headers: {
      Origin: 'https://app.factorysyncsolutions.com',
    },
  });

  const response = await handleRequest(request, env);
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.factorysyncsolutions.com');
  assert.equal(body.success, false);
});
