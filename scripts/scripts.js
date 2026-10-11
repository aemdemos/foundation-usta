import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  createOptimizedPicture,
  readBlockConfig,
  toClassName,
  toCamelCase,
  getMetadata,
} from './aem.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * Preload the condensed display font (Graphik XXCond Bold) used by h1/h2 at up to
 * 100px. It's the LCP headline face and an ultra-condensed cut, so a fallback
 * swap reflows the whole page (large CLS). Preloading the tiny (~24KB) woff2 in
 * the eager phase makes the real font available at/near first paint, so the H1
 * paints in its final metrics — eliminating the swap-driven shift.
 */
function preloadDisplayFont() {
  const href = `${window.hlx.codeBasePath}/fonts/graphik-xxcond-bold.woff2`;
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);

  // Also declare the @font-face INLINE now. fonts.css loads lazily on mobile, so
  // without this the browser wouldn't know the display face early and the H1 would
  // render in the wide fallback. Declaring it here (eager) + the preload above
  // means the real condensed font is known AND fetched immediately, so with
  // `font-display: block` the H1 ALWAYS paints in Graphik XXCond Bold from the
  // start on every viewport — never the fallback. (Matches the rule in fonts.css;
  // identical family/src/display, so harmless if both apply.)
  const style = document.createElement('style');
  style.textContent = `@font-face{font-family:'Graphik XXCond Bold';font-style:normal;font-weight:700;font-display:block;src:url('${href}') format('woff2')}`;
  document.head.appendChild(style);
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/** EDS media-bus image (`…/media_<hash>.<ext>`) — the only images the CDN can resize. */
const EDS_MEDIA_PATH = /\/media_[0-9a-f]{10,}\.(jpe?g|png|gif|webp)$/i;
const EDS_HOSTS = /\.(aem|hlx)\.(page|live)$/i;

/**
 * Turns a pasted EDS image URL into an optimized, responsive <picture>, so authors can
 * drop an asset link (e.g. https://main--…aem.live/assets/media/media_<hash>.jpg) into
 * any page or block cell and get a rendered image (webp + width renditions) instead of
 * a text link. Only STANDALONE links whose label is the URL itself are converted;
 * labelled links ("Download photo") and links inside a sentence stay links. Runs before
 * block decoration, so blocks (hero, cards, columns…) receive a normal <picture>.
 * Alt text comes from the link's title (empty = decorative).
 * @param {Element} main The container element
 */
function buildImageLinks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    const text = a.textContent.trim();
    if (text && !/^(https?:\/\/|\.{0,2}\/)/i.test(text)) return;
    let url;
    try {
      url = new URL(a.getAttribute('href'), window.location.href);
    } catch {
      return;
    }
    const knownHost = url.origin === window.location.origin || EDS_HOSTS.test(url.hostname);
    if (!knownHost || !EDS_MEDIA_PATH.test(url.pathname)) return;

    const container = a.closest('p') || a.parentElement;
    if (container.textContent.trim() !== text || container.querySelectorAll('a').length > 1) return;

    const picture = createOptimizedPicture(url.href, a.title || '', false, [
      { media: '(min-width: 768px)', width: '2000' },
      { width: '750' },
    ]);
    // replace the link together with any bold/italic wrapper inside its paragraph
    let outer = a;
    while (outer.parentElement !== container && outer.parentElement) outer = outer.parentElement;
    outer.replaceWith(picture);
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildImageLinks(main);
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Extra mark on a bold + italic standalone link → cta-button style class
 * (styles/foundation-buttons.css).
 */
const CTA_BUTTON_STYLES = {
  sub: 'cta-blue',
  sup: 'cta-black',
  u: 'cta-outline', // underline
};

// Bold ONLY (no italic) + superscript → the dark CTA. (Not strikethrough: the DA
// editor stores a pasted <del> as literal "<del>" text.)
const CTA_BOLD_ONLY_STYLES = {
  sup: 'cta-dark',
};

/** `style=` values of the authored link options → cta-button style class. */
const CTA_OPTION_STYLES = {
  blue: 'cta-blue',
  black: 'cta-black',
  dark: 'cta-dark',
  outline: 'cta-outline',
  // www.usta.com fixed designs (styles/usta-buttons.css, loaded only when used);
  // the usta.com button-core designs are named from words, see ustaStyleClasses()
  'usta-classic': 'cta-usta-classic',
  'usta-classic-outline': 'cta-usta-classic cta-usta-classic-ghost',
  'usta-header-join': 'cta-usta-join',
  'usta-header-signin': 'cta-usta-signin',
};

