/**
 * social — social share bar (USTA Foundation).
 * Facebook / Twitter / LinkedIn share (window.open share-intent URLs),
 * copy-link (navigator.clipboard) and print (window.print).
 *
 * Authoring: the block is normally empty — decorate() builds all five buttons
 * and shares the CURRENT page. Optionally the author can override the shared
 * URL and title by putting them in the first row (cell 1 = URL, cell 2 = title);
 * this is data-driven so no user-facing string is hard-coded here beyond the
 * accessible labels (which are content, not layout).
 *
 * Icons are inline SVG (no external deps) sized to match the source: a 24px
 * glyph centred in a 48px hit target.
 */

// Inline SVG glyphs (24x24 viewBox). Brand-coloured to match the source bar.
const ICONS = {
  facebook: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M15.9 15.47l.53-3.44h-3.3V9.79c0-.94.46-1.86 1.94-1.86h1.5V5c0-.02-1.36-.23-2.67-.23-2.72 0-4.5 1.65-4.5 4.64v2.62H6.4v3.44h3v8.3a11.98 11.98 0 003.72 0v-8.3z"/></svg>',
  twitter: '<svg viewBox="0 0 32 28" width="24" height="24" aria-hidden="true" focusable="false"><path fill="#1d9bf0" d="M28.7239 6.47314C28.7435 6.75525 28.7435 7.03735 28.7435 7.32206C28.7435 15.9971 22.1393 26.002 10.0635 26.002V25.9968C6.4962 26.002 3.00305 24.9802 0 23.0536C0.518708 23.116 1.04002 23.1472 1.56262 23.1485C4.51887 23.1511 7.39062 22.1592 9.71635 20.3327C6.90701 20.2794 4.44347 18.4476 3.58286 15.7735C4.56697 15.9633 5.58099 15.9243 6.5469 15.6604C3.48405 15.0416 1.28052 12.3505 1.28052 9.22529C1.28052 9.19668 1.28052 9.16938 1.28052 9.14208C2.19313 9.65039 3.21495 9.9325 4.26017 9.9637C1.37542 8.03577 0.486208 4.19811 2.22823 1.19766C5.56149 5.29922 10.4795 7.79266 15.7588 8.05657C15.2297 5.77633 15.9525 3.38689 17.6582 1.78397C20.3024 -0.70167 24.4612 -0.574268 26.9468 2.06867C28.4171 1.77877 29.8264 1.23926 31.116 0.474849C30.6259 1.99457 29.6002 3.28549 28.2299 4.10581C29.5313 3.9524 30.8027 3.604 32 3.07229C31.1186 4.39311 30.0084 5.54363 28.7239 6.47314Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><rect width="24" height="24" rx="2" fill="#0a66c2"/><path fill="#fff" d="M7.2 9.4H4.6V19h2.6V9.4zM5.9 8.3a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM19.4 19h-2.6v-4.9c0-1.17-.42-1.97-1.47-1.97-.8 0-1.28.54-1.49 1.06-.08.19-.1.45-.1.71V19H11.1s.03-8.05 0-8.88h2.64v1.26c.35-.54.97-1.31 2.37-1.31 1.73 0 3.03 1.13 3.03 3.56V19z"/></svg>',
  copy: '<svg viewBox="0 0 34 34" width="24" height="24" aria-hidden="true" focusable="false" fill="none"><path stroke="#000" stroke-linecap="round" d="M18.4154 26.3472L13.8843 30.8873C11.0653 33.7042 6.49697 33.7042 3.67796 30.8873L3.11268 30.322C0.295774 27.503 0.295774 22.9347 3.11268 20.1157L10.4836 12.7492C11.6852 11.5454 13.3162 10.8689 15.0171 10.8689C16.7179 10.8689 18.3489 11.5454 19.5505 12.7492L21.2508 14.4495M18.4154 16.1498L17.8502 15.5846C17.0989 14.833 16.0797 14.4108 15.0171 14.4108C13.9544 14.4108 12.9352 14.833 12.1839 15.5846L5.66314 22.1009C4.46287 23.1954 3.96129 24.8611 4.35758 26.4364C4.75387 28.0117 5.98389 29.2417 7.55919 29.638C9.13448 30.0343 10.8001 29.5327 11.8946 28.3324L15.0104 25.2167M15.5846 7.65276L20.1157 3.11268C22.9347 0.295774 27.503 0.295774 30.322 3.11268L30.8873 3.67796C33.7042 6.49697 33.7042 11.0653 30.8873 13.8843L23.5164 21.2508C22.3148 22.4546 20.6838 23.1311 18.9829 23.1311C17.2821 23.1311 15.6511 22.4546 14.4495 21.2508L12.7492 19.5505M15.5846 17.8502L16.1498 18.4154C16.9011 19.167 17.9203 19.5892 18.9829 19.5892C20.0456 19.5892 21.0648 19.167 21.8161 18.4154L28.3369 11.8991C29.5371 10.8046 30.0387 9.13894 29.6424 7.56364C29.2461 5.98834 28.0161 4.75832 26.4408 4.36203C24.8655 3.96575 23.1999 4.46732 22.1054 5.66759L18.9896 8.78334"/></svg>',
  print: '<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false"><path fill="#6d7278" fill-rule="evenodd" clip-rule="evenodd" d="M32 13.3333V29.3333H0V13.3333H5.33333V0H19.104C21.1547 0 26.6667 6.46933 26.6667 8.04133V13.3333H32ZM24 8.80534C24 7.02134 20.9587 6.81334 19.6667 7.16668C20.2707 6.08267 20.0733 2.66667 18.224 2.66667H8V20H24V8.80534ZM21.3333 16H10.6667V14.6667H21.3333V16ZM21.3333 12H10.6667V13.3333H21.3333V12ZM21.3333 9.33333H10.6667V10.6667H21.3333V9.33333Z"/></svg>',
};

