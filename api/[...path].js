/**
 * Vercel Serverless Proxy
 *
 * All /api/* requests from the frontend are caught here.
 * This function reads INTERVIEW_BACKEND_URL (server-side env var) and
 * proxies the request to the Python FastAPI backend.
 *
 * This avoids:
 *  - CORS issues (backend only talks to this server-side function)
 *  - Exposing the backend URL in the browser bundle
 *  - Needing a VITE_ prefix for the env var
 */

// Vercel parses JSON bodies automatically — disable that for raw forwarding
export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const BACKEND_URL = (process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  // Reconstruct the full path: /api/[...path] → e.g. ["interview", "video"]
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path || '');
  const target = `${BACKEND_URL}/api/${pathString}`;

  console.log(`[proxy] ${req.method} ${req.url} → ${target}`);

  try {
    // Forward headers but strip host to avoid backend rejecting the request
    const forwardHeaders = {};
    const skipHeaders = new Set(['host', 'connection', 'transfer-encoding']);
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.has(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
      redirect: 'follow',
    };

    // Attach body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = await getRawBody(req);
      fetchOptions.duplex = 'half';
    }

    const backendResponse = await fetch(target, fetchOptions);

    // Forward response status and headers
    res.status(backendResponse.status);
    for (const [key, value] of backendResponse.headers.entries()) {
      // Skip headers that would conflict with Vercel's own response handling
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // Stream the response body back
    const buffer = Buffer.from(await backendResponse.arrayBuffer());
    res.send(buffer);

  } catch (error) {
    console.error('[proxy] Error:', error);
    res.status(503).json({ detail: 'Interview service unavailable. Please try again.' });
  }
}
