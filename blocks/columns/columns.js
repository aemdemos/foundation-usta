/**
 * Build a YouTube embed URL from any youtube/youtu.be href.
 * @param {string} href source link
 * @returns {string} embeddable /embed/<id> url (preserving query where possible)
 */
function toYouTubeEmbed(href) {
  try {
    const url = new URL(href);
    // already an /embed/ url
    if (url.pathname.startsWith('/embed/')) return url.href;
    let id = '';
    if (url.hostname.includes('youtu.be')) {
      id = url.pathname.slice(1);
    } else {
      id = url.searchParams.get('v') || '';
    }
    if (!id) return href;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return href;
  }
}

/**
 * Replace a bare YouTube link with a responsive 16:9 iframe embed.
 * @param {HTMLAnchorElement} link the authored YouTube link
 * @param {string} [title] accessible title for the iframe (falls back to a default)
 */
function embedVideo(link, title) {
  const src = toYouTubeEmbed(link.href);
  const holder = document.createElement('div');
  holder.className = 'columns-feature-video';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  // Author links carry the raw URL as their text, which is a poor accessible
  // name. Prefer a caption/heading-derived title; never expose the bare URL.
  const linkText = link.textContent.trim();
  const isUrlText = /^https?:\/\//i.test(linkText);
  iframe.title = title || (isUrlText ? '' : linkText) || 'Video';
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  holder.append(iframe);
  const container = link.closest('p') || link;
  container.replaceWith(holder);
}

function decorateFeature(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];
  block.classList.add(`columns-feature-${cells.length}-cols`);
  row.classList.add('columns-feature-row');

  cells.forEach((cell) => {
    const pictures = cell.querySelectorAll('picture');
    const ytLink = [...cell.querySelectorAll('a')].find((a) => /youtube\.com|youtu\.be/.test(a.href));

    // Media-card variant: heading + video + caption inside a grey rounded card
    if (ytLink) {
      cell.classList.add('columns-feature-media');
      // Derive an accessible iframe title from the card's heading or caption
      // so screen readers announce the video meaningfully (not the raw URL).
      const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
      const caption = [...cell.querySelectorAll('p')]
        .map((p) => p.textContent.trim())
        .find((t) => t && !/^https?:\/\//i.test(t) && t !== ytLink.textContent.trim());
      const videoTitle = (heading && heading.textContent.trim()) || caption || 'Video';
      embedVideo(ytLink, videoTitle);
    }

    // Image-collage variant: cell holds two or more stacked images.
    // Source renders these as two small stacked thumbnails PLUS a tall
    // portrait beside them (a decorative background image on the source). We
    // group the thumbnails into a narrow stack and add the portrait next to it.
    if (pictures.length > 1) {
      cell.classList.add('columns-feature-collage');

      // The section heading ("For decades…") is authored as separate
      // default content ABOVE the block (not inside a cell), so the platform
      // centers it full-width like the source — no lifting needed here.

      // Wrap the two thumbnails in their own column. EDS may wrap the pictures
      // in a single shared <p> (when the cell has no other content) or in
      // separate <p>s — grab them by descendant selector so nesting doesn't
      // matter, move each into the stack, then drop the now-empty <p> wrappers.
      const stack = document.createElement('div');
      stack.className = 'columns-feature-collage-stack';
      const cellPictures = [...cell.querySelectorAll('picture')];
      cellPictures.forEach((pic) => stack.append(pic));
      cell.querySelectorAll('p').forEach((p) => { if (!p.textContent.trim() && !p.querySelector('picture, img')) p.remove(); });

      // Tall portrait beside the stack (matches the source collage).
      const portrait = document.createElement('div');
      portrait.className = 'columns-feature-collage-portrait';
      portrait.setAttribute('role', 'img');
      portrait.setAttribute('aria-label', 'USTA Foundation athlete celebrating');

      cell.append(stack);
      cell.append(portrait);
    }

    // Single dedicated image column
    if (pictures.length === 1) {
      const pic = pictures[0];
      const picWrapper = pic.closest('div');
      if (picWrapper && picWrapper.children.length === 1) {
        picWrapper.classList.add('columns-feature-img-col');
      }
    }
  });
}

function decorateStats(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-stats-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-stats-img-col');
        }
      }
    });
  });
}

function decorateDefault(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // Set up image columns. A cell that holds a picture is an image column; its
  // side (left/right) follows the AUTHORED cell order — the CSS lays the row out
  // left-to-right in DOM order, so authoring the image cell first puts the image
  // on the left, second puts it on the right. No per-side class needed.
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (!pic) return;
      col.classList.add('columns-img-col');

      // Keep any caption attached to its image: the source authors the caption
      // as the text paragraph that follows the picture inside the same cell.
      // Wrap image (+ caption) in a <figure>/<figcaption> so it's semantic and
      // the caption tracks the image regardless of which side it's on.
      const caption = [...col.querySelectorAll('p')]
        .find((p) => !p.querySelector('picture') && p.textContent.trim());
      const figure = document.createElement('figure');
      figure.className = 'columns-figure';
      figure.append(pic);
      if (caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.className = 'columns-caption';
        // Move caption content (preserving inline markup / links).
        while (caption.firstChild) figcaption.append(caption.firstChild);
        figure.append(figcaption);
      }
      // Replace the cell's contents (empty <p> wrappers included) with the figure.
      col.replaceChildren(figure);
    });
  });
}

/**
 * loads and decorates the block, dispatching on the variant CSS class.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.classList.contains('feature')) {
    decorateFeature(block);
  } else if (block.classList.contains('stats')) {
    decorateStats(block);
  } else {
    decorateDefault(block);
  }
}
