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
 * (styles/buttons.css).
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
};

// trailing `[key=value, …]` on a link label or after the link; values may be
// unquoted or in straight / curly quotes (the editor may convert quotes)
const CTA_OPTIONS_SUFFIX = /\[([^[\]]*=[^[\]]*)\]\s*$/;
const CTA_OPTION_PAIR = /([a-z-]+)\s*=\s*(?:["“”'‘’]([^"“”'‘’]*)["“”'‘’]|([^,\s]+))/gi;

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
  const options = {};
  [...match[1].matchAll(CTA_OPTION_PAIR)].forEach(([, key, quoted, bare]) => {
    options[key.toLowerCase()] = (quoted ?? bare ?? '').trim();
  });
  return Object.keys(options).length ? options : null;
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
 * Applies authored link options to a cta-button: `color` (button color; the
 * border + text color for `outline`), `text-color`, `new-tab` (true / false).
 * Colors are set as the custom properties styles/buttons.css reads.
 * @param {HTMLAnchorElement} a the cta-button
 * @param {Object} options from takeCtaOptions
 */
function applyCtaOptions(a, options) {
  const bg = ctaColor(options.color);
  const fg = ctaColor(options['text-color']);
  const set = (prop, value) => a.style.setProperty(prop, value);
  if (bg && a.classList.contains('cta-outline')) {
    set('--cta-color', fg || bg);
    set('--cta-border', bg);
    set('--cta-bg-hover', bg);
    set('--cta-border-hover', bg);
    set('--cta-color-hover', contrastText(bg));
  } else if (bg) {
    const text = fg || contrastText(bg);
    ['--cta-bg', '--cta-border', '--cta-bg-hover', '--cta-border-hover'].forEach((prop) => set(prop, bg));
    set('--cta-color', text);
    set('--cta-color-hover', text);
    a.classList.add('cta-custom');
  } else if (fg) {
    // text color only: keep the style's own background on hover (not the default
    // hover blue, which may clash with the authored text color)
    set('--cta-color', fg);
    set('--cta-color-hover', fg);
    set('--cta-bg-hover', 'var(--cta-bg)');
    set('--cta-border-hover', 'var(--cta-border)');
    a.classList.add('cta-custom');
  }
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
    if (a.querySelector('img')) return;
    const options = takeCtaOptions(a, p);
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
      const optionStyle = CTA_OPTION_STYLES[(options?.style || '').toLowerCase()];
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
  // CTA buttons (styles/buttons.css): start loading now; only block the first
  // section on it when that section actually contains a cta-button.
  const buttonsCssPromise = loadCSS(`${window.hlx.codeBasePath}/styles/buttons.css`);
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

(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
}());
