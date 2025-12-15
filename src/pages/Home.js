import { useEffect, useState } from 'react';
import { getHomepage } from '../contentfulClient';
import '../App.css';

/*
// Minimal helper to fetch a Target offer for the hero via Netlify Function.
// Commented out while Tealium handles Adobe Target delivery.
async function fetchTargetHero() {
  try {
    const sessionId =
      sessionStorage.getItem('targetSessionId') ||
      (() => {
        const id = `sess-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem('targetSessionId', id);
        return id;
      })();

    const mcvid =
      localStorage.getItem('mcvid') ||
      (() => {
        const id = '74489933867880856123472568655649636017';
        localStorage.setItem('mcvid', id);
        return id;
      })();

    const url = encodeURIComponent(window.location.href);

    const res = await fetch(`/.netlify/functions/target-hero?url=${url}`, {
      headers: {
        'x-session-id': sessionId,
        'x-mcvid': mcvid,
      },
    });

    if (!res.ok) throw new Error('Target delivery failed');
    const offer = await res.json();
    // Expect shape: { hero, icon[1], strip, ... }
    if (!offer) return null;
    return offer;
  } catch (err) {
    console.error('Adobe Target error:', err);
    return null;
  }
}
*/

function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has('preview');
    async function load() {
      try {
        // Target call disabled (handled via Tealium). Keep placeholder for activity JSON.
        const [homepage /*, targetHero */] = await Promise.all([
          getHomepage({ preview }),
          // fetchTargetHero(),
        ]);

        console.log('Contentful homepage JSON:', homepage);
        const targetHero = null;
        console.log('Target offer JSON:', JSON.stringify(targetHero, null, 2));

        const { heroWithOverride, iconsWithOverride, stripWithOverride } =
          applyTargetOverrides(homepage, targetHero);

        setData({
          hero: heroWithOverride,
          icons: iconsWithOverride,
          strip: stripWithOverride,
          footer: homepage?.footer,
          dataLayer: homepage?.dataLayer,
        });

        // Push dataLayer from Contentful (dataLayerVod) to Tealium once available.
        if (homepage?.dataLayer && window.utag && typeof window.utag.view === 'function') {
          window.utag.view(homepage.dataLayer.dl);
          console.info('Tealium utag.view fired with dataLayer', homepage.dataLayer.dl);
        }
      } catch (err) {
        setError(err);
        console.error('Error loading content:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (error || !data) return <div className="error">Could not load content.</div>;

  return (
    <>
      <Hero data={data.hero} />
      <Icons data={data.icons} />
      <Strip data={data.strip} />
      <Footer data={data.footer} />
    </>
  );
}

function Hero({ data }) {
  if (!data) return <SectionPlaceholder label="Hero content missing" />;

  // backgroundImage may be a string (Target) or a Contentful asset object.
  const bgUrl =
    typeof data.backgroundImage === 'string'
      ? data.backgroundImage
      : data.backgroundImage?.fields?.file?.url;
  const button = data.button?.fields || data.button;

  return (
    <section
      style={
        bgUrl
          ? {
              backgroundImage: `url(${bgUrl}?w=1600&fm=webp)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}
      }
      className="hero"
    >
      <div className="container hero-container">
        {data.eyebrow && <p className="eyebrow">{data.eyebrow}</p>}
        <h1>{data.title}</h1>
        {data.subtitle && <p className="subtitle">{data.subtitle}</p>}
        {button && (
          <a
            className="btn-primary"
            href={button.url || '#'}
            style={{
              backgroundColor: button.backgroundColor || '#fbbf24',
              color: button.textColor || '#0f172a',
            }}
          >
            {button.title}
          </a>
        )}
      </div>
    </section>
  );
}

function Icons({ data }) {
  if (!data || data.length === 0) return <SectionPlaceholder label="Icons missing" />;

  return (
    <section className="icons-section">
      <div className="container">
        <div className="icons-grid">
          {data.map((icon, idx) => {
            // image may be a string (Target) or a Contentful asset object.
            const imageUrl =
              typeof icon.image === 'string'
                ? icon.image
                : icon.image?.fields?.file?.url;
            return (
              <div
                key={idx}
                className="icon-card"
                style={{
                  backgroundColor: icon.backgroundColor || '#f8fafc',
                  color: icon.textColor || '#0f172a',
                }}
              >
                {imageUrl && (
                  <div className="icon-image-wrapper">
                    <img src={`${imageUrl}?w=120&fm=webp`} alt={icon.title} />
                  </div>
                )}
                <h3>{icon.title}</h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Strip({ data }) {
  if (!data) return <SectionPlaceholder label="Strip missing" />;

  const button = data.button?.fields || data.button;

  return (
    <section
      className="strip"
      style={{
        backgroundColor: data.color || '#0ea5e9',
      }}
    >
      <div className="container strip-container">
        <h2>{data.title}</h2>
        {button && (
          <a
            className="btn-strip"
            href={button.url || '#'}
            style={{
              backgroundColor: button.backgroundColor || '#ffffff',
              color: button.textColor || '#0f172a',
            }}
          >
            {button.title}
          </a>
        )}
      </div>
    </section>
  );
}

function Footer({ data }) {
  if (!data) return <SectionPlaceholder label="Footer missing" />;

  return (
    <footer className="footer">
      <div className="container footer-grid">
        {data.links?.map((link, idx) => (
          <div key={idx}>
            <div className="footer-title">{link.fields?.group || 'Links'}</div>
            <a className="footer-link" href={link.fields?.url || '#'}>
              {link.fields?.label}
            </a>
          </div>
        ))}
      </div>
      {data.legalText && <div className="footer-legal">{data.legalText}</div>}
    </footer>
  );
}

function SectionPlaceholder({ label }) {
  return (
    <section className="container section">
      <div className="placeholder card muted">{label}</div>
    </section>
  );
}

// Apply Target overrides to Contentful data.
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

export default Home;

