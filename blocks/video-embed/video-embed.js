/**
 * Build an embeddable YouTube /embed/<id> URL from any youtube/youtu.be href.
 * Preserves an existing /embed/ URL (and its query, e.g. ?origin=…) unchanged.
 * @param {string} href source link
 * @returns {string} embeddable url
 */
function toYouTubeEmbed(href) {
  try {
    const url = new URL(href);
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
 * Consent-gated YouTube embed.
 *
 * Authoring contract (table rows):
 *   Row 1 — the YouTube link (required). Its text becomes the iframe title
 *           unless it is a bare URL, in which case a generic title is used.
 *   Row 2 — (optional) the consent message. Wrap the actionable phrase in a
 *           link (any href) so it becomes the "load video" control; if the
 *           message has no link, a trailing control is appended. If Row 2 is
 *           omitted, the block renders the iframe directly (no gate).
 *
 * The real video URL is held in the iframe's data-src and only swapped into
 * src when the visitor activates the consent control — so nothing loads from
 * YouTube until consent is given.
 *
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const link = block.querySelector('a[href*="youtube.com"], a[href*="youtu.be"]');
  if (!link) return;

  // Derive an accessible iframe title (never expose the bare URL to AT).
  const linkText = link.textContent.trim();
  const title = /^https?:\/\//i.test(linkText) ? 'YouTube video' : linkText || 'YouTube video';

  const src = toYouTubeEmbed(link.href);

  const frame = document.createElement('div');
  frame.className = 'video-embed-frame';

  const iframe = document.createElement('iframe');
  iframe.className = 'video-embed-iframe';
  iframe.dataset.src = src;
  iframe.title = title;
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  frame.append(iframe);

  // The consent message lives in the row that does not hold the video link.
  const messageRow = rows.find((r) => !r.contains(link));

  if (messageRow) {
    const placeholder = document.createElement('div');
    placeholder.className = 'video-embed-placeholder';

    // Move the authored message markup into the placeholder.
    const message = messageRow.querySelector('p') || messageRow.firstElementChild || messageRow;
    placeholder.append(message);

    // Turn the authored actionable link into the load-video control; fall back
    // to appending a control if the author provided plain text only.
    let control = message.querySelector('a');
    if (control) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'video-embed-consent';
      btn.textContent = control.textContent.trim();
      control.replaceWith(btn);
      control = btn;
    } else {
      control = document.createElement('button');
      control.type = 'button';
      control.className = 'video-embed-consent';
      control.textContent = linkText && !/^https?:\/\//i.test(linkText) ? linkText : 'Watch video';
      message.append(' ', control);
    }

    const loadVideo = () => {
      if (!iframe.src) iframe.src = iframe.dataset.src;
      placeholder.remove();
    };
    control.addEventListener('click', loadVideo);

    frame.append(placeholder);
  } else {
    // No gate authored — load immediately.
    iframe.src = src;
  }

  block.textContent = '';
  block.append(frame);
}
