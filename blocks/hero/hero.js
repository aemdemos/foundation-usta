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
// blue line-art of a bouncing ball, NOT a solid green ball. Self-hosted in the
// single repo-wide icons/ folder at the root; resolved via codeBasePath so it
// loads on any deploy path.
const ERROR_BALL_SRC = `${window.hlx?.codeBasePath || ''}/icons/tennis-ball-bouncing.svg`;

/**
 * Pick a full-bleed hero rendition width sized to the actual viewport, not a flat
 * 2000px. The hero photo spans the viewport width, so we need ≈ viewportWidth ×
 * DPR — a 2000px image on a 360px phone (LCP element) is the main mobile penalty.
 * Snap to a few sensible buckets so the CDN caches them; cap at 2000 (desktop).
 */
function heroRenditionWidth() {
  const needed = Math.round(window.innerWidth * (window.devicePixelRatio || 1));
  const buckets = [750, 1000, 1600, 2000];
  return buckets.find((w) => w >= needed) || 2000;
}

/** Set/replace the width= param on an EDS rendition URL (adds webp+optimize if absent). */
function heroBgUrlAt(src, width) {
  return (/([?&])width=\d+/.test(src))
    ? src.replace(/([?&])width=\d+/, `$1width=${width}`)
    : `${src}${src.includes('?') ? '&' : '?'}width=${width}&format=webply&optimize=medium`;
}

/**
 * The hero photo is the page's LCP element but it's applied as a CSS background
 * (set by this JS), so the browser can't discover it from the initial HTML and
 * fetches it late — hurting LCP. Add a high-priority <link rel="preload"> so the
 * browser starts the download immediately, in parallel with the eager CSS/JS.
 * The URL is derived from the AUTHORED image (still fully content-managed — swap
 * the authored image and this points at the new one). Only preloaded once, and
 * only for a top-of-page hero (skip if the block isn't in the first viewport).
 * @param {string} href the (large) rendition URL used for the background
 */
function preloadHeroImage(href) {
  if (!href || document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}

/**
 * The hero photo is applied as a CSS background (a background image can carry no
 * `alt`), so expose the AUTHORED image's alt to assistive tech via a dedicated,
 * empty child element with `role="img"` + `aria-label`. It must be a SEPARATE
 * element (not the block itself): the block also contains the heading and CTA
 * links, and putting `role="img"` on a container that holds interactive controls
 * trips axe's `nested-interactive` rule. The label element carries no interactive
 * content and is hidden visually (see .hero-a11y-img in hero.css). If the author
 * left the alt empty, the photo stays decorative (no label) — the correct default.
 * @param {Element} block the hero block
 * @param {HTMLImageElement} img the authored image whose alt supplies the label
 */
function labelBackground(block, img) {
  const label = (img.getAttribute('alt') || '').trim();
  if (!label || block.querySelector(':scope > .hero-a11y-img')) return;
  const span = document.createElement('span');
  span.className = 'hero-a11y-img';
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', label);
  block.prepend(span);
}

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
  // AUTHORED background image (row 1 = a lone <img>/<picture>). EVERY banner photo
  // is author-managed via content — nothing is baked into CSS. Pull the image out
  // and set it as the block's inline background UNDER a 40% black overlay gradient
  // (so background-size:cover still applies), which overrides the CSS overlay-only
  // default. Request a large rendition (the smallest EDS rendition looks washed-out
  // stretched full-bleed — same fix as text-up). If no image is authored, the CSS
  // fallback keeps the overlay tint on a neutral brand background (legible text).
  const rows = [...block.children];
  const imgRow = rows.find((r) => r.querySelector('img') && !r.querySelector('h1, h2, h3, p'));
  const bgImg = imgRow ? imgRow.querySelector('img') : null;
  if (bgImg && bgImg.src) {
    // Size the full-bleed rendition to the viewport (mobile gets a small one, not
    // a flat 2000px) — this is the LCP element, and the oversized image was the
    // main mobile LCP penalty.
    const bgUrl = heroBgUrlAt(bgImg.src, heroRenditionWidth());
    block.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${bgUrl}")`;
    preloadHeroImage(bgUrl); // LCP: discover the background photo early
    labelBackground(block, bgImg);
    imgRow.remove();
  }

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
    // The hero photo is a FULL-BLEED background. Size the rendition to the
    // viewport (mobile gets a small one, not a flat 2000px) — it's the LCP
    // element; the smallest EDS default (?width=750) alone looks washed-out
    // stretched full-bleed on desktop, so heroRenditionWidth() scales up there.
    const bgUrl = heroBgUrlAt(bgImg.src, heroRenditionWidth());
    block.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${bgUrl}")`;
    preloadHeroImage(bgUrl); // LCP: discover the background photo early
    labelBackground(block, bgImg);
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
