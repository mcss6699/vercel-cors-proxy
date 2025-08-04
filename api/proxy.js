export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Only GET is supported.' });
    return;
  }

  const { target, ...queryParams } = req.query;

  if (!target) {
    res.status(400).json({ error: 'Missing required "target" parameter.' });
    return;
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
    res.status(400).json({ error: 'Invalid "target" URL provided.' });
    return;
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Vercel-CORS-Proxy)',
      },
      redirect: 'follow',
    });

    const status = response.status;
    const targetContentType = response.headers.get('content-type') || 'application/octet-stream';

    res.setHeader('Content-Type', targetContentType);

    if (!response.ok) {
      let errorData;
      try {
        if (targetContentType && targetContentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          errorData = { message: errorText };
        }
      } catch (parseError) {
        errorData = { message: `Upstream API error (status ${status}) and failed to parse response body.` };
      }

      res.status(status).json({
        error: `Upstream API responded with status ${status}`,
        details: errorData
      });
      return;
    }

    const data = await response.text();

    if (targetContentType && targetContentType.includes('application/json')) {
       try {
         const jsonData = JSON.parse(data);
         res.status(status).json(jsonData);
       } catch (parseError) {
         console.warn("Upstream claimed JSON but response was not valid JSON:", data.substring(0, 100));
         res.status(status).send(data);
       }
    } else {
      res.status(status).send(data);
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({
      error: 'Internal Server Error in Proxy',
      message: error.message || 'An unexpected error occurred while fetching from the target API.'
    });
  }
}

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false
  },
};
