import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = process.cwd();

const app = express();
const PORT = 3000;
const INTERVIEW_BACKEND_URL = process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000';

const proxyRawInterviewBackend = async (req: express.Request, res: express.Response) => {
  try {
    const target = `${INTERVIEW_BACKEND_URL}${req.originalUrl}`;
    console.log(`[proxy] RAW ${req.method} ${req.originalUrl} -> ${target}`);
    console.log('[proxy] RAW headers:', JSON.stringify(req.headers));
    const headers: Record<string, string> = {};
    const contentType = req.headers['content-type'];
    if (contentType) headers['Content-Type'] = Array.isArray(contentType) ? contentType[0] : contentType;

    const response = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req as any,
      duplex: 'half' as any,
    } as any);
    const responseType = response.headers.get('content-type') || 'application/json';
    const responseText = await response.text();
    if (response.status >= 400) {
      console.error('[proxy] RAW backend error', { target, status: response.status, body: responseText.length > 10000 ? responseText.slice(0, 10000) + '... [truncated]' : responseText });
    }
    res.status(response.status).type(responseType);
    res.send(responseText);
  } catch (error) {
    console.error('Interview backend raw proxy error:', error);
    res.status(503).json({ detail: 'Interview service unavailable. Please try again.' });
  }
};

app.all('/api/interview/video', proxyRawInterviewBackend);

app.use(express.json());

// API: Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const proxyInterviewBackend = async (req: express.Request, res: express.Response) => {
  try {
    const target = `${INTERVIEW_BACKEND_URL}${req.originalUrl}`;
    console.log(`[proxy] ${req.method} ${req.originalUrl} -> ${target}`);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try { console.log('[proxy] REQ body:', JSON.stringify(req.body).slice(0, 10000)); } catch (e) { console.log('[proxy] REQ body: <unserializable>'); }
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const responseText = await response.text();
    if (response.status >= 400) {
      console.error('[proxy] backend error', { target, status: response.status, body: responseText.length > 10000 ? responseText.slice(0,10000) + '... [truncated]' : responseText });
    }
    res.status(response.status).type(contentType);
    res.send(responseText);
  } catch (error) {
    console.error('Interview backend proxy error:', error);
    res.status(503).json({ detail: 'Interview service unavailable. Please try again.' });
  }
};

// Friend backend pass-through. This preserves the real FastAPI /api/interview contract.
app.all('/api/interview', proxyInterviewBackend);
app.all('/api/session/:sessionId', proxyInterviewBackend);
app.all('/api/candidates', proxyInterviewBackend);
app.all('/api/interview/:sessionId/integrity', proxyInterviewBackend);
app.all('/api/interview/:sessionId/integrity/events', proxyInterviewBackend);

// Vite Development or Production Server Static Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
