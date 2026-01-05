// Cloudflare Worker: CBOE CORS Proxy
// Deploy at: https://dash.cloudflare.com/ → Workers & Pages → Create Worker

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get ticker from URL path: /SPX or /_SPX
    const url = new URL(request.url);
    const ticker = url.pathname.slice(1) || '_SPX';

    // Validate ticker (only allow alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(ticker)) {
      return new Response('Invalid ticker', { status: 400 });
    }

    const cboeUrl = `https://cdn.cboe.com/api/global/delayed_quotes/options/${ticker}.json`;

    try {
      const response = await fetch(cboeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        return new Response(`CBOE returned ${response.status}`, {
          status: response.status,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      const data = await response.text();

      return new Response(data, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30',
        }
      });
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
