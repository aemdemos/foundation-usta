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

export default function decorate(block) {
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
      // unwrap pictures from their auto-generated <p> wrappers
      pictures.forEach((pic) => {
        const p = pic.closest('p');
        if (p && p.children.length === 1) p.replaceWith(pic);
      });

      // Lift the section heading out of the cell BEFORE regrouping the images,
      // so the title bar still gets it (see the block-level step below).
      const cellHeading = cell.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4');
      if (cellHeading) block.prepend(cellHeading);

      // Wrap the stacked thumbnails in their own column.
      const stack = document.createElement('div');
      stack.className = 'columns-feature-collage-stack';
      cell.querySelectorAll(':scope > picture').forEach((pic) => stack.append(pic));

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

  // For the collage variant the source shows the heading full-width and
  // centered above both columns. The heading was prepended to the block above;
  // wrap it in the title bar here.
  const collage = block.querySelector('.columns-feature-collage');
  if (collage) {
    const heading = block.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
    if (heading) {
      const titleWrap = document.createElement('div');
      titleWrap.className = 'columns-feature-title';
      heading.replaceWith(titleWrap);
      titleWrap.append(heading);
    }
  }
}