// usta.com button-core: `style="usta-<words>"` says how the button looks, e.g.
// usta-pill, usta-pill-wide, usta-outline-medium-wide, usta-square-small-column.
// Each word → the usta.com modifier class(es); any order, each word at most once.
const USTA_WORDS = {
  // look (pill = the default black rounded button)
  pill: [],
  outline: ['cta-usta-ghost'],
  square: ['cta-usta-rect'],
  app: ['cta-usta-app'],
  // size: default 56px tall + 18px text
  medium: ['cta-usta-h40'], // 40px, 18px text
  small: ['cta-usta-h40', 'cta-usta-fs-small'], // 40px, 14px text
  mini: ['cta-usta-h24', 'cta-usta-fs-small'], // 24px, 14px text
  compact: ['cta-usta-fs-small'], // 56px, 14px text
  // width: default = fits the label (min 120px; full width up to 280px on phones)
  wide: ['cta-usta-w-large'], // min 280px
  narrow: ['cta-usta-w-small'], // max 170px
  column: ['cta-usta-w-full'], // fills its column (usta.com's 3-of-12 grid column in default content)
  padded: ['cta-usta-pad-50'], // 50px side padding
  disabled: ['cta-usta-disabled'],
};

/**
 * The classes for a `style=` value: a fixed style (CTA_OPTION_STYLES) or a
 * usta.com button-core design named from USTA_WORDS (`usta-pill-wide`).
 * @param {string} style the authored style
 * @returns {string} the cta style classes, or '' when unknown
 */
function ctaStyleClasses(style) {
  const s = (style || '').trim().toLowerCase();
  if (CTA_OPTION_STYLES[s]) return CTA_OPTION_STYLES[s];
  const words = s.startsWith('usta-') ? s.slice(5).split('-') : [];
  if (!words.length || !words.every((w) => USTA_WORDS[w]) || new Set(words).size !== words.length) return '';
  return ['cta-usta', ...words.flatMap((w) => USTA_WORDS[w])].join(' ');
}

// the usta.com button-core icons self-hosted in /icons/usta/ (icon="<name>" or `:name:`)
const USTA_ICONS = new Set(['add', 'alarm', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'attachment',
  'award', 'bookmark', 'calendar', 'cancel', 'check', 'chevron-back', 'chevron-down', 'chevron-forward',
  'chevron-up', 'clock', 'cloud', 'comment', 'computer', 'edit', 'envelope', 'facebook', 'flag', 'folder', 'globe',
  'globe-primary', 'globe-primary-cut', 'google-plus', 'hamburger', 'home', 'info', 'instagram', 'invite', 'like',
  'link', 'linkedin', 'live-chat', 'location', 'location-search', 'lock', 'logout', 'megaphone', 'mic', 'mobile',
  'more-info', 'more-options', 'navigation', 'notification', 'overflow', 'pagination-left', 'pagination-right',
  'pause', 'phone', 'pinterest', 'play', 'pop-out', 'printer', 'profile', 'refresh', 'screen-exit-full',
  'screen-full', 'search', 'settings', 'share', 'star', 'success', 'sync', 'tip', 'tennis-ball', 'trash',
  'triangle-down', 'triangle-left', 'triangle-right', 'triangle-up', 'twitter', 'view', 'vimeo', 'visibility-off',
  'volume-default', 'volume-mute', 'warning', 'web', 'wifi', 'youtube']);
// friendlier names authors may type (`:download:`, `:external-link:`)
const USTA_ICON_ALIASES = {
  download: 'arrow-down', external: 'pop-out', 'external-link': 'pop-out', 'open-in-new': 'pop-out',
};
// a literal `:name:` left as text in a link label (start, end or between spaces)
const USTA_ICON_TEXT = /(^|\s):([a-z0-9-]+):(?=\s|$)/i;
let ustaButtonsCss = null;

/**
 * Loads styles/usta-buttons.css once — only on pages that use a usta button.
 * @returns {Promise} resolves when the stylesheet is loaded
 */
function loadUstaButtonsCss() {
  if (!ustaButtonsCss) ustaButtonsCss = loadCSS(`${window.hlx.codeBasePath}/styles/usta-buttons.css`);
  return ustaButtonsCss;
}

// trailing `[key=value, …]` on a link label or after the link; values may be
// unquoted or in straight / curly quotes (the editor may convert quotes)
const CTA_OPTIONS_SUFFIX = /\[([^[\]]*=[^[\]]*)\]\s*$/;
const CTA_OPTION_PAIR = /([a-z-]+)\s*=\s*(?:["“”'‘’]([^"“”'‘’]*)["“”'‘’]|([^,\s]+))/gi;

/**
 * Parses the inside of an authored `[key=value, …]` options suffix.
 * @param {string} text the text between the brackets
 * @returns {Object|null} lower-cased keys → values
 */
function parseCtaOptions(text) {
  const options = {};
  [...text.matchAll(CTA_OPTION_PAIR)].forEach(([, key, quoted, bare]) => {
    options[key.toLowerCase()] = (quoted ?? bare ?? '').trim();
  });
  return Object.keys(options).length ? options : null;
}

