// Fetch homepage data via Netlify Function (Node.js, server-side)
// This function is the single client entrypoint and passes along session/ECID
// so the server can call both Contentful and Adobe Target and merge JSON.

// Check if CONSENTMGR cookie exists
function hasConsentCookie() {
  if (typeof document === 'undefined' || !document.cookie) return false;
  return document.cookie
    .split('; ')
    .some((c) => c.trim().startsWith('CONSENTMGR='));
}

// Wait for CONSENTMGR cookie to be set before proceeding
function waitForConsentCookie(maxWaitTime = 30000) {
  return new Promise((resolve) => {
    // Check immediately first
    if (hasConsentCookie()) {
      resolve();
      return;
    }

    // Poll for the cookie
    const startTime = Date.now();
    const pollInterval = 100; // Check every 100ms

    const pollTimer = setInterval(() => {
      if (hasConsentCookie()) {
        clearInterval(pollTimer);
        resolve();
      } else if (Date.now() - startTime >= maxWaitTime) {
        // Timeout after maxWaitTime (default 30 seconds)
        clearInterval(pollTimer);
        console.warn('Consent cookie (CONSENTMGR) not found within timeout period. Proceeding anyway.');
        resolve(); // Resolve anyway to prevent indefinite blocking
      }
    }, pollInterval);
  });
}

export async function getHomepage({ preview = false } = {}) {
  // Wait for consent cookie before proceeding
  await waitForConsentCookie();

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

  // ALWAYS check cookie first (Web SDK is source of truth)
  let mcvid = getMcvidFromAmcvCookie();

  // Only use localStorage if cookie isn't available yet
  if (!mcvid) {
    mcvid = localStorage.getItem('mcvid');
  }

  // Fallback only if neither exists
  if (!mcvid) {
    mcvid = '74489933867880856123472568655649636017';
  }

  // Always update localStorage with current value (whether from cookie or fallback)
  localStorage.setItem('mcvid', mcvid);

  const res = await fetch(`/.netlify/functions/homepage?${qs.toString()}`, {
    credentials: 'include', // Include cookies (CONSENTMGR) in the request
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