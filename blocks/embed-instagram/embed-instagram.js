/**
 * embed-instagram — Instagram post embed alongside article text (2-column).
 *
 * Authored contract (one row, two cells):
 *   cell 1: a single <a href="https://www.instagram.com/p/{id}/">…</a>
 *           (the permalink to the Instagram post)
 *   cell 2: the article body (paragraphs / headings)
 *
 * We do NOT load Instagram's third-party embeds.js by default (consent + perf).
 * Instead we render a faithful, static "View this post on Instagram" placeholder
 * card. It is a real link (works without JS / keyboard accessible) and, when JS
 * is available, a "Load post" button upgrades it in place to the live
 * blockquote.instagram-media + embeds.js — consent-gated on click.
 */

// Instagram glyph (from the official embed placeholder markup).
const IG_GLYPH = '<svg width="50" height="50" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g fill="#000"><path d="M45.869 10.41c-2.055 0-3.721 1.666-3.721 3.721s1.666 3.721 3.721 3.721 3.721-1.666 3.721-3.721-1.666-3.721-3.721-3.721M30 40.657c-5.886 0-10.658-4.77-10.658-10.657S24.114 19.342 30 19.342 40.658 24.114 40.658 30 35.887 40.657 30 40.657M30 13.886c-8.9 0-16.114 7.214-16.114 16.114S21.1 46.113 30 46.113 46.115 38.899 46.115 30 38.9 13.886 30 13.886M54.378 42.101c-.134 2.921-.622 4.505-1.032 5.562-.543 1.397-1.192 2.394-2.24 3.443-1.048 1.049-2.046 1.697-3.444 2.241-1.055.41-2.641.897-5.56 1.031-3.158.143-4.105.174-12.102.174s-8.944-.031-12.102-.174c-2.919-.134-4.505-.621-5.56-1.031-1.398-.544-2.396-1.192-3.444-2.241-1.048-1.049-1.697-2.046-2.24-3.443-.41-1.057-.899-2.641-1.031-5.562-.144-3.158-.175-4.105-.175-12.101s.031-8.944.175-12.101c.132-2.921.621-4.508 1.031-5.561.543-1.4 1.192-2.396 2.24-3.444 1.048-1.048 2.046-1.698 3.444-2.24 1.055-.41 2.641-.898 5.56-1.031 3.159-.144 4.106-.175 12.102-.175s8.943.031 12.102.175c2.919.133 4.505.621 5.56 1.031 1.398.542 2.396 1.192 3.444 2.24 1.048 1.048 1.697 2.044 2.24 3.444.41 1.053.898 2.64 1.032 5.561.144 3.157.174 4.105.174 12.101s-.03 8.943-.174 12.101M59.82 17.631c-.146-3.193-.653-5.373-1.395-7.282-.766-1.972-1.792-3.647-3.46-5.314-1.668-1.667-3.342-2.693-5.313-3.46-1.909-.741-4.09-1.249-7.283-1.395C39.169.033 38.148 0 30 0S20.831.033 17.631.18c-3.193.146-5.374.654-7.282 1.395-1.973.767-3.646 1.793-5.314 3.46C3.368 6.702 2.342 8.377 1.574 10.349.834 12.258.326 14.438.181 17.631.035 20.831 0 21.851 0 30s.035 9.17.181 12.369c.145 3.193.653 5.374 1.393 7.282.768 1.974 1.794 3.646 3.462 5.314 1.668 1.669 3.341 2.693 5.314 3.46 1.908.742 4.089 1.249 7.282 1.395 3.2.145 4.222.181 12.369.181s9.169-.036 12.369-.181c3.193-.146 5.374-.653 7.283-1.395 1.971-.767 3.645-1.791 5.313-3.46 1.668-1.668 2.694-3.34 3.46-5.314.742-1.908 1.249-4.089 1.395-7.282.146-3.199.18-4.222.18-12.369s-.034-9.169-.18-12.369"/></g></svg>';

function skeletonBar(width, extraStyle = '') {
  const bar = document.createElement('span');
  bar.className = 'embed-instagram-bar';
  bar.style.width = width;
  if (extraStyle) bar.style.cssText += extraStyle;
  return bar;
}

/** Upgrade the placeholder to the live Instagram embed (consent-gated). */
function loadLiveEmbed(cell, permalink) {
  cell.textContent = '';
  const bq = document.createElement('blockquote');
  bq.className = 'instagram-media';
  bq.setAttribute('data-instgrm-captioned', '');
  bq.setAttribute('data-instgrm-permalink', permalink);
  bq.setAttribute('data-instgrm-version', '14');
  cell.append(bq);

  const process = () => {
    if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
  };
  if (window.instgrm && window.instgrm.Embeds) {
    process();
  } else if (!document.getElementById('instagram-embed-script')) {
    const s = document.createElement('script');
    s.id = 'instagram-embed-script';
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    s.addEventListener('load', process);
    document.body.append(s);
  }
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

  // Build the placeholder card (mirrors Instagram's official embed skeleton).
  embedCell.textContent = '';
  const card = document.createElement('div');
  card.className = 'embed-instagram-card';

  const head = document.createElement('div');
  head.className = 'embed-instagram-head';
  const avatar = document.createElement('span');
  avatar.className = 'embed-instagram-avatar';
  const nameLines = document.createElement('span');
  nameLines.className = 'embed-instagram-lines';
  nameLines.append(skeletonBar('100px'), skeletonBar('60px'));
  head.append(avatar, nameLines);

  const glyph = document.createElement('div');
  glyph.className = 'embed-instagram-glyph';
  glyph.innerHTML = IG_GLYPH;

  const cta = document.createElement('a');
  cta.className = 'embed-instagram-cta';
  cta.href = permalink;
  cta.target = '_blank';
  cta.rel = 'noopener noreferrer';
  cta.textContent = 'View this post on Instagram';

  const footer = document.createElement('div');
  footer.className = 'embed-instagram-footer';
  const row1 = document.createElement('span');
  row1.className = 'embed-instagram-caption';
  row1.append(skeletonBar('224px'), skeletonBar('144px'));
  footer.append(row1);

  const loadBtn = document.createElement('button');
  loadBtn.type = 'button';
  loadBtn.className = 'embed-instagram-load';
  loadBtn.textContent = 'Load post';
  loadBtn.addEventListener('click', () => loadLiveEmbed(embedCell, permalink));

  card.append(head, glyph, cta, footer, loadBtn);
  embedCell.append(card);
}
