/**
 * Vercel Serverless Proxy — api/[...path].js
 *
 * Catches all /api/* requests and proxies them to INTERVIEW_BACKEND_URL.
 * Uses CommonJS to avoid ESM/CJS conflicts from "type": "module" in package.json.
 */

const { Readable } = require('stream');

// Disable Vercel's automatic body parsing so we can forward the raw body
// (needed for multipart/form-data video uploads)
async function handler(req, res) {
  const BACKEND_URL = (process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  // Build target URL from the catch-all path segments
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path || '');
  const target = `${BACKEND_URL}/api/${pathString}`;

  console.log(`[proxy] ${req.method} /api/${pathString} → ${target}`);

  try {
    // Collect raw request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Strip headers that shouldn't be forwarded
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

    // Strip response headers that cause decoding issues
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
