const { createClient } = require('contentful');

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

    const [heroRes, iconsRes, stripRes, footerRes] = await Promise.all([
      client.getEntries({ content_type: 'hero_vod', limit: 1, include: 3 }),
      client.getEntries({ content_type: 'icon_vod', limit: 4, include: 3 }),
      client.getEntries({ content_type: 'strip_vod', limit: 1, include: 3 }),
      client.getEntries({ content_type: 'footer_vod', limit: 1, include: 3 }),
    ]);

    console.log('Contentful hero JSON:', JSON.stringify(heroRes.items[0]?.fields, null, 2));
    console.log('Contentful icons JSON:', JSON.stringify(iconsRes.items.map((i) => i.fields), null, 2));
    console.log('Contentful strip JSON:', JSON.stringify(stripRes.items[0]?.fields, null, 2));
    console.log('Contentful footer JSON:', JSON.stringify(footerRes.items[0]?.fields, null, 2));

    const hero = heroRes.items[0]?.fields || null;
    const icons = iconsRes.items.map((i) => i.fields);
    const strip = stripRes.items[0]?.fields || null;
    const footer = footerRes.items[0]?.fields || null;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero, icons, strip, footer }),
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

