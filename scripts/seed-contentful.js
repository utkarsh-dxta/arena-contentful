// scripts/seed-contentful.js
// Usage:
// CONTENTFUL_MANAGEMENT_TOKEN=... CONTENTFUL_SPACE_ID=... CONTENTFUL_ENV=master node scripts/seed-contentful.js

const contentful = require('contentful-management');

const locale = 'en-US';

async function createAndPublish(env, type, fields) {
  const entry = await env.createEntry(type, { fields });
  await entry.publish();
  return entry;
}

function asRef(entry) {
  return { sys: { type: 'Link', linkType: 'Entry', id: entry.sys.id } };
}

function asAssetRef(id) {
  return { sys: { type: 'Link', linkType: 'Asset', id } };
}

async function run() {
  const client = contentful.createClient({ accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN });
  const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
  const env = await space.getEnvironment(process.env.CONTENTFUL_ENV || 'master');

  // --- Create entries for each *_vod type ---

  const buttonVodPrimary = await createAndPublish(env, 'button_vod', {
    title: { [locale]: 'Watch now' },
    backgroundColor: { [locale]: '#111827' },
    textColor: { [locale]: '#FFFFFF' },
    url: { [locale]: '/watch' },
  });

  const buttonVodSecondary = await createAndPublish(env, 'button_vod', {
    title: { [locale]: 'Learn more' },
    backgroundColor: { [locale]: '#E5E7EB' },
    textColor: { [locale]: '#111827' },
    url: { [locale]: '/learn' },
  });

  const heroVod = await createAndPublish(env, 'hero_vod', {
    title: { [locale]: 'Stream without limits' },
    subtitle: { [locale]: 'High-quality VOD experiences for every viewer.' },
    eyebrow: { [locale]: 'Arena VOD' },
    backgroundImage: { [locale]: asAssetRef('WYiHghBmvpI9TzpfYL6BC') }, // change to a real asset ID
    button: { [locale]: asRef(buttonVodPrimary) },
  });

  const iconVod1 = await createAndPublish(env, 'icon_vod', {
    title: { [locale]: '4K ready' },
    textColor: { [locale]: '#111827' },
    image: { [locale]: asAssetRef('7InaDloDxSg4E6pzH4yG2U') }, // change to a real asset ID
    backgroundColor: { [locale]: '#E0F2FE' },
  });

  const iconVod2 = await createAndPublish(env, 'icon_vod', {
    title: { [locale]: 'Global CDN' },
    textColor: { [locale]: '#111827' },
    image: { [locale]: asAssetRef('2c54o25NRAkccZpnYYha6n') }, // change to a real asset ID
    backgroundColor: { [locale]: '#ECFEFF' },
  });

  const stripVod = await createAndPublish(env, 'strip_vod', {
    title: { [locale]: 'Ready to launch your VOD channel?' },
    color: { [locale]: '#0EA5E9' },
    button: { [locale]: asRef(buttonVodSecondary) },
  });

  const footerLink1 = await createAndPublish(env, 'footerLink_vod', {
    label: { [locale]: 'About' },
    url: { [locale]: '/about' },
    group: { [locale]: 'Company' },
  });

  const footerLink2 = await createAndPublish(env, 'footerLink_vod', {
    label: { [locale]: 'Support' },
    url: { [locale]: '/support' },
    group: { [locale]: 'Resources' },
  });

  const footerVod = await createAndPublish(env, 'footer_vod', {
    links: { [locale]: [asRef(footerLink1), asRef(footerLink2)] },
    socialLinks: { [locale]: [{ label: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin' }] },
    legalText: { [locale]: '© 2025 Arena VOD. All rights reserved.' },
  });

  console.log('Seed complete.');
  console.log('hero_vod:', heroVod.sys.id);
  console.log('icon_vod entries:', iconVod1.sys.id, iconVod2.sys.id);
  console.log('strip_vod:', stripVod.sys.id);
  console.log('footer_vod:', footerVod.sys.id);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});