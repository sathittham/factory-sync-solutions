const DEFAULT_ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const DEFAULT_ALLOWED_HEADERS = 'Authorization,Content-Type,X-Requested-With,X-Turnstile-Token';
const DEFAULT_EXPOSED_HEADERS = 'Content-Length,Content-Type';

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};

export async function handleRequest(request, env = {}) {
  const upstreamOrigin = normalizeOrigin(env.UPSTREAM_ORIGIN);
  if (!upstreamOrigin) {
    return jsonError('Gateway upstream is not configured', 500, request, env);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    });
  }

  const targetURL = new URL(request.url);
  if (!isPublicAPIPath(targetURL.pathname)) {
    return jsonError('Not found', 404, request, env);
  }
  targetURL.protocol = upstreamOrigin.protocol;
  targetURL.host = upstreamOrigin.host;
  targetURL.pathname = upstreamPathname(targetURL.pathname);

  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', new URL(request.url).host);
  headers.set('X-Forwarded-Proto', 'https');
  // Overwrite client-supplied forwarding headers with the edge-trusted client IP
  // so the backend cannot be tricked into trusting a spoofed X-Forwarded-For.
  const clientIP = request.headers.get('CF-Connecting-IP');
  if (clientIP) {
    headers.set('X-Forwarded-For', clientIP);
  } else {
    headers.delete('X-Forwarded-For');
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // Required when constructing a Request with a streaming body on recent
    // compatibility dates; without it the runtime throws.
    init.duplex = 'half';
  }

  try {
    const upstreamResponse = await fetch(new Request(targetURL, init));
    const responseHeaders = new Headers(upstreamResponse.headers);
    applyCorsHeaders(responseHeaders, request, env);
    applyNoStoreDefault(responseHeaders);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('api gateway upstream error', error);
    return jsonError('Gateway upstream request failed', 502, request, env);
  }
}

function jsonError(message, status, request, env) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  applyCorsHeaders(headers, request, env);

  return new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers,
  });
}

function normalizeOrigin(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function isPublicAPIPath(pathname) {
  return pathname === '/v1' || pathname.startsWith('/v1/');
}

function upstreamPathname(pathname) {
  if (pathname === '/v1') {
    return '/api/v1';
  }
  return `/api${pathname}`;
}

function corsHeaders(request, env) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });

  const allowedOrigin = resolveAllowedOrigin(request, env);
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return headers;
}

function applyCorsHeaders(headers, request, env) {
  const cors = corsHeaders(request, env);
  for (const [key, value] of cors) {
    if (key.toLowerCase() === 'vary') {
      mergeVary(headers, value);
      continue;
    }
    headers.set(key, value);
  }
  headers.set('Access-Control-Expose-Headers', DEFAULT_EXPOSED_HEADERS);
}

function mergeVary(headers, value) {
  const existing = headers.get('Vary');
  if (!existing) {
    headers.set('Vary', value);
    return;
  }

  const varyValues = new Set(
    existing
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
  varyValues.add(value);
  headers.set('Vary', [...varyValues].join(', '));
}

function applyNoStoreDefault(headers) {
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store');
  }
}

function resolveAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;

  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (allowedOrigins.has(origin)) {
    return origin;
  }

  return null;
}

function parseAllowedOrigins(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}
