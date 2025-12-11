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

    const payload = {
      id: { marketingCloudVisitorId: mcvid },
      property: { token: propertyToken },
      context: {
        channel: 'web',
        browser: { host: 'server' },
        address: { url: 'https://example.com' },
        screen: { width: 1200, height: 1400 },
      },
      execute: {
        mboxes: [
          {
            name: 'hero-test',
            index: 0,
            parameters: { a: 1000, b: 2 },
          },
        ],
      },
    };

    console.log('Target request', {
      sessionId,
      mcvid,
      propertyToken,
      payload,
    });

    const res = await fetch(
      `https://dexataptrsd.tt.omtrdc.net/rest/v1/delivery?client=dexataptrsd&sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) throw new Error('Target delivery failed');
    const json = await res.json();

    console.log('Target response status', res.status);
    console.log('Target response body', JSON.stringify(json, null, 2));

    const offer =
      json?.execute?.mboxes?.[0]?.options?.[0]?.content ||
      json?.prefetch?.mboxes?.[0]?.options?.[0]?.content ||
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

