/**
 * embed-instagram — Instagram post embed alongside article text (2-column).
 *
 * Authored contract (one row, two cells):
 *   cell 1: a single <a href="https://www.instagram.com/p/{id}/">…</a>
 *           (the permalink to the Instagram post)
 *   cell 2: the article body (paragraphs / headings)
 *
 * Parity with the source (www.ustafoundation.com news pages): the source renders
 * the REAL Instagram embed automatically via Instagram's official embed.js — the
 * full card (profile header, carousel image, likes, caption). We reproduce that:
 * on decoration we emit `blockquote.instagram-media` and load embed.js, which
 * replaces it in place with the live iframe. No consent gate / "Load post" button.
 * The blockquote carries a plain <a> fallback so the link still works if the
 * third-party script is blocked or slow.
 */

/** Load Instagram's official embed script once, then process pending embeds. */
function loadEmbedScript() {
  const process = () => {
    if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
  };
  if (window.instgrm && window.instgrm.Embeds) {
    process();
    return;
  }
  let script = document.getElementById('instagram-embed-script');
  if (!script) {
    script = document.createElement('script');
    script.id = 'instagram-embed-script';
    script.async = true;
    script.src = 'https://www.instagram.com/embed.js';
    document.body.append(script);
  }
  script.addEventListener('load', process);
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];
  const embedCell = cells[0];
  const textCell = cells[1];

  if (textCell) textCell.classList.add('embed-instagram-text');

  if (!embedCell) return;
  embedCell.classList.add('embed-instagram-embed');

  // Pull the permalink from the authored link; validate it is Instagram.
  const link = embedCell.querySelector('a[href]');
  let permalink = link ? link.getAttribute('href') : '';
  try {
    const u = new URL(permalink, window.location.href);
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) permalink = '';
    else permalink = u.href;
  } catch {
    permalink = '';
  }
  if (!permalink) return; // leave authored content untouched if no valid link

  // Emit the official Instagram embed blockquote. embed.js swaps it for the live
  // iframe; until then (or if blocked) the inner <a> keeps the link working.
  embedCell.textContent = '';
  const bq = document.createElement('blockquote');
  bq.className = 'instagram-media';
  bq.setAttribute('data-instgrm-captioned', '');
  bq.setAttribute('data-instgrm-permalink', permalink);
  bq.setAttribute('data-instgrm-version', '14');

  const fallback = document.createElement('a');
  fallback.href = permalink;
  fallback.target = '_blank';
  fallback.rel = 'noopener noreferrer';
  fallback.textContent = 'View this post on Instagram';
  bq.append(fallback);

  embedCell.append(bq);

  // embed.js replaces the blockquote with an <iframe> that has no accessible
  // name — add a title when it appears (axe frame-title). The iframe content is
  // cross-origin, so any violations inside it are Instagram's, not ours.
  const observer = new MutationObserver(() => {
    const iframe = embedCell.querySelector('iframe.instagram-media');
    if (iframe && !iframe.title) {
      iframe.title = 'Instagram post';
      observer.disconnect();
    }
  });
  observer.observe(embedCell, { childList: true, subtree: true });

  loadEmbedScript();
}
