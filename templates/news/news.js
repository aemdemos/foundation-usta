/*
 * news template JS. The article layout (headline, body copy, media-right image,
 * social share bar, related articles) is driven by content blocks + the
 * template CSS (news.css), so no decoration is required here by default.
 *
 * This hook exists for behaviour that is genuinely template-wide (not block- or
 * content-specific) — e.g. reading-progress, article schema/JSON-LD, or share
 * URL wiring. Kept as a no-op until such a need is confirmed, so the template
 * ships zero unnecessary JS.
 *
 * @param {Element} main the page's <main> element
 */
export default async function decorate(main) {
  // Intentionally empty — see comment above.
  // eslint-disable-next-line no-unused-expressions
  main;
}
