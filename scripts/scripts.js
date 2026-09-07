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

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
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
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

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
async function loadTemplateCSS() {
  const template = getMetadata('template');
  if (!template) return null;
  const name = toClassName(template);
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
  // Kick off template CSS but DON'T block the eager render on it — the LCP H1's
  // size lives in global styles.css, so the template stylesheet (news color/
  // spacing) isn't LCP-critical. Awaiting it added a full CSS round-trip to the
  // H1 render delay on slow mobile. Resolve `templateName` for loadLazy's JS.
  const templateCssPromise = loadTemplateCSS();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
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

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
