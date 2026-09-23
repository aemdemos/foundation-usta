/**
 * Cap the rendition width requested by a <picture>'s <source>/<img> URLs.
 * EDS's createOptimizedPicture emits width=2000 (+750) for EVERY content image,
 * but the collage thumbnails/portrait display at only ~266–296px — so the 2000px
 * renditions are ~10× oversized (the Lighthouse "improve image delivery" flag).
 * Rewrite any `width=<n>` above `maxWidth` down to `maxWidth` (a 2× cap over the
 * largest display size); smaller renditions are left alone.
 * @param {Element} picture the <picture> element
 * @param {number} maxWidth largest rendition width to allow (≈ 2× display px)
 */
function capPictureWidth(picture, maxWidth) {
  if (!picture) return;
  const cap = (url) => url.replace(/([?&]width=)(\d+)/g, (m, p, n) => (Number(n) > maxWidth ? `${p}${maxWidth}` : m));
  picture.querySelectorAll('source').forEach((s) => {
    const ss = s.getAttribute('srcset');
    if (ss) s.setAttribute('srcset', cap(ss));
  });
  const img = picture.querySelector('img');
  if (img && img.getAttribute('src')) img.setAttribute('src', cap(img.getAttribute('src')));
}

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

/** Extract the YouTube video id from any youtube/youtu.be/embed URL. */
function youTubeId(href) {
  try {
    const url = new URL(href);
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/embed/')[1].split('/')[0];
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0];
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

/**
 * Build the real YouTube iframe (used only after the user clicks the facade).
 */
function buildVideoIframe(src, title) {
  const iframe = document.createElement('iframe');
  iframe.src = /[?&]autoplay=/.test(src) ? src : `${src}${src.includes('?') ? '&' : '?'}autoplay=1`;
  iframe.title = title || 'Video';
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  return iframe;
}

/**
 * Replace a bare YouTube link with a lightweight click-to-load FACADE instead of
 * an eager iframe: a poster image (YouTube thumbnail) + a play button. The heavy
 * YouTube player scripts (~hundreds of KiB, the bulk of the page's "unused JS")
 * load ONLY when the user actually clicks play. This is the EDS-recommended
 * pattern for third-party video embeds and keeps the initial page lean.
 * @param {HTMLAnchorElement} link the authored YouTube link
 * @param {string} [title] accessible title (from caption/heading, never the URL)
 */
function embedVideo(link, title) {
  const src = toYouTubeEmbed(link.href);
  const id = youTubeId(link.href);
  const linkText = link.textContent.trim();
  const isUrlText = /^https?:\/\//i.test(linkText);
  const label = title || (isUrlText ? '' : linkText) || 'Video';

  const holder = document.createElement('div');
  holder.className = 'columns-feature-video';

  // Facade = a button (keyboard-accessible) with the poster as its background +
  // a play glyph. YouTube's hqdefault thumbnail is a small, cacheable image.
  const facade = document.createElement('button');
  facade.type = 'button';
  facade.className = 'columns-feature-video-facade';
  facade.setAttribute('aria-label', `Play video: ${label}`);
  if (id) {
    const poster = document.createElement('img');
    poster.className = 'columns-feature-video-poster';
    poster.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    poster.alt = '';
    poster.loading = 'lazy';
    facade.append(poster);
  }
  const play = document.createElement('span');
  play.className = 'columns-feature-video-play';
  play.setAttribute('aria-hidden', 'true');
  facade.append(play);

  const activate = () => {
    const iframe = buildVideoIframe(src, label);
    holder.replaceChildren(iframe);
    iframe.focus?.();
  };
  facade.addEventListener('click', activate);

  holder.append(facade);
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
    // Source renders these as two small stacked thumbnails PLUS a tall portrait
    // beside them. ALL images are AUTHORED (no image baked into CSS): the first
    // two pictures become the thumbnail stack; the LAST picture becomes the tall
    // portrait beside it. (Authoring contract: 3 images in the cell → stack of
    // the first two + portrait from the third.)
    if (pictures.length > 1) {
      cell.classList.add('columns-feature-collage');

      // The section heading ("For decades…") is authored as separate
      // default content ABOVE the block (not inside a cell), so the platform
      // centers it full-width like the source — no lifting needed here.

      // Grab the pictures by descendant selector (EDS may wrap them in one shared
      // <p> or in separate <p>s).
      const cellPictures = [...cell.querySelectorAll('picture')];

      // Last authored image = the tall portrait; the rest = the thumbnail stack.
      const portraitPic = cellPictures.length > 2 ? cellPictures.pop() : null;

      const stack = document.createElement('div');
      stack.className = 'columns-feature-collage-stack';
      // Thumbnails display at most ~266px (tablet 164, desktop 266) → cap the
      // rendition at 600px (2× for retina) instead of the default 2000px.
      cellPictures.forEach((pic) => { capPictureWidth(pic, 600); stack.append(pic); });
      cell.append(stack);

      // Tall portrait beside the stack — from the authored image (matches the
      // source collage). Its alt text comes from the authored <img>. Displays at
      // most ~296px wide (tablet 353) → cap the rendition at 750px (2×).
      if (portraitPic) {
        capPictureWidth(portraitPic, 750);
        const portrait = document.createElement('div');
        portrait.className = 'columns-feature-collage-portrait';
        portrait.append(portraitPic);
        cell.append(portrait);
      }

      // Drop stray empty <p> wrappers AFTER moving the pictures out. Must run last:
      // the source wraps each <picture> in its own <p>, so removing empties before
      // the move would skip them (they still held a <picture>); left in, they sit
      // as extra flex children in the collage row and steal ~45px of width from the
      // stack+portrait (thumbnails render 245 not 266). Now they're truly empty.
      cell.querySelectorAll(':scope > p').forEach((p) => {
        if (!p.textContent.trim() && !p.querySelector('picture, img')) p.remove();
      });
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
