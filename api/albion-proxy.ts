// Vercel serverless function — прокси к Albion API
// (аналог netlify/functions/albion-proxy.ts; обе функции живут в репо,
// клиент сам определяет, какая доступна на текущем хостинге)

const ALLOWED_HOSTS = new Set([
  'gameinfo-ams.albiononline.com', // Europe
  'gameinfo.albiononline.com', // Americas
  'gameinfo-sgp.albiononline.com', // Asia
]);

export default async function handler(req: any, res: any) {
  const targetUrl = typeof req.query?.url === 'string' ? req.query.url : undefined;

  res.setHeader('Access-Control-Allow-Origin', '*');
  // no-store: edge-кэш переотдаёт протухшие ответы, из-за чего неполный
  // ответ killboard-API "прилипает" между прогонами (та же проблема была на Netlify)
  res.setHeader('Cache-Control', 'no-store');

  if (!targetUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.status(400).json({ error: 'Invalid url parameter' });
    return;
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    res.status(403).json({ error: 'Host not allowed' });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'AlbionOnline/1.0',
        'Accept': 'application/json',
      },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    res.status(upstream.status).send(body);
  } catch (err) {
    res.status(502).json({ error: 'Proxy fetch failed', details: String(err) });
  }
}
