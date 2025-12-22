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

// Recursively apply Target overrides by matching offer keys to `targetId` on any node.
// Only properties present in the offer are overridden; all others stay as-is.
function applyTargetIdOverrides(node, offers = {}) {
  if (!node || typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    return node.map((item) => applyTargetIdOverrides(item, offers));
  }

  // Clone the node so we don't mutate the original
  let result = { ...node };

  const id = result.targetId;
  if (id && typeof offers[id] === 'object' && offers[id] !== null) {
    // Shallow merge: only keys present in offers[id] are overridden
    result = { ...result, ...offers[id] };
  }

  // Recurse into children
  Object.keys(result).forEach((key) => {
    if (key === 'targetId') return; // don't recurse into the id itself
    const value = result[key];
    if (value && typeof value === 'object') {
      result[key] = applyTargetIdOverrides(value, offers);
    }
  });

  return result;
}

// Apply Target overrides to the homepage JSON (hero, icons, strip, footer)
// based on `targetId` on each node.
function applyTargetOverrides(homepage, targetOffers) {
  const heroWithOverride = applyTargetIdOverrides(homepage?.hero, targetOffers);

  let icons = (homepage?.icons || []).map((icon) =>
    applyTargetIdOverrides(icon, targetOffers)
  );

  // Fill to at least 4 items to keep layout stable.
  while (icons.length < 4 && icons.length > 0) {
    icons.push(...icons.slice(0, Math.min(4 - icons.length, icons.length)));
  }

  const stripWithOverride = applyTargetIdOverrides(homepage?.strip, targetOffers);
  const footerWithOverride = applyTargetIdOverrides(homepage?.footer, targetOffers);

  return {
    heroWithOverride,
    iconsWithOverride: icons.slice(0, 4),
    stripWithOverride,
    footerWithOverride,
  };
}

// Helper function to extract tnta from Target response
function extractTntaFromTargetResponse(targetJson) {
  // Check execute.pageLoad.analytics.payload.tnta (primary location)
  if (targetJson?.execute?.pageLoad?.analytics?.payload?.tnta) {
    return { payload: { tnta: targetJson.execute.pageLoad.analytics.payload.tnta } };
  }

  // Check prefetch.pageLoad.analytics.payload.tnta
  if (targetJson?.prefetch?.pageLoad?.analytics?.payload?.tnta) {
    return { payload: { tnta: targetJson.prefetch.pageLoad.analytics.payload.tnta } };
  }

  // Fallback: Check prefetch options for payload.tnta
  const prefetchOptions = targetJson?.prefetch?.pageLoad?.options || [];
  for (const option of prefetchOptions) {
    if (option?.payload?.tnta) {
      return { payload: { tnta: option.payload.tnta } };
    }
  }

  // Fallback: Check execute options for payload.tnta
  const executeOptions = targetJson?.execute?.pageLoad?.options || [];
  for (const option of executeOptions) {
    if (option?.payload?.tnta) {
      return { payload: { tnta: option.payload.tnta } };
    }
  }

  // Fallback: Check if tnta is directly in the response
  if (targetJson?.payload?.tnta) {
    return { payload: { tnta: targetJson.payload.tnta } };
  }

  return null;
}

// Parse CONSENTMGR cookie and determine consent status
function parseConsentCookie(cookieHeader) {
  if (!cookieHeader) {
    return { allowAnalytics: false, allowPersonalization: false };
  }

  // Extract CONSENTMGR cookie value
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const consentCookie = cookies.find((c) => c.startsWith('CONSENTMGR='));
  
  if (!consentCookie) {
    return { allowAnalytics: false, allowPersonalization: false };
  }

  const consentValue = decodeURIComponent(consentCookie.split('=')[1] || '');
  
  // Parse pipe-separated values into an object
  const consentParts = {};
  consentValue.split('|').forEach((part) => {
    const [key, value] = part.split(':');
    if (key && value !== undefined) {
      consentParts[key.trim()] = value.trim();
    }
  });

  // Check for consent:false first (highest priority)
  if (consentParts.consent === 'false') {
    console.log('Consent denied: consent:false found in CONSENTMGR cookie');
    return { allowAnalytics: false, allowPersonalization: false };
  }

  // Check for granular consent (c1 for Analytics, c7 for Personalization)
  if (consentParts.c1 !== undefined || consentParts.c7 !== undefined) {
    const allowAnalytics = consentParts.c1 === '1';
    const allowPersonalization = consentParts.c7 === '1';
    console.log(`Granular consent: c1=${consentParts.c1 || '0'} (Analytics: ${allowAnalytics}), c7=${consentParts.c7 || '0'} (Personalization: ${allowPersonalization})`);
    return { allowAnalytics, allowPersonalization };
  }

  // Check for consent:true (allow both)
  if (consentParts.consent === 'true') {
    console.log('Consent granted: consent:true found in CONSENTMGR cookie');
    return { allowAnalytics: true, allowPersonalization: true };
  }

  // Default: no consent
  console.log('No valid consent found in CONSENTMGR cookie');
  return { allowAnalytics: false, allowPersonalization: false };
}

