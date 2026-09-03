/**
 * A11y test configuration.
 *
 * wcagTags — axe-core rule tags to test against (WCAG 2.0–2.2 Level A + AA).
 * failOnImpact — violation impact levels that cause a non-zero exit (fail the build).
 *   moderate/minor are logged as warnings but never fail.
 * excludeSelectors — CSS selectors dropped from every scan. Use ONLY for
 *   third-party embeds whose internal DOM we don't author and can't fix
 *   (e.g. the YouTube player iframe). We still cover our own wrapper markup.
 * disabledRules — axe rule IDs to switch off, with a documented rationale.
 *   Use sparingly and only for deliberate, signed-off exceptions.
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
  // Third-party embeds we can't remediate (their DOM is not authored by us).
  excludeSelectors: [
    'iframe[src*="youtube.com"]',
    'iframe[src*="youtube-nocookie.com"]',
    'iframe[src*="youtu.be"]',
    'iframe[src*="player.vimeo.com"]',
  ],
  // Deliberate exceptions — each needs a rationale and sign-off.
  disabledRules: {
    // Lift-and-shift parity: the CTA/nav/footer palette (brand blue #0357b8,
    // brand orange) is reproduced exactly from the live ustafoundation.com to
    // preserve the brand. Some pairings fall just under WCAG AA 4.5:1. Kept for
    // visual parity by product decision; revisit as a separate brand-a11y task.
    'color-contrast': false,
  },
  urls: [
    '/',
    '/en/home',
    // Add real pages/templates here as they land, e.g.:
    // '/products', '/about', '/contact'
  ],
};
