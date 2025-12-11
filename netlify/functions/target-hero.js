// Using native fetch (Node 18+ on Netlify)
exports.handler = async (event) => {
  try {
    const sessionId =
      event.headers?.['x-session-id'] ||
      `sess-${Math.random().toString(36).slice(2)}`;

    const mcvid =
      event.headers?.['x-mcvid'] ||
      '74489933867880856123472568655649636017';

    const propertyToken = 'f1aab501-1f19-46a6-32a3-6750bcf7276e';

    const urlParam = event.queryStringParameters?.url;
    const urlObj = urlParam ? new URL(urlParam) : null;
    const targetUrl = urlObj?.toString() || 'https://example.com';

    const payload = {
      id: { marketingCloudVisitorId: mcvid },
      property: { token: propertyToken },
      context: {
        channel: 'web',
        browser: { host: urlObj?.host || 'server' },
        address: { url: targetUrl },
        screen: { width: 1200, height: 1400 },
      },
      prefetch: {
        pageLoad: {
          parameters: {
            a: 1000,
            b: 2,
          },
        },
      },
    };

    console.log('Target request', {
      sessionId,
      mcvid,
      propertyToken,
      payload,
    });

    const res = await fetch(
      `https://dexataptrsd.tt.omtrdc.net/rest/v1/delivery?client=dexataptrsd&sessionId=${sessionId}&at_property=f1aab501-1f19-46a6-32a3-6750bcf7276e`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('Target delivery failed', res.status, errBody);
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: errBody || JSON.stringify({ error: 'Target delivery failed' }),
      };
    }
    const json = await res.json();

    console.log('Target response status', res.status);
    console.log('Target response body', JSON.stringify(json, null, 2));

    const offer =
      json?.prefetch?.pageLoad?.options?.[0]?.content ||
      json?.execute?.pageLoad?.options?.[0]?.content ||
      null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offer),
    };
  } catch (err) {
    console.error('target-hero function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to load hero offer' }),
    };
  }
};

