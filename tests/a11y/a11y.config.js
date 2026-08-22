/**
 * A11y test configuration.
 *
 * wcagTags — axe-core rule tags to test against (WCAG 2.0–2.2 Level A + AA).
 * failOnImpact — violation impact levels that cause a non-zero exit (fail the build).
 *   moderate/minor are logged as warnings but never fail.
 * urls — the pages swept by the full-site audit (`npm run test:a11y:all`),
 *   combined with A11Y_BASE_URL (default http://localhost:3000).
 *   This is the coverage list — KEEP IT CURRENT: add one entry per unique page
 *   and per unique page template as the site grows. A page not listed here is
 *   never covered by the sweep. (Single-page runs use `npm run test:a11y <url>`
 *   and ignore this list.)
 */
export default {
  wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  failOnImpact: ['critical', 'serious'],
  urls: [
    '/',
    // Add real pages/templates here as they land, e.g.:
    // '/products', '/about', '/contact'
  ],
};
