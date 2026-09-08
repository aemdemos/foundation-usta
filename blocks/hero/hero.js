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
 * Hero Error (404) variant — centered "page not found" message with the source's
 * blue line-art bouncing-tennis-ball graphic above a heading and a "back to
 * homepage" CTA (a black pill).
 * Source: https://www.ustafoundation.com/en/home/404.html
 *
 * Authoring model (rows):
 *   row 1 → cell: <h1> heading + a <p><a> CTA link
 * The CTA link is decorated as a pill button; the graphic is prepended here.
 *
 * @param {Element} block the hero block element
 */

// The source renders the illustration as an SVG (tennis-ball-bouncing.svg) — the
// blue line-art of a bouncing ball, NOT a solid green ball. Self-hosted in this
// block's icons/ folder; resolved relative to this module so it loads on any path.
const ERROR_BALL_SRC = new URL('./icons/tennis-ball-bouncing.svg', import.meta.url).href;

function decorateError(block) {
  // Standalone CTA link renders as a filled (pill) button — matches the source.
  block.querySelectorAll('p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.childElementCount === 1 && p.textContent.trim() === a.textContent.trim()) {
      a.classList.add('button');
      p.classList.add('button-container');
    }
  });

  // Prepend the source's bouncing-ball illustration above the heading.
  const cell = block.querySelector(':scope > div > div') || block.firstElementChild;
  if (cell && !cell.querySelector('.hero-error-ball')) {
    const img = document.createElement('img');
    img.className = 'hero-error-ball';
    img.src = ERROR_BALL_SRC;
    img.alt = ''; // decorative — the h1 carries the message
    img.setAttribute('aria-hidden', 'true');
    img.setAttribute('loading', 'lazy');
    img.width = 128;
    img.height = 193;
    cell.prepend(img);
  }
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
 * Hero Text-Up variant — a full-bleed background photo (from the AUTHORED image,
 * NOT baked into CSS) with a TOP-left text panel (white heading + subhead + two
 * CTA buttons) and NO dark overlay. This is the interior-page hero where the
 * text sits at the TOP (who-we-are, what-we-do, get-involved) — as opposed to
 * `banner`, the homepage/our-impact hero whose text is vertically centered and
 * whose photo is a fixed CSS asset dimmed by a 40% overlay.
 *
 * Authoring model (rows):
 *   row 1 → cell: the background <img> (a picture/img alone)
 *   row 2 → cell: <h1> + subhead <p> + one or more CTA <p><a>
 *
 * @param {Element} block the hero block element
 */
function decorateTextUp(block) {
  const rows = [...block.children];

  // Row 1 holds the background image — pull it out and apply it as the block's
  // own background so the text panel can overlay it. The source composites a 40%
  // black overlay (a full-cover rgba(0,0,0,0.4) layer) over the photo to darken
  // it and keep the white text legible — reproduce it as a gradient layered in
  // FRONT of the image so background-size:cover still applies to the photo.
  const imgRow = rows.find((r) => r.querySelector('img'));
  const bgImg = imgRow ? imgRow.querySelector('img') : null;
  if (bgImg && bgImg.src) {
    // The hero photo is a FULL-BLEED background (up to ~1920px wide). The EDS
    // <img> src is the smallest rendition (?width=750), which — stretched to
    // cover the hero — looks soft and washed-out (lighter) vs the source's
    // full-res image. Request a large optimized rendition instead so the photo
    // is sharp and matches the source's tone. Rewrite width= to 2000 (or add it).
    let bgUrl = bgImg.src;
    bgUrl = (/([?&])width=\d+/.test(bgUrl))
      ? bgUrl.replace(/([?&])width=\d+/, '$1width=2000')
      : `${bgUrl}${bgUrl.includes('?') ? '&' : '?'}width=2000&format=webply&optimize=medium`;
    block.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${bgUrl}")`;
    imgRow.remove();
  }

  // Standalone CTA links become buttons (source: two solid blue buttons).
  block.querySelectorAll('p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.childElementCount === 1 && p.textContent.trim() === a.textContent.trim()) {
      a.classList.add('button');
      p.classList.add('button-container');
    }
  });
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.classList.contains('error')) {
    decorateError(block);
  } else if (block.classList.contains('text-up')) {
    decorateTextUp(block);
  } else {
    decorateBanner(block);
  }
}
