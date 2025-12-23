import { useEffect, useState } from 'react';
import { getHomepage } from '../contentfulClient';
import '../App.css';

// Normalize image URLs from Contentful or external (e.g., WordPress) sources.
// - Ensures protocol is present for Contentful // URLs.
// - Applies transform params only to Contentful assets; leaves external URLs untouched.
const normalizeImageUrl = (url, params) => {
  if (!url) return null;
  const absolute = url.startsWith('//') ? `https:${url}` : url;

  if (params && absolute.includes('ctfassets.net')) {
    return `${absolute}${absolute.includes('?') ? '&' : '?'}${params}`;
  }

  return absolute;
};

function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has('preview');
    async function load() {
      try {
        const homepage = await getHomepage({ preview });

      /*  console.log(
          'Merged homepage JSON (Contentful + Target on server):',
          homepage
        );*/

        setData(homepage);

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

  if (loading) {
    // Show static blurred hero until consent is granted and content loads
    return (
      <div
        className="loading"
        style={{
          minHeight: '100vh',
          backgroundImage: 'url(/blur%20HP.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-label="Loading"
      />
    );
  }
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
  const rawBg =
    typeof data.backgroundImage === 'string'
      ? data.backgroundImage
      : data.backgroundImage?.fields?.file?.url;
  const bgUrl = normalizeImageUrl(rawBg, 'w=1600&fm=webp');
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
            const rawImage =
              typeof icon.image === 'string'
                ? icon.image
                : icon.image?.fields?.file?.url;
            const imageUrl = normalizeImageUrl(rawImage, 'w=120&fm=webp');
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
                    <img src={imageUrl} alt={icon.title} />
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

export default Home;

