/**
 * Vercel Serverless Proxy — api/[...path].cjs
 *
 * Uses only Node.js built-in http/https modules — no global fetch needed,
 * works on Node 16+ which is what Vercel uses on the free tier.
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');

/** Collect raw request body using event listeners (works on all Node versions) */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end',  ()      => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Make an outgoing HTTP/HTTPS request, return the response object */
function makeRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const transport = opts.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(opts, resolve);
    proxyReq.on('error', reject);
    proxyReq.setTimeout(55_000, () => {
      proxyReq.destroy(new Error('Backend request timed out'));
    });
    if (body && body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
}

/** Collect response body from an IncomingMessage */
function readResponse(proxyRes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    proxyRes.on('data',  (chunk) => chunks.push(chunk));
    proxyRes.on('end',   ()      => resolve(Buffer.concat(chunks)));
    proxyRes.on('error', reject);
  });
}

async function handler(req, res) {
  const raw = process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000';

  // Strip any trailing /api or / so we don't double-up the path
  const BACKEND_ORIGIN = raw.replace(/\/api\/?$/, '').replace(/\/$/, '');

  // req.url is the full Vercel path e.g. "/api/interview"
  const targetPath = (req.url || '/api/').split('?')[0];
  const target = `${BACKEND_ORIGIN}${targetPath}`;

  console.log(`[proxy] ${req.method} ${targetPath} → ${target}`);

  try {
    const rawBody = await readBody(req);

    const targetUrl = new URL(target);

    // Build forwarded headers — strip headers that must not be forwarded
    const SKIP = new Set(['host', 'connection', 'transfer-encoding', 'accept-encoding']);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!SKIP.has(k.toLowerCase())) headers[k] = v;
    }
    if (rawBody.length > 0) {
      headers['content-length'] = String(rawBody.length);
    }

    const proxyRes = await makeRequest(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port:     targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path:     targetUrl.pathname + targetUrl.search,
        method:   req.method,
        headers,
      },
      rawBody,
    );

    const SKIP_RES = new Set(['connection', 'transfer-encoding']);
    const body = await readResponse(proxyRes);

    // Log backend error details to server logs for easier debugging in production.
    if (proxyRes.statusCode >= 500) {
      try {
        const text = body.toString('utf8');
        console.error('[proxy] Backend error:', {
          status: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: text.length > 10000 ? text.slice(0, 10000) + '... [truncated]' : text,
        });
      } catch (e) {
        console.error('[proxy] Backend error: unable to decode body', e && e.message);
      }
    }

    res.statusCode = proxyRes.statusCode;
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (!SKIP_RES.has(k.toLowerCase())) res.setHeader(k, v);
    }

    res.end(body);

  } catch (err) {
    console.error('[proxy] Error:', err.message);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ detail: 'Interview service unavailable. Please try again.' }));
    }
  }
}

handler.config = {
  api: { bodyParser: false },
};

module.exports = handler;