/**
 * Removes the authored `[key=value, …]` options from a standalone link (either
 * the end of its label or the text after it in the same paragraph) and returns
 * them, or null when there are none.
 * @param {HTMLAnchorElement} a the link
 * @param {HTMLParagraphElement} p its paragraph
 * @returns {Object|null} lower-cased keys → values
 */
function takeCtaOptions(a, p) {
  let outer = a;
  while (outer.parentElement !== p) outer = outer.parentElement;
  // only a standalone link can carry options (never strip brackets from prose)
  let beforeText = '';
  for (let n = outer.previousSibling; n; n = n.previousSibling) beforeText += n.textContent;
  if (beforeText.trim()) return null;
  const after = [];
  for (let n = outer.nextSibling; n; n = n.nextSibling) after.push(n);
  const afterText = after.map((n) => n.textContent).join('').trim();
  let match;
  if (afterText) {
    match = afterText.match(CTA_OPTIONS_SUFFIX);
    if (!match || match.index !== 0) return null; // other text after the link
    after.forEach((n) => n.remove());
  } else {
    match = a.textContent.match(CTA_OPTIONS_SUFFIX);
    if (!match) return null;
    // trim the options off the end of the label, across text nodes
    let left = a.textContent.length - match.index;
    const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (let i = texts.length - 1; i >= 0 && left > 0; i -= 1) {
      const t = texts[i];
      const cut = Math.min(left, t.textContent.length);
      t.textContent = t.textContent.slice(0, t.textContent.length - cut);
      left -= cut;
    }
    const last = texts.at(-1);
    if (last) last.textContent = last.textContent.trimEnd();
  }
  return parseCtaOptions(match[1]);
}

/**
 * Validates an authored color: any CSS color (hex, rgb(), named, …) or a design
 * token name (e.g. `brand-orange` / `--brand-orange`, like the Spacer block).
 * @param {string} value authored color
 * @returns {string} a safe CSS color value, or '' when invalid
 */
function ctaColor(value) {
  const v = (value || '').trim();
  if (!v) return '';
  if (CSS.supports('color', v)) return v;
  const token = v.replace(/^-+/, '');
  if (/^[a-z][a-z0-9-]*$/i.test(token)
    && getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()) {
    return `var(--${token})`;
  }
  return '';
}

/**
 * Black or white, whichever contrasts more with the given color (WCAG relative
 * luminance), for buttons whose author set a color but no text color.
 * @param {string} color a valid CSS color
 * @returns {string} '#000' or '#fff'
 */
