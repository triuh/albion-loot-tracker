import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const targetUrl = event.queryStringParameters?.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing url parameter' }),
    };
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'AlbionOnline/1.0',
        'Accept': 'application/json',
      },
    });
    const body = await res.text();

    return {
      statusCode: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Proxy fetch failed', details: String(err) }),
    };
  }
};
