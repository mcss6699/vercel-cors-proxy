export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target, ...queryParams } = req.query;

  if (!target) {
    return res.status(400).json({ error: 'Missing "target" parameter. Use ?target=https://example.com&param1=value1' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid "target" URL' });
  }

  Object.entries(queryParams).forEach(([key, value]) => {
    if (key !== 'target') {
      targetUrl.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GitHub-Pages-CORS-Proxy)',
        'Accept': 'application/json',
      },
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

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      const text = await response.text();
      res.status(200).send(text);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Fetch failed',
      message: error.message,
    });
  }
}

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};