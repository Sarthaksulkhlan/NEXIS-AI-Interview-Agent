/**
 * Vercel Serverless Proxy — api/[...path].js
 *
 * Routes all /api/* requests from the frontend to the FastAPI backend.
 * Reads INTERVIEW_BACKEND_URL from Vercel environment variables (server-side).
 *
 * Key fixes:
 *  - bodyParser disabled so we can forward raw multipart/form-data for video uploads
 *  - accept-encoding stripped from forwarded request so backend sends plain (uncompressed) JSON
 *  - content-encoding/content-length stripped from response so browser doesn't try to decompress already-decoded data
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const BACKEND_URL = (process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  // Reconstruct path: req.query.path = ['interview'] → '/api/interview'
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path || '');
  const target = `${BACKEND_URL}/api/${pathString}`;

  console.log(`[proxy] ${req.method} /api/${pathString} → ${target}`);

  try {
    // Strip headers that should not be forwarded
    const SKIP_REQUEST_HEADERS = new Set([
      'host',
      'connection',
      'transfer-encoding',
      'accept-encoding', // ← prevent backend from gzip-encoding; fetch auto-decompresses but keeps the header
    ]);
    const forwardHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
    };

    // Forward body for non-GET/HEAD methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = await readRawBody(req);
      // duplex required by Node 18+ fetch when body is a stream/buffer
      fetchOptions.duplex = 'half';
    }

    const backendRes = await fetch(target, fetchOptions);

    // Strip response headers that would cause decoding issues
    const SKIP_RESPONSE_HEADERS = new Set([
      'transfer-encoding',
      'connection',
      'content-encoding', // ← fetch already decoded; removing prevents ERR_CONTENT_DECODING_FAILED
      'content-length',   // ← decoded body may differ in length; let Node compute it
    ]);

    res.status(backendRes.status);
    for (const [key, value] of backendRes.headers.entries()) {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    const buffer = Buffer.from(await backendRes.arrayBuffer());
    res.send(buffer);

  } catch (error) {
    console.error('[proxy] Fetch error:', error);
    res.status(503).json({ detail: 'Interview service unavailable. Please try again.' });
  }
}