function contrastText(color) {
  const probe = document.createElement('span');
  probe.style.color = color;
  document.body.append(probe);
  const rgb = getComputedStyle(probe).color.match(/^rgba?\(([^)]+)\)/);
  probe.remove();
  if (!rgb) return '#fff';
  const [r, g, b] = rgb[1].split(/[\s,/]+/).slice(0, 3).map((c) => {
    const s = Number(c) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? '#000' : '#fff';
}

/**
 * The custom properties (styles/foundation-buttons.css) for authored `color` (button color;
 * the border + text color for `outline`) and `text-color` options.
 * @param {Object} options from takeCtaOptions
 * @param {boolean} outline whether the button is the outline style
 * @returns {{vars: Object, custom: boolean}} property → value, and whether the
 *   button needs `.cta-custom` (authored hover)
 */
function ctaOptionVars(options, outline) {
  const bg = ctaColor(options.color);
  const fg = ctaColor(options['text-color']);
  if (bg && outline) {
    return {
      vars: {
        '--cta-color': fg || bg,
        '--cta-border': bg,
        '--cta-bg-hover': bg,
        '--cta-border-hover': bg,
        '--cta-color-hover': contrastText(bg),
      },
      custom: false,
    };
  }
  if (bg) {
    const text = fg || contrastText(bg);
    return {
      vars: {
        '--cta-bg': bg,
        '--cta-border': bg,
        '--cta-bg-hover': bg,
        '--cta-border-hover': bg,
        '--cta-color': text,
        '--cta-color-hover': text,
      },
      custom: true,
    };
  }
  if (fg) {
    // text color only: keep the style's own background on hover (not the default
    // hover blue, which may clash with the authored text color)
    return {
      vars: {
        '--cta-color': fg,
        '--cta-color-hover': fg,
        '--cta-bg-hover': 'var(--cta-bg)',
        '--cta-border-hover': 'var(--cta-border)',
      },
      custom: true,
    };
  }
  return { vars: {}, custom: false };
}

/**
 * The usta.com icon for an EDS icon name: `arrow-down`, `usta-arrow-down` or an alias.
 * @param {string} name the name between the colons of `:name:`
 * @returns {string} a USTA_ICONS name, or ''
 */
function ustaIconName(name) {
  const n = (name || '').toLowerCase().replace(/^usta-/, '');
  const icon = USTA_ICON_ALIASES[n] || n;
  return USTA_ICONS.has(icon) ? icon : '';
}

/**
 * The icon of a usta button: the `icon="download"` option (+ `icon-position="before"`),
 * or the EDS icon notation in the link text: `DOWNLOAD PDF :download:` (after the
 * label) / `:arrow-left: BACK` (before). The pipeline turns `:name:` into
 * `span.icon.icon-name`; a literal `:name:` (left as text) is read too. It becomes
 * the usta.com icon (icons/usta/, 20px, per-icon filters).
 * @param {HTMLAnchorElement} a the usta cta-button
 * @param {Object} options from takeCtaOptions
 */
function decorateUstaIcon(a, options) {
  let icon = ustaIconName(options.icon);
  let before = ['before', 'left'].includes((options['icon-position'] || '').toLowerCase());
  // an option icon wins; a `:name:` in the label is still taken out of the text
  const fromOption = icon;
  const optionBefore = before;
  const textBefore = (node) => {
    const range = document.createRange();
    range.setStart(a, 0);
    range.setEndBefore(node);
    return range.toString().trim();
  };
  const span = a.querySelector('span.icon');
  const spanIcon = span && ustaIconName([...span.classList].find((c) => c.startsWith('icon-'))?.slice(5));
  if (spanIcon) {
    icon = spanIcon;
    before = !textBefore(span);
    span.remove();
  } else if (!span) {
    const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    let found = '';
    while (!found && walker.nextNode()) {
      const node = walker.currentNode;
      const match = node.textContent.match(USTA_ICON_TEXT);
      found = match ? ustaIconName(match[2]) : '';
      if (found) {
        icon = found;
        before = !textBefore(node) && !node.textContent.slice(0, match.index).trim();
        node.textContent = `${node.textContent.slice(0, match.index)}${match[1]}${node.textContent.slice(match.index + match[0].length)}`;
      }
    }
  }
  if (fromOption) { icon = fromOption; before = optionBefore; }
  if (!icon) return;
  // tidy the spaces the icon left behind
  a.normalize();
  const { firstChild: first, lastChild: last } = a;
  if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent.trimStart();
  if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent.trimEnd();
  const el = document.createElement('span');
  el.className = 'cta-usta-icon';
  el.dataset.icon = icon; // per-icon filters in usta-buttons.css
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--cta-usta-icon', `url("${window.hlx.codeBasePath}/icons/usta/${icon}.svg")`);
  a.append(el);
  a.classList.add('cta-usta-with-icon');
  if (before) a.classList.add('cta-usta-icon-left');
}

/**
 * The usta.com button-core extras (the look, size and width come from the style name):
 * border-color, hover-color / hover-text-color / hover-border-color, icon (+ icon-position).
 * Unknown values are ignored.
 * @param {HTMLAnchorElement} a the cta-button
 * @param {Object} options from takeCtaOptions
 */
function applyUstaOptions(a, options) {
  const add = (cls) => cls && a.classList.add(cls);
  if (a.classList.contains('cta-usta-disabled')) {
    a.setAttribute('aria-disabled', 'true');
    a.tabIndex = -1;
  }
  const border = ctaColor(options['border-color']);
  if (border) {
    a.style.setProperty('--cta-border', border);
    a.style.setProperty('--cta-border-hover', border);
  }
  const hover = {
    '--cta-bg-hover': ctaColor(options['hover-color']),
    '--cta-color-hover': ctaColor(options['hover-text-color']),
    '--cta-border-hover': ctaColor(options['hover-border-color']),
  };
  Object.entries(hover).filter(([, v]) => v).forEach(([prop, v]) => a.style.setProperty(prop, v));
  if (Object.values(hover).some(Boolean)) add('cta-usta-custom-hover');
  decorateUstaIcon(a, options);
}

/**
 * Applies authored link options to a cta-button: `color` / `text-color` (see
 * ctaOptionVars) and `new-tab` (true / false); usta styles also get applyUstaOptions.
 * @param {HTMLAnchorElement} a the cta-button
 * @param {Object} options from takeCtaOptions
 */
function applyCtaOptions(a, options) {
  // outline: colour = border + text. The usta styles colour the BACKGROUND (as usta.com does)
  const outline = a.classList.contains('cta-outline');
  const { vars, custom } = ctaOptionVars(options, outline);
  Object.entries(vars).forEach(([prop, value]) => a.style.setProperty(prop, value));
  if (custom) a.classList.add('cta-custom');
  // usta.com colours only the background (inline background-color): every usta
  // family keeps its own border (transparent / black) unless border-color is set
  if (a.matches('.cta-usta, .cta-usta-classic, .cta-usta-join, .cta-usta-signin')) {
    a.style.removeProperty('--cta-border');
    a.style.removeProperty('--cta-border-hover');
    // …and its own text colour (no contrast pick) unless text-color is authored
    if (!ctaColor(options['text-color'])) {
      a.style.removeProperty('--cta-color');
      a.style.removeProperty('--cta-color-hover');
    }
  }
  if (a.classList.contains('cta-usta')) applyUstaOptions(a, options);
  const newTab = (options['new-tab'] || '').toLowerCase();
  if (['true', 'yes', '1'].includes(newTab)) {
    a.target = '_blank';
    a.relList.add('noopener');
  } else if (['false', 'no', '0'].includes(newTab)) {
    a.target = '_self'; // also stops decorateLinkTarget() from opening it in a new tab
    a.relList.remove('noopener');
  }
}

/**
 * Turns a standalone link into a cta-button: sets the class, drops CTA marks
 * inside the link (so the label isn't shrunk/raised) and unwraps every
 * formatting element (any nesting order) between the <p> and the <a>.
 * @param {HTMLAnchorElement} a the link
 * @param {HTMLParagraphElement} p its paragraph
 * @param {string} style cta style class
 */
function makeCtaButton(a, p, style) {
  p.className = 'button-wrapper';
  a.className = `cta-button ${style}`;
  a.querySelectorAll(Object.keys(CTA_BUTTON_STYLES).join(', ')).forEach((m) => m.replaceWith(...m.childNodes));
  let outer = a;
  while (outer.parentElement !== p) outer = outer.parentElement;
  if (outer !== a) outer.replaceWith(a);
}

/**
 * Decorates formatted links to style them as buttons.
 * Standalone link, formatted:
 *   bold → .button.primary · italic → .button.secondary · bold+italic → .button.accent
 *   bold+italic+subscript → .cta-button.cta-blue (solid blue site CTA)
 *   bold+italic+superscript → .cta-button.cta-black (black rounded CTA)
 *   bold (no italic)+superscript → .cta-button.cta-dark (dark #333, square)
 *   bold+italic+underline → .cta-button.cta-outline (#333 outline, square)
 * Any standalone link followed by options, e.g.
 *   Donate [style="outline", color="#e87722", text-color="#fff", new-tab="true"]
 * becomes a cta-button (style= wins over the mark; default blue) with those
 * overrides applied inline.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    const p = a.closest('p');
    // image links never become buttons; an EDS `:icon:` only in a usta button (icons are a
    // usta.com feature — foundation links with an icon stay links, as before)
    const imgs = [...a.querySelectorAll('img')];
    if (imgs.some((img) => !img.closest('span.icon'))) return;
    const options = takeCtaOptions(a, p);
    if (imgs.length && !ctaStyleClasses(options?.style).split(' ').includes('cta-usta')) return;
    const text = a.textContent.trim();

    // quick structural check: the link is the whole paragraph
    if (p.textContent.trim() !== text) return;

    // skip URL display links (unless the author asked for a button)
    try {
      if (!options && new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting (or options) for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em && !options) return;

    // bold + italic + one extra mark, or authored options → cta-button.
    // Checked first so plain bold / italic / bold+italic keep their behaviour.
    // aem.page emits the marks INSIDE the link (<a><sub>…</sub></a>); other
    // sources may put them outside it, so look both ways.
    // bold + italic → CTA_BUTTON_STYLES; bold only → CTA_BOLD_ONLY_STYLES
    let styles = null;
    if (strong && em) styles = CTA_BUTTON_STYLES;
    else if (strong) styles = CTA_BOLD_ONLY_STYLES;
    const marks = styles && Object.keys(styles).join(', ');
    const mark = marks && (a.closest(marks) || a.querySelector(marks));
    const markStyle = mark && p.contains(mark) ? styles[mark.tagName.toLowerCase()] : '';
    if (markStyle || options) {
      const optionStyle = ctaStyleClasses(options?.style);
      makeCtaButton(a, p, optionStyle || markStyle || 'cta-blue');
      if (options) applyCtaOptions(a, options);
      return;
    }

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
  // usta.com buttons: their stylesheet is only fetched on pages that use one
  if (main.querySelector('a[class*="cta-usta"]')) loadUstaButtonsCss();
}

// a raw button link inside da.live's inline editor (marks as authored)
const EDITING_CTA = 'p > em > strong > a:has(> :is(sub, sup, u)), p > strong > a:has(> sup)';

/**
 * Experience Workspace (Layout view, `?quick-edit`): while a paragraph is being
 * edited, da.live swaps it for an inline ProseMirror editor showing the raw
 * button link plus its `[color=…]` options text. The editor's contents must not
 * be touched (changes become document edits), so the authored colors are set
 * as `--cta-edit-*` properties on its `.prosemirror-editor` wrapper and the
 * wrapper gets classes that foundation-buttons.css uses to color the button and hide the
 * options text — so it looks like the published button.
 */
function previewEditingCtas() {
  if (!new URL(window.location.href).searchParams.has('quick-edit')) return;
  const seen = new WeakMap();
  const update = (editor) => {
    const key = editor.innerHTML;
    if (seen.get(editor) === key) return;
    seen.set(editor, key);
    const found = [...editor.querySelectorAll(EDITING_CTA)].map((a) => {
      const p = a.closest('p');
      let outer = a;
      while (outer.parentElement !== p) outer = outer.parentElement;
      const text = (dir) => {
        let s = '';
        for (let n = outer[dir]; n; n = n[dir]) s += n.textContent;
        return s.trim();
      };
      const after = text('nextSibling');
      const match = after.match(CTA_OPTIONS_SUFFIX);
      const standalone = !text('previousSibling') && (!after || match?.index === 0);
      return { a, standalone, options: standalone && match ? parseCtaOptions(match[1]) : null };
    });
    [...editor.style].filter((prop) => prop.startsWith('--cta-edit-'))
      .forEach((prop) => editor.style.removeProperty(prop));
    // one button per editor (a paragraph, or a block cell holding one button)
    const { a, options } = found.length === 1 ? found[0] : {};
    const { vars } = options ? ctaOptionVars(options, !!a.querySelector(':scope > u')) : { vars: {} };
    Object.entries(vars).forEach(([prop, value]) => {
      editor.style.setProperty(prop.replace('--cta-', '--cta-edit-'), value);
    });
    editor.classList.toggle('cta-edit-custom', Object.keys(vars).length > 0);
    editor.classList.toggle('cta-edit-options', found.length > 0 && found.every((f) => f.standalone));

    // usta.com buttons carry no marks: a standalone `p > a` + `[style="usta…", …]`.
    // Same rule: classes + `--cta-edit-*` go on the wrapper only (styles/usta-buttons.css).
    [...editor.classList].filter((c) => c.startsWith('cta-edit-usta'))
      .forEach((c) => editor.classList.remove(c));
    const usta = found.length ? [] : [...editor.querySelectorAll('p > a')].map((link) => {
      const nodes = [...link.parentElement.childNodes];
      const after = nodes.slice(nodes.indexOf(link) + 1).map((n) => n.textContent).join('').trim();
      const before = link.previousSibling?.textContent.trim();
      const match = after.match(CTA_OPTIONS_SUFFIX);
      const opts = !before && match?.index === 0 ? parseCtaOptions(match[1]) : null;
      return opts && ctaStyleClasses(opts.style).includes('cta-usta') ? opts : null;
    }).filter(Boolean);
    if (usta.length === 1) {
      const [opts] = usta;
      // the page classes, prefixed: cta-usta-ghost → cta-edit-usta-ghost
      const classes = ctaStyleClasses(opts.style).split(' ').map((c) => c.replace(/^cta-/, 'cta-edit-'));
      editor.classList.add('cta-edit-usta', ...classes);
      // as on the page: colour = background, each style keeps its own border
      const { vars: ustaVars } = ctaOptionVars(opts, false);
      delete ustaVars['--cta-border'];
      delete ustaVars['--cta-border-hover'];
      if (!ctaColor(opts['text-color'])) {
        delete ustaVars['--cta-color'];
        delete ustaVars['--cta-color-hover'];
      }
      const border = ctaColor(opts['border-color']);
      if (border) ustaVars['--cta-border'] = border;
      Object.entries(ustaVars).forEach(([prop, value]) => {
        editor.style.setProperty(prop.replace('--cta-', '--cta-edit-'), value);
      });
    }
  };
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.querySelectorAll('.prosemirror-editor').forEach(update);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

/**
 * Applies "Section Metadata" blocks as classes/styles on their parent section.
 * The vendored aem.js decorateSections does not process section-metadata, so we
 * consume it here: read each block's config, add its style values as classes,
 * apply any other keys as `data-*` attributes, then remove the block so it does
 * not render as visible content or attempt to load a non-existent block module.
 * @param {Element} main The main container element
 */
function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > div > div.section-metadata').forEach((metaBlock) => {
    const section = metaBlock.parentElement;
    const meta = readBlockConfig(metaBlock);
    Object.keys(meta).forEach((key) => {
      if (key === 'style') {
        meta.style.split(',').map((s) => toClassName(s.trim())).filter((s) => s).forEach((s) => section.classList.add(s));
      } else {
        // dataset keys must be camelCase — a hyphenated key (e.g. "profile-anchor")
        // throws a SyntaxError and would break decoration. toCamelCase maps
        // "profile-anchor" → "profileAnchor" → the data-profile-anchor attribute.
        section.dataset[toCamelCase(key)] = meta[key];
      }
    });
    metaBlock.remove();
  });
}

