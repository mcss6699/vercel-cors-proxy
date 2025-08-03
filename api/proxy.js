export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target, ...queryParams } = req.query;

  if (!target) {
    return res.status(400).json({ error: 'Missing "target" parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'target') {
        targetUrl.searchParams.append(key, value);
      }
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid target URL' });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GitHub-Pages-CORS-Proxy)',
      },
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type');
    const status = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(status).json({
        error: `Upstream failed with ${status}`,
        message: errorText || 'Unknown error',
      });
    }

    const data = await response.text();
    const finalContentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', finalContentType);
    res.status(200).send(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Fetch failed', 
      message: error.message 
    });
  }
}

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};