// Accessible labels (content, not layout).
const LABELS = {
  facebook: 'Share via Facebook',
  twitter: 'Share via Twitter',
  linkedin: 'Share via LinkedIn',
  copy: 'Copy link',
  print: 'Show print version',
};

// Build a share-intent URL for the given network.
function shareUrl(network, url, title) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (network) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    default:
      return url;
  }
}

export default function decorate(block) {
  // Optional author override: cell 1 = URL, cell 2 = title.
  const cells = block.querySelectorAll(':scope > div > div');
  const authoredUrl = cells[0]?.textContent.trim();
  const authoredTitle = cells[1]?.textContent.trim();

  block.textContent = '';

  const bar = document.createElement('div');
  bar.className = 'social-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Share this page');

  const getUrl = () => authoredUrl || window.location.href;
  const getTitle = () => authoredTitle || document.title;

  // A live region for the "copied" confirmation (no hard-coded visible text
  // until the action fires; message is set from content-neutral feedback).
  const status = document.createElement('span');
  status.className = 'social-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  ['facebook', 'twitter', 'linkedin', 'copy', 'print'].forEach((network) => {
    const isShare = network === 'facebook' || network === 'twitter' || network === 'linkedin';
    const el = document.createElement(isShare ? 'a' : 'button');
    el.className = `social-btn social-btn--${network}`;
    el.setAttribute('aria-label', LABELS[network]);
    el.title = LABELS[network];
    el.innerHTML = ICONS[network];

    if (isShare) {
      el.href = shareUrl(network, getUrl(), getTitle());
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      // Recompute against the live URL and open a centred share window.
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const href = shareUrl(network, getUrl(), getTitle());
        window.open(href, `share-${network}`, 'noopener,noreferrer,width=600,height=500');
      });
    } else {
      el.type = 'button';
      if (network === 'copy') {
        el.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(getUrl());
            status.textContent = 'Link copied';
            bar.classList.add('social-bar--copied');
            window.clearTimeout(el.dataset.timer);
            el.dataset.timer = window.setTimeout(() => {
              status.textContent = '';
              bar.classList.remove('social-bar--copied');
            }, 2500);
          } catch {
            status.textContent = getUrl();
          }
        });
      } else {
        el.addEventListener('click', () => window.print());
      }
    }

    bar.append(el);
  });

  bar.append(status);
  block.append(bar);
}