let sectionBackgroundsPromise;

/**
 * Reads the section background options from the published DA library sheet
 * (/.da/library/blocks → options tab, key `background`, values
 * `name=#hex | …`). Fetched once per page; resolves to {} if unavailable.
 * @returns {Promise<Object<string, string>>} option name → color
 */
function getSectionBackgrounds() {
  sectionBackgroundsPromise ??= fetch('/.da/library/blocks.json')
    .then((resp) => (resp.ok ? resp.json() : {}))
    .then((json) => {
      const option = json.options?.data?.find((item) => item.key === 'background');
      const colors = {};
      (option?.values || '').split('|').forEach((pair) => {
        const [name, color] = pair.split('=').map((s) => s.trim());
        if (name && color) colors[name] = color;
      });
      return colors;
    })
    .catch(() => ({}));
  return sectionBackgroundsPromise;
}

/**
 * Applies Section Metadata `background` values (the section's data-background)
 * using the DA library options: the matching option (by name or by color) is
 * added as a section class. The color itself comes from the matching
 * `main .section.<name>` rule in styles.css, so a new option needs a new rule.
 * @param {Element} root container to search for sections
 */
async function applySectionBackgrounds(root = document) {
  const sections = root.querySelectorAll('.section[data-background]');
  if (!sections.length) return;
  const colors = await getSectionBackgrounds();
  sections.forEach((section) => {
    const value = section.dataset.background.trim().toLowerCase();
    const name = Object.keys(colors)
      .find((n) => n.toLowerCase() === value || colors[n].toLowerCase() === value);
    if (name) section.classList.add(toClassName(name));
  });
}

