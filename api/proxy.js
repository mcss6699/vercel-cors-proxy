function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export default async function handler(req, res) {
  setNoCacheHeaders(res);
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    setCORSHeaders(res);
    res.status(405).json({ error: 'Method not allowed. Only GET is supported.' });
    return;
  }

  const { target, ...queryParams } = req.query;

  if (!target) {
    setCORSHeaders(res);
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
    setCORSHeaders(res);
    res.status(400).json({ error: 'Invalid "target" URL provided.' });
    return;
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.87',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Referer': 'https://github.com/', // 模拟合法来源
        'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    const status = response.status;
    const targetContentType = response.headers.get('content-type') || 'application/octet-stream';

    setCORSHeaders(res);
    setNoCacheHeaders(res);
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

      setCORSHeaders(res);
      setNoCacheHeaders(res);
      res.status(status).json({
        error: `Upstream API responded with status ${status}`,
        details: errorData
      });
      return;
    }

    const data = await response.text();

    setCORSHeaders(res);
    setNoCacheHeaders(res);

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
    setCORSHeaders(res);
    setNoCacheHeaders(res);
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
