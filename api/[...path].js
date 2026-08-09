/**
 * Vercel Serverless Proxy — api/[...path].js
 *
 * Catches all /api/* requests and proxies them to INTERVIEW_BACKEND_URL.
 * Uses req.url to get the exact path — avoids query-param reconstruction bugs.
 */

async function handler(req, res) {
  const raw = (process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000');

  // Strip trailing slash AND any trailing /api so we never get /api/api/...
  const BACKEND_ORIGIN = raw.replace(/\/api\/?$/, '').replace(/\/$/, '');

  // req.url is the full path+query e.g. "/api/interview" or "/api/session/abc?foo=bar"
  // We only want the path portion (no query string — Vercel injects ?...path=... internally)
  const targetPath = req.url ? req.url.split('?')[0] : `/api/`;
  const target = `${BACKEND_ORIGIN}${targetPath}`;

  console.log(`[proxy] ${req.method} ${targetPath} → ${target}`);

  try {
    // Collect raw request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Strip headers that shouldn't be forwarded to the backend
    const SKIP_REQUEST = new Set(['host', 'connection', 'transfer-encoding', 'accept-encoding']);
    const forwardHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!SKIP_REQUEST.has(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && rawBody.length > 0) {
      fetchOptions.body = rawBody;
    }

    const backendRes = await fetch(target, fetchOptions);

    // Strip response headers that cause browser decoding issues
    const SKIP_RESPONSE = new Set(['transfer-encoding', 'connection', 'content-encoding', 'content-length']);
    res.status(backendRes.status);
    for (const [key, value] of backendRes.headers.entries()) {
      if (!SKIP_RESPONSE.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    const buffer = Buffer.from(await backendRes.arrayBuffer());
    res.send(buffer);

  } catch (error) {
    console.error('[proxy] Error:', error.message);
    res.status(503).json({ detail: 'Interview service unavailable. Please try again.' });
  }
}

handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