/**
 * Removes stray injected tracking anchors (e.g. Hotjar's "_hjSafeContext"
 * about:blank link) that get captured into imported content. Hotjar injects
 * these late in the source page, so the importer's cleanup can miss them; strip
 * them here too, dropping the wrapping <p> when the anchor is its only content.
 * @param {Element} main The main container element
 */
function removeTrackingArtifacts(main) {
  main.querySelectorAll('a[href="about:blank"], a[href^="about:"]').forEach((a) => {
    const text = (a.textContent || '').trim();
    if (a.getAttribute('href')?.startsWith('about:') || text === '_hjSafeContext') {
      const p = a.closest('p');
      if (p && p.textContent.trim() === text) p.remove();
      else a.remove();
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  removeTrackingArtifacts(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSectionMetadata(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
/**
 * Load a page-template's CSS eagerly (for LCP-correct layout). The template name
 * comes from the `template` metadata (decorateTemplateAndTheme adds it as a body
 * class); the matching stylesheet lives at templates/<name>/<name>.css. The
 * template's JS module (if any) is loaded later in loadLazy. No-ops when the
 * page declares no template.
 * @returns {Promise<string|null>} the resolved template name, or null
 */
/**
 * Read a metadata value by NORMALIZED key. The published pipeline lowercase-
 * hyphenates metadata names (`Template` → `template`), but the DA authoring
 * preview pane and the dev server serve the raw `.plain.html` with the author's
 * ORIGINAL casing (`<meta name="Template">`). aem.js `getMetadata` is
 * case-sensitive, so a capitalized key misses there. Fall back to a normalized
 * scan so the template resolves identically in the preview pane and live.
 * @param {string} key normalized (lowercase-hyphenated) metadata key
 * @returns {string} the value, or '' when absent
 */
function getMetadataNormalized(key) {
  const direct = getMetadata(key);
  if (direct) return direct;
  const match = [...document.head.querySelectorAll('meta[name]')]
    .find((m) => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === key);
  return match ? match.content : '';
}

async function loadTemplateCSS() {
  const template = getMetadataNormalized('template');
  if (!template) return null;
  const name = toClassName(template);
  // aem.js decorateTemplateAndTheme() adds the body class only when the
  // lowercase `template` meta is present, so in the preview pane (capitalized
  // key) it's missing — add it here so `body.<name>`-scoped template CSS
  // (e.g. news article typography) applies in preview too.
  document.body.classList.add(name);
  try {
    await loadCSS(`${window.hlx.codeBasePath}/templates/${name}/${name}.css`);
  } catch (e) {
    // template CSS is optional — a missing file must not break the page
  }
  return name;
}

/**
 * Load a page-template's JS module (templates/<name>/<name>.js) and run its
 * default export against <main>, if the file exists. Kept in the lazy phase so
 * it never blocks LCP.
 * @param {string|null} name resolved template name from loadTemplateCSS
 * @param {Element} main the page main element
 */
async function loadTemplateJS(name, main) {
  if (!name) return;
  try {
    const mod = await import(`${window.hlx.codeBasePath}/templates/${name}/${name}.js`);
    if (mod.default) await mod.default(main);
  } catch (e) {
    // template JS is optional
  }
}

// Template name resolved in loadEager (via CSS load), consumed in loadLazy for JS.
let templateName = null;

async function loadEager(doc) {
  document.documentElement.lang = 'en';
  preloadDisplayFont();
  decorateTemplateAndTheme();
  // Same casing gap as `template` (see getMetadataNormalized): the preview pane
  // serves `<meta name="Theme">`, which aem.js misses, so body.general (inner-page
  // styles) was absent there. Add the theme class(es) from the normalized key.
  getMetadataNormalized('theme')
    .split(',')
    .map((t) => toClassName(t.trim()))
    .filter(Boolean)
    .forEach((t) => document.body.classList.add(t));
  // Kick off template CSS but DON'T block the eager render on it — the LCP H1's
  // size lives in global styles.css, so the template stylesheet (news color/
  // spacing) isn't LCP-critical. Awaiting it added a full CSS round-trip to the
  // H1 render delay on slow mobile. Resolve `templateName` for loadLazy's JS.
  const templateCssPromise = loadTemplateCSS();
  // CTA buttons (styles/foundation-buttons.css): start loading now; only block the first
  // section on it when that section actually contains a cta-button.
  const buttonsCssPromise = loadCSS(`${window.hlx.codeBasePath}/styles/foundation-buttons.css`);
  const main = doc.querySelector('main');
  if (main) {
    // Experience Workspace block-library pages: strip the DA authoring artifacts
    // and frame each variant before decoration (only loaded on those pages)
    if (window.location.pathname.startsWith('/.da/library/')) {
      const { default: decorateLibraryPreview } = await import('../tools/da-library-preview/da-library-preview.js');
      decorateLibraryPreview(main);
    }
    decorateMain(main);
    if (main.querySelector('.section:first-of-type .cta-button')) await buttonsCssPromise;
    if (main.querySelector('.section:first-of-type a[class*="cta-usta"]')) await loadUstaButtonsCss();
    applySectionBackgrounds(main); // not awaited: the options fetch must not block LCP
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  templateName = await templateCssPromise;

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadTemplateJS(templateName, main);
  await loadSections(main);
  // re-run for sections added after eager decoration (e.g. fragments); the
  // options sheet is already cached
  await applySectionBackgrounds();

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // Fundraise Up donation widget (floating tab + ?form=DONATE overlay).
  import('./donate.js');
  // load anything that can be postponed to the latest here
}

/* Link targets: internal links open in the same tab; external links and file
   downloads open in a new tab. Authors can force a new tab for any link by
   appending `#_blank` to its URL (the marker is stripped from the href). */
const LINK_NEW_TAB_MARKER = '#_blank';
// hosts that are this site: the production domain + this project's aem.page/live
const INTERNAL_HOSTS = /^(?:www\.)?ustafoundation\.com$|--foundation-usta--aemdemos\.aem\.(?:page|live)$/i;
const FILE_EXTENSIONS = /\.(?:pdf|docx?|xlsx?|pptx?|csv|zip|txt|rtf)$/i;

function openInNewTab(a) {
  a.target = '_blank';
  a.relList.add('noopener');
}

/**
 * Sets the target of one link per the rules above. Skipped: in-page `#` anchors,
 * `javascript:`/`mailto:`/`tel:` links, `?form=` donate links (they open the
 * FundraiseUp overlay on this page) and links that already declare a target.
 * @param {HTMLAnchorElement} a the link
 */
export function decorateLinkTarget(a) {
  const href = a.getAttribute('href');
  if (!href) return;
  if (href.endsWith(LINK_NEW_TAB_MARKER)) {
    a.setAttribute('href', href.slice(0, -LINK_NEW_TAB_MARKER.length));
    openInNewTab(a);
    return;
  }
  if (a.target || /^(#|javascript:|mailto:|tel:)/i.test(href) || /[?&]form=/.test(href)) return;
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  const isFile = FILE_EXTENSIONS.test(url.pathname);
  const isExternal = /^https?:$/.test(url.protocol)
    && url.hostname !== window.location.hostname && !INTERNAL_HOSTS.test(url.hostname);
  if (isFile || isExternal) openInNewTab(a);
}

/**
 * Applies decorateLinkTarget to links in `main` up front (clean hrefs, correct
 * hover/right-click), and to every other link at click time via one delegated,
 * capture-phase listener — so links built later (header, footer, blocks, the
 * related-articles feed) follow the same rules without per-block changes.
 */
function decorateLinkTargets() {
  document.querySelectorAll('main a[href]').forEach(decorateLinkTarget);
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (a) decorateLinkTarget(a);
  }, true);
}

async function loadPage() {
  decorateLinkTargets();
  await loadEager(document);
  await loadLazy(document);
  // Defer the delayed phase ~3s (EDS convention) so non-critical third parties
  // (the FundraiseUp donate tab, the consent gate) load well after the page is
  // interactive — keeps them out of the initial critical path / "unused JS".
  window.setTimeout(() => loadDelayed(), 3000);
}

loadPage();
previewEditingCtas();

(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
}());
