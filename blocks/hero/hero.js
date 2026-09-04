/**
 * Hero block — consolidated base block that dispatches on a variant class.
 *
 * Variants:
 *   • banner (default/primary) → full-bleed background photo hero (live homepage).
 *   • error                    → 404 "page not found" hero.
 *
 * @param {Element} block the hero block element
 */

/**
 * Hero Error (404) variant — centered "page not found" message with a
 * bouncing tennis-ball graphic above a heading and a "back to homepage" CTA.
 * Source: https://www.ustafoundation.com/en/home/404.html
 *
 * Authoring model (rows):
 *   row 1 → cell: <h1> heading + a <p><a> CTA link
 * The CTA link is decorated as a filled button.
 *
 * @param {Element} block the hero block element
 */
function decorateError(block) {
  // Standalone CTA link renders as a filled button (matches the source CTA).
  block.querySelectorAll('p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.childElementCount === 1 && p.textContent.trim() === a.textContent.trim()) {
      a.classList.add('button');
      p.classList.add('button-container');
    }
  });
}

/**
 * Hero Banner variant — full-bleed background photo + dark overlay + overlaid
 * white text. This is the live homepage hero.
 *
 * @param {Element} block the hero block element
 */
function decorateBanner(block) {
  // Standalone CTA link (last <p><a>) renders as a button.
  block.querySelectorAll('p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.childElementCount === 1 && p.textContent.trim() === a.textContent.trim()) {
      a.classList.add('button');
      p.classList.add('button-container');
    }
  });

  // Reproduce the SOURCE heading's line-break. The source h1 binds the last
  // clause with a non-breaking space ("...Through[NBSP]Tennis & Education"), so
  // the browser cannot break between "Through" and "Tennis" and instead breaks
  // earlier (after "Lives"):
  //   Transforming Lives
  //   Through Tennis & Education
  // Our migrated content lost that bind, so ours wrapped a word later. Re-insert
  // a non-breaking space (U+00A0) before the last three words to bind
  // "Through Tennis" exactly as the source does.
  const NBSP = String.fromCharCode(160); // U+00A0 non-breaking space
  const h1 = block.querySelector('h1');
  if (h1 && h1.textContent.trim() && !h1.dataset.nbspBound) {
    const words = h1.textContent.trim().split(/\s+/);
    if (words.length >= 4) {
      const head = words.slice(0, -3).join(' '); // "Transforming Lives Through"
      const tail = words.slice(-3).join(' '); // "Tennis & Education"
      h1.textContent = `${head}${NBSP}${tail}`;
      h1.dataset.nbspBound = 'true';
    }
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.classList.contains('error')) {
    decorateError(block);
  } else {
    decorateBanner(block);
  }
}
