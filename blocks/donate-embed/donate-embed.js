/*
 * donate-embed — native FundraiseUp INLINE EMBED for a donation form.
 *
 * WHY A BLOCK (not a plain link): the source hydrates its inline donation form
 * from a hidden anchor `<a href="#<ElementID>">` that the FundraiseUp loader
 * (scripts/donate.js, loaded site-wide) scans for and replaces in place with the
 * live donation iframe. Authoring that anchor directly in content does NOT
 * survive the publishing pipeline — a FRAGMENT-only href (`#XJYDXZPC`) is
 * stripped down to `/` (the same way a query-only `?form=` href is — see
 * donate.js). So the widget never finds its element ID and the form never
 * appears. This block instead carries the FundraiseUp element ID as plain TEXT
 * (which survives publishing) and re-creates the `#<ElementID>` anchor at
 * decorate time — before the delayed-phase FRU loader runs — so the widget
 * hydrates it exactly as on the source.
 *
 * Authoring contract — a single cell holding the FundraiseUp element ID:
 *   | Donate Embed |
 *   | XJYDXZPC     |
 * (An author may paste the full source snippet or a `#XJYDXZPC` link; we extract
 * the trailing identifier either way.)
 */

import { loadFundraiseUp } from '../../scripts/donate.js';

/** Pull the FundraiseUp element ID out of whatever the author entered. */
function extractElementId(block) {
  // Prefer an authored anchor's href fragment if the pipeline left one intact…
  const anchor = block.querySelector('a[href*="#"]');
  const fromHref = anchor && anchor.getAttribute('href');
  const hashId = fromHref && fromHref.includes('#') ? fromHref.split('#').pop() : '';
  // …otherwise the plain text of the block (e.g. "XJYDXZPC" or "#XJYDXZPC").
  const text = (block.textContent || '').trim();
  const raw = hashId || text;
  // FundraiseUp element IDs are short uppercase alphanumerics — keep only those
  // chars so stray whitespace/markup can't leak into the anchor href.
  const match = raw.match(/[A-Za-z0-9]{4,}/);
  return match ? match[0] : '';
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const id = extractElementId(block);
  block.textContent = '';
  if (!id) return; // nothing to hydrate — leave an empty (harmless) block

  // Re-create the source's inline-embed placeholder. FundraiseUp scans for an
  // <a href="#<ElementID>"> and replaces it with the donation iframe. The anchor
  // is hidden (the widget swaps it out); we keep descriptive text for a11y in
  // the brief window before hydration and if the widget is unavailable.
  const anchor = document.createElement('a');
  anchor.href = `#${id}`;
  anchor.className = 'donate-embed-anchor';
  anchor.textContent = 'Donate';
  block.append(anchor);

  // Load the FundraiseUp widget EAGERLY. The donation form is this page's
  // primary content, so we don't wait for the delayed phase (scripts.js loads
  // donate.js ~3s in for perf on OTHER pages) — here the block itself kicks the
  // loader now so the form hydrates as soon as possible. loadFundraiseUp() is
  // idempotent, so the delayed-phase call later is a harmless no-op.
  loadFundraiseUp();
}
