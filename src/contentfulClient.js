// Fetch homepage data via Netlify Function (Node.js, server-side)
// This function is the single client entrypoint and passes along session/ECID
// so the server can call both Contentful and Adobe Target and merge JSON.
export async function getHomepage({ preview = false } = {}) {
  const url = new URL(window.location.href);
  const qs = new URLSearchParams();
  if (preview) qs.set('preview', 'true');
  qs.set('url', url.toString());

  // Reuse the same session + ECID logic as Target calls so the server
  // has everything it needs.
  const sessionId =
    sessionStorage.getItem('targetSessionId') ||
    (() => {
      const id = `sess-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('targetSessionId', id);
      return id;
    })();

  function getMcvidFromAmcvCookie() {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const amcvCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith('AMCV_'));
    if (!amcvCookie) return null;
    const value = decodeURIComponent(amcvCookie.split('=', 2)[1] || '');
    const parts = value.split('|');
    const midPart = parts.find((p) => p.startsWith('MCMID'));
    if (!midPart) return null;
    const mid = midPart.split('=', 2)[1];
    return mid || null;
  }

  function getMcvidWhenReady(retries = 10, delay = 500) {
    return new Promise((resolve, reject) => {
      function check() {
        let mcvid = localStorage.getItem('mcvid');
        if (mcvid) {
          return resolve(mcvid);
        }
  
        const cookieMid = getMcvidFromAmcvCookie();
        if (cookieMid) {
          localStorage.setItem('mcvid', cookieMid);
          return resolve(cookieMid);
        }
  
        if (retries <= 0) {
          return reject(new Error('mcvid not found'));
        }
  
        retries--;
        setTimeout(check, delay);
      }
  
      check();
    });
  }
  const mcvid = await getMcvidWhenReady();
  
  /*
  if (!mcvid) {
    mcvid = '74489933867880856123472568655649636017';
    localStorage.setItem('mcvid', mcvid);
  }
  */
  

  const res = await fetch(`/.netlify/functions/homepage?${qs.toString()}`, {
    headers: {
      'x-session-id': sessionId,
      'x-mcvid': mcvid,
    },
  });
  if (!res.ok) {
    throw new Error('Homepage fetch failed');
  }
  return res.json();
}