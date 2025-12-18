const { createClient } = require('contentful');

// Merge Target options into a single flat offer object.
function mergeTargetOptions(json) {
  const mergeOptions = (options = []) =>
    options.reduce((acc, opt) => {
      if (opt?.content && typeof opt.content === 'object') {
        return { ...acc, ...opt.content };
      }
      return acc;
    }, {});

  const prefetchMerged = mergeOptions(json?.prefetch?.pageLoad?.options);
  const executeMerged = mergeOptions(json?.execute?.pageLoad?.options);
  const offer = { ...prefetchMerged, ...executeMerged };
  return Object.keys(offer).length > 0 ? offer : null;
}

// Apply Target overrides to the homepage JSON (hero, icons, strip).
function applyTargetOverrides(homepage, target) {
  const heroWithOverride = target?.hero || homepage?.hero;

  const icons = homepage?.icons ? [...homepage.icons] : [];

  // Handle keys like "icon[1]" (1-based index from Target).
  Object.entries(target || {}).forEach(([key, value]) => {
    const match = key.match(/^icon\[(\d+)\]$/i);
    if (!match) return;
    const idx = Math.max(0, parseInt(match[1], 10) - 1); // 1-based to 0-based
    const replacement = Array.isArray(value) ? value[0] : value;
    if (replacement) {
      while (icons.length <= idx) icons.push(undefined);
      icons[idx] = replacement;
    }
  });

  // Fill to at least 4 items to keep layout stable.
  while (icons.length < 4 && icons.length > 0) {
    icons.push(...icons.slice(0, Math.min(4 - icons.length, icons.length)));
  }

  const stripWithOverride = target?.strip || homepage?.strip;

  return {
    heroWithOverride,
    iconsWithOverride: icons.slice(0, 4),
    stripWithOverride,
  };
}

exports.handler = async (event) => {
  try {
    const preview = event.queryStringParameters?.preview === 'true';

    const client = createClient({
      space: process.env.REACT_APP_CONTENTFUL_SPACE_ID,
      environment: process.env.REACT_APP_CONTENTFUL_ENV || 'master',
      accessToken: preview
        ? process.env.REACT_APP_CONTENTFUL_CPA_TOKEN
        : process.env.REACT_APP_CONTENTFUL_CDA_TOKEN,
      host: preview ? 'preview.contentful.com' : 'cdn.contentful.com',
    });

    const [heroRes, iconsRes, stripRes, footerRes, dataLayerRes] = await Promise.all([
      client.getEntries({ content_type: 'hero_vod', limit: 1, include: 3 }),
      client.getEntries({ content_type: 'icon_vod', limit: 4, include: 3 }),
      client.getEntries({ content_type: 'strip_vod', limit: 1, include: 3 }),
      client.getEntries({ content_type: 'footer_vod', limit: 1, include: 3 }),
      client.getEntries({ content_type: 'dataLayerVod', limit: 1, include: 1 }),
    ]);

    console.log('Contentful hero JSON:', JSON.stringify(heroRes.items[0]?.fields, null, 2));
    console.log(
      'Contentful icons JSON:',
      JSON.stringify(iconsRes.items.map((i) => i.fields), null, 2)
    );
    console.log('Contentful strip JSON:', JSON.stringify(stripRes.items[0]?.fields, null, 2));
    console.log('Contentful footer JSON:', JSON.stringify(footerRes.items[0]?.fields, null, 2));
    console.log(
      'Contentful dataLayer JSON:',
      JSON.stringify(dataLayerRes.items[0]?.fields, null, 2)
    );

    const hero = heroRes.items[0]?.fields || null;
    const icons = iconsRes.items.map((i) => i.fields);
    const strip = stripRes.items[0]?.fields || null;
    const footer = footerRes.items[0]?.fields || null;
    const dataLayer = dataLayerRes.items[0]?.fields || null;

    // --- Adobe Target delivery (server-side) using same request as target-hero ---
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

    const targetPayload = {
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

    console.log('Target request (homepage)', {
      sessionId,
      mcvid,
      propertyToken,
      targetPayload,
    });

    let targetOffer = null;
    try {
      const targetRes = await fetch(
        `https://dexataptrsd.tt.omtrdc.net/rest/v1/delivery?client=dexataptrsd&sessionId=${sessionId}&at_property=${propertyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetPayload),
        }
      );

      if (!targetRes.ok) {
        const errBody = await targetRes.text().catch(() => '');
        console.error(
          'Target delivery failed (homepage)',
          targetRes.status,
          errBody
        );
      } else {
        const targetJson = await targetRes.json();
        console.log(
          'Target response body (homepage)',
          JSON.stringify(targetJson, null, 2)
        );
        targetOffer = mergeTargetOptions(targetJson);
      }
    } catch (targetErr) {
      console.error('Target call error (homepage):', targetErr);
    }

    const homepage = { hero, icons, strip, footer, dataLayer };
    const { heroWithOverride, iconsWithOverride, stripWithOverride } =
      applyTargetOverrides(homepage, targetOffer);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero: heroWithOverride,
        icons: iconsWithOverride,
        strip: stripWithOverride,
        footer,
        dataLayer,
      }),
    };
  } catch (err) {
    console.error('homepage function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to load homepage' }),
    };
  }
};
