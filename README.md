# Arena Contentful

React app that reads a Contentful-powered homepage (Hero, Features, Stats, Testimonials, FAQ, Logos, CTA, Footer).

## Quick start

1) Install deps
```
npm install
```

2) Create `.env` in this folder with your Contentful credentials:
```
REACT_APP_CONTENTFUL_SPACE_ID=your_space_id
REACT_APP_CONTENTFUL_ENV=master
REACT_APP_CONTENTFUL_CDA_TOKEN=your_delivery_token
REACT_APP_CONTENTFUL_CPA_TOKEN=your_preview_token_optional
```

- CDA token = Content Delivery API (public/published content)
- CPA token = Content Preview API (draft/preview). Add `?preview` to the URL to use it.

3) Run dev server
```
npm start
```
Open http://localhost:3000.

## Contentful data

- One-time bootstrap scripts live in `migrations/` and `scripts/seed-contentful.js`. They are not part of the app runtime.
- Ensure your Homepage entry links all required sections (hero, featuresSection, stats, testimonialsSection, faqSection, logosSection, ctaSection, footer) and that entries are published in the same environment (`master` by default).

## Notes

- If sections are missing or unpublished, the UI will show a placeholder message for that section.
- Restart `npm start` after changing `.env`.