// Send Analytics payload with tnta and ECID
function sendAnalyticsPayload(analyticsPayload, adobeMID) {
  console.log('sendAnalyticsPayload - Analytics Payload: ' + JSON.stringify(analyticsPayload));

  if (analyticsPayload && analyticsPayload.payload && analyticsPayload.payload.tnta) {
    const tnta = analyticsPayload.payload.tnta;
    console.log('sendAnalyticsPayload - tntA: ' + tnta);

    const analyticsURL = `https://sdemo.sc.omtrdc.net/b/ss/dexataptrsdweb/1?pe=tnt&tnta=${tnta}&mcid=${adobeMID}`;

    return fetch(analyticsURL, {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok. Status code: ${response.status}.`);
        }
        // Analytics API returns a GIF tracking pixel, not JSON
        // Just verify the request succeeded - we don't need the response body
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('image/')) {
          console.log('sendAnalyticsPayload - Success: Tracking pixel received (status: ' + response.status + ')');
          return { success: true, status: response.status };
        }
        // If it's not an image, try to parse as JSON (fallback)
        return response.json();
      })
      .then((data) => {
        if (data && !data.success) {
          console.log('sendAnalyticsPayload - Success Status: ' + JSON.stringify(data));
        }
        return data;
      })
      .catch((error) => {
        console.log('sendAnalyticsPayload Error: ' + error.message);
        throw error;
      });
  } else {
    console.log('sendAnalyticsPayload - No tnta found in payload');
    return Promise.resolve(null);
  }
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

   /* console.log('Contentful hero JSON:', JSON.stringify(heroRes.items[0]?.fields, null, 2));
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
*/
console.log("hero JSON:", JSON.stringify(heroRes.items[0]?.fields, null, 2));
    const hero = heroRes.items[0]?.fields || null;
    const icons = iconsRes.items.map((i) => i.fields);
    const strip = stripRes.items[0]?.fields || null;
    const footer = footerRes.items[0]?.fields || null;
    const dataLayer = dataLayerRes.items[0]?.fields || null;

    // Parse consent cookie to determine if AT and AA calls should be made
    const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
    const { allowAnalytics, allowPersonalization } = parseConsentCookie(cookieHeader);

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

    let targetOffer = null;

    // Only make Target call if personalization consent is granted
    if (allowPersonalization) {
      const targetPayload = {
        id: { marketingCloudVisitorId: mcvid },
        property: { token: propertyToken },
        context: {
          channel: 'web',
          browser: { host: urlObj?.host || 'server' },
          address: { url: targetUrl },
          screen: { width: 1200, height: 1400 },
        },
        experienceCloud: {
          analytics: {
            logging: "client_side"
          }
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

    /*  console.log('Target request (homepage)', {
        sessionId,
        mcvid,
        propertyToken,
        targetPayload,
      });*/

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
          /* console.log(
            'Target response body (homepage)',
            JSON.stringify(targetJson, null, 2)
          );*/
          targetOffer = mergeTargetOptions(targetJson);

          // Only send Analytics payload if Analytics consent is granted
          if (allowAnalytics) {
            const analyticsPayload = extractTntaFromTargetResponse(targetJson);
            if (analyticsPayload) {
              // Fire and forget - don't wait for Analytics response
              sendAnalyticsPayload(analyticsPayload, mcvid).catch((err) => {
                console.error('Analytics payload send failed:', err);
              });
            } else {
              console.log('No tnta found in Target response, skipping Analytics call');
            }
          } else {
            console.log('Analytics consent not granted, skipping Analytics call');
          }
        }
      } catch (targetErr) {
        console.error('Target call error (homepage):', targetErr);
      }
    } else {
      console.log('Personalization consent not granted, skipping Target call');
    }

    const homepage = { hero, icons, strip, footer, dataLayer };
    const {
      heroWithOverride,
      iconsWithOverride,
      stripWithOverride,
      footerWithOverride,
    } = applyTargetOverrides(homepage, targetOffer || {});

    console.log("heroWithOverride:", JSON.stringify(heroWithOverride, null, 2));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero: heroWithOverride,
        icons: iconsWithOverride,
        strip: stripWithOverride,
        footer: footerWithOverride,
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
