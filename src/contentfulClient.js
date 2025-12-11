// Fetch homepage data via Netlify Function (Node.js, server-side)
export async function getHomepage({ preview = false } = {}) {
  const qs = preview ? '?preview=true' : '';
  const res = await fetch(`/.netlify/functions/homepage${qs}`);
  if (!res.ok) {
    throw new Error('Homepage fetch failed');
  }
  return res.json();
}