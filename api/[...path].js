export default async function handler(req, res) {
  const BACKEND_URL = process.env.INTERVIEW_BACKEND_URL || 'http://127.0.0.1:8000';
  
  // Reconstruct the original path since Vercel strips some of it depending on the route
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path || '');
  
  // Construct the target URL
  const target = `${BACKEND_URL}/api/${pathString}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(BACKEND_URL).host,
      }
    };

    // Forward the body if it's a POST/PUT request
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req.body;
      
      // If it's application/json, we need to stringify it because Vercel automatically parses JSON bodies
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        if (typeof req.body === 'object') {
          fetchOptions.body = JSON.stringify(req.body);
        }
      }
      
      // For multipart/form-data (video uploads), we need to carefully forward the raw stream
      // But Vercel might consume the body. To support video uploads via Vercel Serverless Functions,
      // it's tricky because of 4.5MB request payload limits on Vercel. 
      // If Vercel is used, it's actually much better to call the backend directly from the frontend via CORS.
    }

    const response = await fetch(target, fetchOptions);
    
    // Copy the response headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Send the response status and body
    res.status(response.status);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
    
  } catch (error) {
    console.error('Vercel API Proxy Error:', error);
    res.status(503).json({ detail: 'Interview service unavailable. Please try again.' });
  }
}
