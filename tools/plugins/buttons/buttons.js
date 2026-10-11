/*
 * Buttons — an Experience Workspace (DA) library plugin. Authors pick a preset
 * button design, see only that design, set its text, link, colours and
 * "Open in a new tab", and insert it. With a button selected in the editor the
 * panel opens straight on it, pre-filled, and updates it in place.
 *
 * Presets and colour choices come from the DA sheet /.da/library/buttons
 * (tabs `presets` and `options`, see MIGRATION.md); built-in defaults are used
 * when the sheet is missing. The inserted markup is exactly what
 * decorateButtons() (scripts/scripts.js) already turns into a cta-button:
 *   bold+italic+subscript → blue · bold+italic+superscript → black
 *   bold+italic+underline → outline · bold+superscript → dark · none → link
 * colours as a trailing ` [color="…", text-color="…"]`, new tab as `#_blank`.
 */

const SHEET_PATH = '/.da/library/buttons.json';
const NEW_TAB = '#_blank';

// [outer marks…, mark inside the link]; the order decorateButtons() expects
const STYLES = {
  blue: { outer: ['strong', 'em'], inner: 'sub', className: 'cta-blue' },
  black: { outer: ['strong', 'em'], inner: 'sup', className: 'cta-black' },
  outline: { outer: ['strong', 'em'], inner: 'u', className: 'cta-outline' },
  dark: { outer: ['strong'], inner: 'sup', className: 'cta-dark' },
  link: { outer: [], inner: '', className: '' },
  // www.usta.com fixed designs (styles/usta-buttons.css): no marks, written as a `style="…"` option
  'usta-classic': {
    outer: [], inner: '', className: 'cta-usta-classic', option: true,
  },
  'usta-classic-outline': {
    outer: [], inner: '', className: 'cta-usta-classic cta-usta-classic-ghost', option: true,
  },
  'usta-header-join': {
    outer: [], inner: '', className: 'cta-usta-join', option: true,
  },
  'usta-header-signin': {
    outer: [], inner: '', className: 'cta-usta-signin', option: true,
  },
};

// usta.com button-core designs named from words: `usta-pill-wide`, `usta-square-small-column`
// (= USTA_WORDS in scripts.js — keep in sync)
const USTA_WORDS = {
  pill: [],
  outline: ['cta-usta-ghost'],
  square: ['cta-usta-rect'],
  app: ['cta-usta-app'],
  medium: ['cta-usta-h40'],
  small: ['cta-usta-h40', 'cta-usta-fs-small'],
  mini: ['cta-usta-h24', 'cta-usta-fs-small'],
  compact: ['cta-usta-fs-small'],
  wide: ['cta-usta-w-large'],
  narrow: ['cta-usta-w-small'],
  column: ['cta-usta-w-full'],
  padded: ['cta-usta-pad-50'],
  disabled: ['cta-usta-disabled'],
};

/**
 * A style's markup recipe: a fixed STYLES entry, or a usta.com button-core design
 * named from USTA_WORDS (mirrors ctaStyleClasses() in scripts.js).
 * @param {string} style the style name
 * @returns {Object|null} { outer, inner, className, option, icons }
 */
function styleInfo(style) {
  const s = (style || '').toLowerCase();
  if (STYLES[s]) return STYLES[s];
  const words = s.startsWith('usta-') ? s.slice(5).split('-') : [];
  const valid = words.length && new Set(words).size === words.length
    && words.every((w) => USTA_WORDS[w]);
  if (!valid) return null;
  return {
    outer: [],
    inner: '',
    className: ['cta-usta', ...words.flatMap((w) => USTA_WORDS[w])].join(' '),
    option: true,
    icons: true,
  };
}

// usta.com colours a preset may fix (written as options, kept when a button is edited)
const EXTRA_KEYS = ['border-color', 'hover-color', 'hover-text-color', 'hover-border-color'];
// the usta.com icons (icons/usta/, = USTA_ICONS in scripts.js), written as `icon="…"`
const USTA_ICONS = ['add', 'alarm', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'attachment',
  'award', 'bookmark', 'calendar', 'cancel', 'check', 'chevron-back', 'chevron-down', 'chevron-forward',
  'chevron-up', 'clock', 'cloud', 'comment', 'computer', 'edit', 'envelope', 'facebook', 'flag', 'folder', 'globe',
  'globe-primary', 'globe-primary-cut', 'google-plus', 'hamburger', 'home', 'info', 'instagram', 'invite', 'like',
  'link', 'linkedin', 'live-chat', 'location', 'location-search', 'lock', 'logout', 'megaphone', 'mic', 'mobile',
  'more-info', 'more-options', 'navigation', 'notification', 'overflow', 'pagination-left', 'pagination-right',
  'pause', 'phone', 'pinterest', 'play', 'pop-out', 'printer', 'profile', 'refresh', 'screen-exit-full',
  'screen-full', 'search', 'settings', 'share', 'star', 'success', 'sync', 'tip', 'tennis-ball', 'trash',
  'triangle-down', 'triangle-left', 'triangle-right', 'triangle-up', 'twitter', 'view', 'vimeo', 'visibility-off',
  'volume-default', 'volume-mute', 'warning', 'web', 'wifi', 'youtube'];
// = USTA_ICON_ALIASES in scripts.js
const USTA_ICON_ALIASES = {
  download: 'arrow-down', external: 'pop-out', 'external-link': 'pop-out', 'open-in-new': 'pop-out',
};
const ustaIcon = (name) => {
  const n = (name || '').toLowerCase().replace(/^usta-/, '');
  const icon = USTA_ICON_ALIASES[n] || n;
  return USTA_ICONS.includes(icon) ? icon : '';
};
// a `:name:` in a label (start, end or between spaces)
const ICON_TEXT = /(^|\s):([a-z0-9-]+):(?=\s|$)/i;

const DEFAULT_PRESETS = [
  {
    name: 'Blue Button', style: 'blue', label: 'LEARN MORE', description: 'Standard solid blue call-to-action.',
  },
  {
    name: 'Black Button', style: 'black', label: 'BACK TO HOMEPAGE', description: 'Black, fully rounded.',
  },
  {
    name: 'Dark Button', style: 'dark', label: 'LEARN MORE', description: 'Dark grey (#333), square.',
  },
  {
    name: 'Outline Button', style: 'outline', label: 'SECONDARY BUTTON', description: 'Transparent, #333 border.',
  },
  {
    name: 'Text link', style: 'link', label: 'Read more', description: 'A plain text link, no button.',
  },
];

// www.usta.com designs (crawl of 3,388 EN pages) — the most used + one of each look.
// `extra` = the fixed usta.com colours each design writes as options.
const usta = (name, style, label, description, more = {}) => ({
  name: `USTA — ${name}`, style, label, description, color: '', textColor: '', extra: {}, icon: '', iconBefore: false, ...more,
});
DEFAULT_PRESETS.push(
  usta('Pill', 'usta-pill', 'LEARN MORE', 'usta.com standard: black pill, 56px, fits the text.'),
  usta('Pill, wide — lime', 'usta-pill-wide', 'REGISTER NOW', 'At least 280px wide. Brand lime, black text.', { color: '#cfff05', textColor: '#000000' }),
  usta('Pill, wide — white', 'usta-pill-wide', 'EXPLORE', 'For dark bands: white, black text.', { color: '#ffffff', textColor: '#000000' }),
  usta('Pill — blue', 'usta-pill', 'LEARN MORE', 'Brand blue #0373f3, white text.', { color: '#0373f3' }),
  usta('Pill, wide — green', 'usta-pill-wide', 'JOIN', 'Membership: dark green, light green text.', { color: '#19462e', textColor: '#a4ee90' }),
  usta('Pill, wide — cream', 'usta-pill-wide', 'SIGN UP NOW', 'Cream #ffefbe, blue text.', { color: '#ffefbe', textColor: '#0373f3' }),
  usta('Pill, column — white border', 'usta-pill-column', 'SIGN UP', 'For dark bands: 2px white border; fills its column.', { extra: { 'border-color': '#ffffff' } }),
  usta('Pill, medium, column', 'usta-pill-medium-column', 'CONTACT', 'The 40px pill; fills its column.'),
  usta('Outline, medium, wide', 'usta-outline-medium-wide', 'SEE ALL NEWS', 'Black 2px border, 40px, at least 280px.'),
  usta('Outline, column', 'usta-outline-column', 'NCAA GUIDE', 'Outline pill; fills its column.'),
  usta('Square, column', 'usta-square-column', 'FIND EVENTS', '3px corners, 1px border; fills its column.'),
  usta('Square, small — external link', 'usta-square-small-column', 'LEARN MORE', 'Cards: 40px, 14px text, pop-out icon.', { icon: 'pop-out' }),
  usta('Square, small — download', 'usta-square-small-column', 'DOWNLOAD PDF', 'Cards: 40px, 14px text, download arrow.', { icon: 'arrow-down' }),
  usta('Pill, column — icon', 'usta-pill-column', 'SPORTSMANSHIP', 'Label + 20px icon (star); fills its column.', { icon: 'star' }),
  usta('Pill — back', 'usta-pill', 'BACK TO AWARDS', 'Arrow before the label.', { icon: 'arrow-left', iconBefore: true }),
  usta('Pill, wide — custom hover', 'usta-pill-wide', 'WILD CARD REQUEST FORM', 'Turns white with a black border on hover.', {
    extra: { 'hover-color': '#ffffff', 'hover-text-color': '#000000', 'hover-border-color': '#000000' },
  }),
  usta('App, wide', 'usta-app-wide', 'GET STARTED', 'Widget button: label keeps 1px letter spacing.'),
  usta('App, wide, disabled', 'usta-app-wide-disabled', 'SEARCH', 'Grey disabled state.'),
  usta('Classic', 'usta-classic', 'SHARE LOCATION', 'Older black button: 1px border, 270px.'),
  usta('Header — join', 'usta-header-join', 'JOIN', 'Header link: grey border, 3px corners.'),
  usta('Header — sign in', 'usta-header-signin', 'SIGN IN', 'Header button: black, 120 × 40.'),
);

const DEFAULT_OPTIONS = {
  color: [
    { label: 'Brand blue', value: '#0373f3' },
    { label: 'Black', value: '#000000' },
    { label: 'Dark grey', value: '#333333' },
    { label: 'Orange', value: '#e87722' },
    { label: 'USTA lime', value: '#cfff05' },
    { label: 'USTA dark green', value: '#19462e' },
    { label: 'USTA light green', value: '#a4ee90' },
    { label: 'USTA cream', value: '#ffefbe' },
    { label: 'White', value: '#ffffff' },
  ],
  'text-color': [
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
    { label: 'Brand blue', value: '#0373f3' },
    { label: 'USTA light green', value: '#a4ee90' },
    { label: 'USTA dark green', value: '#19462e' },
  ],
};

// trailing `[key=value, …]` options, as parsed by scripts.js
const OPTIONS_SUFFIX = /\[([^[\]]*=[^[\]]*)\]\s*$/;
const OPTION_PAIR = /([a-z-]+)\s*=\s*(?:["“”'‘’]([^"“”'‘’]*)["“”'‘’]|([^,\s]+))/gi;

const $ = (selector) => document.querySelector(selector);
const main = $('.btn-plugin');
const status = $('.btn-plugin-status');
const gallery = $('.btn-plugin-gallery');
const list = $('.btn-plugin-presets');
const editor = $('.btn-plugin-editor');
const editorStatus = $('.btn-plugin-editor-status');
const form = $('.btn-plugin-form');
const preview = $('.btn-plugin-preview');
const submit = $('.btn-plugin-submit');
const swatchSets = [...form.querySelectorAll('.btn-plugin-colors')];
const iconSelect = form.elements.icon;
const iconPreview = form.querySelector('.btn-plugin-select-icon');

const state = {
  actions: null,
  presets: DEFAULT_PRESETS,
  options: DEFAULT_OPTIONS,
  preset: null,
  message: status.textContent,
};

const isOpen = () => editor.classList.contains('is-open');

/** Shows the current message in whichever view is visible (gallery or drawer). */
function showMessage() {
  status.textContent = isOpen() ? '' : state.message;
  editorStatus.textContent = isOpen() ? state.message : '';
}

/** @param {string|null} key a data-* message on the status element; null clears */
function say(key) {
  state.message = (key && status.dataset[key]) || '';
  showMessage();
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/* ---- validation ------------------------------------------------------ */

/**
 * A safe link: a path / anchor / query relative to the site, or an absolute
 * http(s), mailto or tel URL. Anything else (javascript:, data:, //host) → ''.
 * @param {string} value authored URL
 * @returns {string} the URL, or ''
 */
function cleanUrl(value) {
  const v = (value || '').trim();
  if (!v || /\s/.test(v)) return '';
  if (/^(?:\/(?!\/)|#|\?|\.\.?\/)/.test(v)) return v;
  try {
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(v).protocol) ? v : '';
  } catch {
    return '';
  }
}

/**
 * A CSS colour or a design-token name (e.g. brand-orange), like ctaColor() in
 * scripts.js. Restricted to characters that can't break the `[…="…"]` syntax.
 * @param {string} value colour from the sheet / selection
 * @returns {string} the colour, or ''
 */
function cleanColor(value) {
  const v = (value || '').trim();
  if (!v || !/^[#\w(),.%\s-]+$/.test(v)) return '';
  if (CSS.supports('color', v)) return v;
  const token = v.replace(/^-+/, '');
  if (getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim()) return v;
  return '';
}

/* ---- sheet ------------------------------------------------------------ */

const normalizeRow = (row) => Object.fromEntries(Object.entries(row)
  .map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()]));

/**
 * @param {Object} json DA sheet JSON (single sheet, or multi-sheet with tabs)
 * @param {string} name tab name
 * @returns {Object[]|null} the tab's rows
 */
function sheetRows(json, name) {
  if (Array.isArray(json?.[name]?.data)) return json[name].data.map(normalizeRow);
  if (name === 'presets' && Array.isArray(json?.data)) return json.data.map(normalizeRow);
  return null;
}

/**
 * Parses `key="value", …` (a preset's fixed usta modifiers) into a clean object —
 * only EXTRA_KEYS, values reduced to safe characters.
 * @param {string|Object} source the options text, or an object of options
 * @returns {Object} key → value
 */
function parseExtra(source) {
  const pairs = typeof source === 'string'
    ? [...source.matchAll(OPTION_PAIR)].map(([, key, quoted, bare]) => [key.toLowerCase(), quoted ?? bare ?? ''])
    : Object.entries(source || {});
  const extra = {};
  pairs.forEach(([key, value]) => {
    const v = String(value).trim();
    if (!EXTRA_KEYS.includes(key) || !v) return;
    if (key.endsWith('color')) { if (cleanColor(v)) extra[key] = cleanColor(v); return; }
    if (/^[a-z0-9-]+$/i.test(v)) extra[key] = v.toLowerCase();
  });
  return extra;
}

const extraText = (extra) => Object.entries(extra || {}).map(([k, v]) => `${k}="${v}"`).join(', ');

function parsePresets(rows) {
  const presets = (rows || [])
    .map((row) => ({
      name: row.name,
      style: (row.style || 'blue').toLowerCase(),
      color: cleanColor(row.color),
      textColor: cleanColor(row['text-color']),
      label: row.label || '',
      description: row.description || '',
      extra: parseExtra(row.options || ''),
      // an icon in the options column: `icon="download"` (+ `icon-position="before"`)
      icon: ustaIcon((row.options || '').match(/icon="([^"]*)"/)?.[1]),
      iconBefore: /icon-position="(before|left)"/i.test(row.options || ''),
    }))
    .filter((p) => p.name && styleInfo(p.style));
  return presets.length ? presets : null;
}

/**
 * `values` cells look like `Brand blue=#0373f3 | Black=#000000` (a bare value
 * is its own label).
 */
function parseOptions(rows) {
  const options = {};
  (rows || []).forEach((row) => {
    const key = (row.key || '').toLowerCase();
    if (!['color', 'text-color'].includes(key)) return;
    options[key] = (row.values || '').split('|').map((entry) => {
      const [label, value = label] = entry.split('=').map((s) => s.trim());
      return { label, value: cleanColor(value) };
    }).filter((o) => o.label && o.value);
  });
  return Object.keys(options).length ? { ...DEFAULT_OPTIONS, ...options } : null;
}

async function loadSheet(context, actions) {
  try {
    const url = `https://admin.da.live/source/${context.org}/${context.repo}${SHEET_PATH}`;
    const resp = await actions.daFetch(url);
    if (!resp.ok) return false;
    const json = await resp.json();
    const presets = parsePresets(sheetRows(json, 'presets'));
    const options = parseOptions(sheetRows(json, 'options'));
    // the sheet replaces the built-in designs; the usta.com ones are kept unless
    // the sheet lists its own usta rows
    if (presets) {
      state.presets = presets.some((p) => p.style.startsWith('usta-'))
        ? presets
        : [...presets, ...DEFAULT_PRESETS.filter((p) => p.style.startsWith('usta-'))];
    }
    if (options) state.options = options;
    return Boolean(presets);
  } catch {
    return false;
  }
}

/* ---- preview (mirrors applyCtaOptions() in scripts.js) ---------------- */

function resolveColor(value) {
  const v = cleanColor(value);
  if (!v || CSS.supports('color', v)) return v;
  return `var(--${v.replace(/^-+/, '')})`;
}

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

function applyColors(a, color, textColor) {
  const bg = resolveColor(color);
  const fg = resolveColor(textColor);
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
    set('--cta-color', fg);
    set('--cta-color-hover', fg);
    set('--cta-bg-hover', 'var(--cta-bg)');
    set('--cta-border-hover', 'var(--cta-border)');
    a.classList.add('cta-custom');
  }
  if (a.matches('.cta-usta, .cta-usta-classic, .cta-usta-join, .cta-usta-signin')) {
    a.style.removeProperty('--cta-border');
    a.style.removeProperty('--cta-border-hover');
    if (!fg) {
      a.style.removeProperty('--cta-color');
      a.style.removeProperty('--cta-color-hover');
    }
  }
}

/**
 * The usta.com modifiers + icon on a preview (mirrors applyUstaOptions() / decorateUstaIcon()).
 * @param {HTMLAnchorElement} a the preview button
 * @param {Object} extra the preset's modifiers
 * @param {string} [icon] a USTA_ICONS name
 * @param {boolean} [iconBefore] icon before the label
 */
function applyUstaPreview(a, extra, icon, iconBefore) {
  if (!a.classList.contains('cta-usta')) return;
  if (extra['border-color']) {
    a.style.setProperty('--cta-border', resolveColor(extra['border-color']));
    a.style.setProperty('--cta-border-hover', resolveColor(extra['border-color']));
  }
  const hover = { 'hover-color': '--cta-bg-hover', 'hover-text-color': '--cta-color-hover', 'hover-border-color': '--cta-border-hover' };
  Object.entries(hover).forEach(([key, prop]) => {
    if (extra[key]) { a.style.setProperty(prop, resolveColor(extra[key])); a.classList.add('cta-usta-custom-hover'); }
  });
  if (icon) {
    const span = document.createElement('span');
    span.className = 'cta-usta-icon';
    span.dataset.icon = icon;
    span.style.setProperty('--cta-usta-icon', `url("/icons/usta/${icon}.svg")`);
    a.append(span);
    a.classList.add('cta-usta-with-icon');
    if (iconBefore) a.classList.add('cta-usta-icon-left');
  }
}

/**
 * The button as the site renders it (inert: previews are not links).
 * @param {{style: string, label: string, color?: string, textColor?: string, extra?: Object,
 *   icon?: string, iconBefore?: boolean}} b
 * @returns {HTMLParagraphElement}
 */
function renderButton({
  style, label, color, textColor, extra, icon, iconBefore,
}) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = label || ' ';
  const { className, icons } = styleInfo(style);
  if (className) {
    p.className = 'button-wrapper';
    a.className = `cta-button ${className}`;
    applyColors(a, color, textColor);
    applyUstaPreview(a, extra || {}, icons && ustaIcon(icon), iconBefore);
  }
  p.append(a);
  return p;
}

/* ---- markup ------------------------------------------------------------ */

/**
 * @returns {string} the paragraph to insert, in the shape decorateButtons() reads
 */
function buildHtml({
  style, label, url, color, textColor, newTab, extra, icon, iconBefore,
}) {
  const {
    outer, inner, option, icons,
  } = styleInfo(style);
  const href = newTab ? `${url}${NEW_TAB}` : url;
  let html = escapeHtml(label);
  if (inner) html = `<${inner}>${html}</${inner}>`;
  html = `<a href="${escapeHtml(href)}">${html}</a>`;
  [...outer].reverse().forEach((tag) => { html = `<${tag}>${html}</${tag}>`; });
  const options = [];
  if (option) options.push(`style="${style}"`);
  if (style !== 'link' && color) options.push(`color="${color}"`);
  if (style !== 'link' && textColor) options.push(`text-color="${textColor}"`);
  if (option && extra && Object.keys(extra).length) options.push(extraText(extra));
  // the icon, read by decorateUstaIcon() (as typed: `icon="download"`)
  if (icons && ustaIcon(icon)) {
    options.push(`icon="${ustaIcon(icon)}"`);
    if (iconBefore) options.push('icon-position="before"');
  }
  if (options.length) html += ` [${escapeHtml(options.join(', '))}]`;
  return `<p>${html}</p>`;
}

/**
 * Reads a button back from the editor selection's HTML (edit mode).
 * DOMParser documents are inert: nothing in them runs or loads.
 * @param {string} html the selection
 * @returns {Object|null} the button's fields, or null when there is no link
 */
function parseSelection(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const a = doc.querySelector('a[href]');
  if (!a) return null;
  const has = (tag) => Boolean(a.closest(tag) || a.querySelector(tag));
  const strong = has('strong') || has('b');
  const em = has('em') || has('i');
  let style = 'link';
  if (strong && em) {
    style = ['blue', 'black', 'outline'].find((s) => has(STYLES[s].inner)) || 'link';
  } else if (strong && has('sup')) {
    style = 'dark';
  }

  const options = {};
  const match = doc.body.textContent.match(OPTIONS_SUFFIX);
  if (match) {
    [...match[1].matchAll(OPTION_PAIR)].forEach(([, key, quoted, bare]) => {
      options[key.toLowerCase()] = (quoted ?? bare ?? '').trim();
    });
  }
  if (styleInfo(options.style)) style = options.style.toLowerCase();

  let url = a.getAttribute('href');
  let newTab = ['true', 'yes', '1'].includes((options['new-tab'] || '').toLowerCase());
  if (url.endsWith(NEW_TAB)) {
    url = url.slice(0, -NEW_TAB.length);
    newTab = true;
  }
  // the icon: `:name:` text, or a span.icon (when the selection comes back converted)
  let icon = '';
  let iconBefore = false;
  let label = a.textContent.replace(OPTIONS_SUFFIX, '').trim();
  const span = a.querySelector('span.icon');
  if (span) {
    icon = ustaIcon([...span.classList].find((c) => c.startsWith('icon-'))?.slice(5));
    const range = doc.createRange();
    range.setStart(a, 0);
    range.setEndBefore(span);
    iconBefore = !range.toString().trim();
  } else {
    const found = label.match(ICON_TEXT);
    icon = found ? ustaIcon(found[2]) : '';
    if (icon) {
      iconBefore = !label.slice(0, found.index).trim();
      label = `${label.slice(0, found.index)}${label.slice(found.index + found[0].length)}`.replace(/\s+/g, ' ').trim();
    }
  }
  // the `icon="…"` option wins, as on the page
  if (ustaIcon(options.icon)) {
    icon = ustaIcon(options.icon);
    iconBefore = ['before', 'left'].includes((options['icon-position'] || '').toLowerCase());
  }
  return {
    style,
    url,
    newTab,
    icon,
    iconBefore,
    label,
    color: cleanColor(options.color),
    textColor: cleanColor(options['text-color']),
    extra: parseExtra(options),
  };
}

/* ---- UI ------------------------------------------------------------------ */

const same = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

/**
 * Fills a colour fieldset with swatch radios: "Design default" first, then the
 * sheet's choices, then the current colour when it isn't one of them.
 * @param {HTMLElement} fieldset `.btn-plugin-colors` group (data-name, data-default)
 * @param {{label: string, value: string}[]} choices from the sheet
 * @param {string} [selected] the colour to check
 */
function fillSwatches(fieldset, choices, selected) {
  const choiceList = [{ label: fieldset.dataset.default, value: '' }, ...choices];
  if (selected && !choiceList.some((c) => same(c.value, selected))) {
    choiceList.push({ label: selected, value: selected });
  }
  const current = choiceList.find((c) => same(c.value, selected)) || choiceList[0];
  fieldset.querySelector('.btn-plugin-swatches').replaceChildren(...choiceList.map((choice) => {
    const swatch = document.createElement('label');
    swatch.className = 'btn-plugin-swatch';
    swatch.title = choice.label;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = fieldset.dataset.name;
    input.value = choice.value;
    input.checked = choice === current;
    input.setAttribute('aria-label', choice.label);
    const chip = document.createElement('span');
    chip.className = 'btn-plugin-chip';
    if (choice.value) chip.style.setProperty('--swatch', resolveColor(choice.value));
    else chip.classList.add('is-default');
    swatch.append(input, chip);
    return swatch;
  }));
}

// `arrow-down` → `Arrow down (download)`: the name plus the alias authors may type
const iconLabel = (icon) => {
  const words = (name) => name.replace(/-/g, ' ');
  const alias = Object.keys(USTA_ICON_ALIASES).find((a) => USTA_ICON_ALIASES[a] === icon);
  const label = words(icon).replace(/^./, (c) => c.toUpperCase());
  return alias ? `${label} (${words(alias)})` : label;
};

/**
 * Selects an icon in the dropdown ("No icon" first, then every usta.com icon,
 * A–Z); the options are built once.
 * @param {string} [selected] the icon to select
 */
function fillIcons(selected) {
  if (!iconSelect.options.length) {
    iconSelect.append(
      new Option(iconSelect.dataset.default, ''),
      ...USTA_ICONS.map((icon) => new Option(iconLabel(icon), icon)),
    );
  }
  iconSelect.value = ustaIcon(selected);
}

function readForm() {
  const data = new FormData(form);
  const url = String(data.get('url') || '').trim();
  const typedNewTab = url.endsWith(NEW_TAB);
  return {
    style: state.preset.style,
    extra: state.extra || state.preset.extra || {},
    label: String(data.get('label') || '').trim(),
    url: typedNewTab ? url.slice(0, -NEW_TAB.length) : url,
    color: cleanColor(data.get('color')),
    textColor: cleanColor(data.get('text-color')),
    newTab: data.get('new-tab') === 'on' || typedNewTab,
    icon: ustaIcon(data.get('icon')),
    iconBefore: data.get('icon-before') === 'on',
  };
}

function updatePreview() {
  const values = readForm();
  preview.replaceChildren(renderButton({ ...values, label: values.label || state.preset.label }));
  // the chosen colour's name next to each swatch group's legend
  swatchSets.forEach((fieldset) => {
    const checked = fieldset.querySelector('input:checked');
    fieldset.querySelector('.btn-plugin-swatch-value').textContent = checked?.closest('label').title || '';
  });
  iconPreview.style.setProperty('--icon', values.icon ? `url("/icons/usta/${values.icon}.svg")` : 'none');
  form.elements['icon-before'].disabled = !values.icon;
}

function setError(input, show) {
  const error = document.getElementById(`${input.id}-error`);
  input.setAttribute('aria-invalid', String(show));
  error.textContent = show ? error.dataset.message : '';
}

/**
 * Slides the editor drawer in for one preset.
 * @param {Object} preset the chosen design
 * @param {Object} [values] current values (edit mode, or carried over)
 */
function openEditor(preset, values = {}) {
  state.preset = preset;
  // an edited button keeps its own usta modifiers; a picked design uses the preset's
  state.extra = values.extra && Object.keys(values.extra).length ? values.extra : null;
  editor.classList.toggle('is-link', preset.style === 'link');
  editor.classList.toggle('has-icons', Boolean(styleInfo(preset.style)?.icons));
  $('#btn-plugin-editor-heading').textContent = preset.name;
  $('.btn-plugin-description').textContent = preset.description;
  form.elements.label.value = values.label ?? preset.label;
  form.elements.url.value = values.url ?? '';
  form.elements['new-tab'].checked = Boolean(values.newTab);
  fillIcons(values.icon ?? preset.icon);
  form.elements['icon-before'].checked = Boolean(values.icon ? values.iconBefore : preset.iconBefore);
  const [colorSet, textColorSet] = swatchSets;
  fillSwatches(colorSet, state.options.color || [], values.color ?? preset.color);
  fillSwatches(textColorSet, state.options['text-color'] || [], values.textColor ?? preset.textColor);
  [form.elements.label, form.elements.url].forEach((input) => setError(input, false));
  updatePreview();

  editor.inert = false;
  gallery.inert = true;
  editor.classList.add('is-open');
  main.classList.add('is-editing');
  editor.querySelector('.btn-plugin-editor-body').scrollTop = 0;
  showMessage();
  form.elements.label.focus({ preventScroll: true });
}

/** Badges the design the drawer was last showing, so authors keep their place. */
function markCurrent() {
  list.querySelectorAll('.btn-plugin-card').forEach((card, i) => {
    const current = state.presets[i] === state.preset;
    card.classList.toggle('is-current', current);
    const pick = card.querySelector('.btn-plugin-pick');
    if (current) pick.setAttribute('aria-current', 'true');
    else pick.removeAttribute('aria-current');
    card.querySelector('.btn-plugin-badge')?.remove();
    if (current) {
      const badge = document.createElement('span');
      badge.className = 'btn-plugin-badge';
      badge.textContent = list.dataset.current;
      card.querySelector('.btn-plugin-sample').append(badge);
    }
  });
}

function closeEditor() {
  editor.classList.remove('is-open');
  main.classList.remove('is-editing');
  editor.inert = true;
  gallery.inert = false;
  markCurrent();
  showMessage();
  const index = state.presets.indexOf(state.preset);
  list.querySelectorAll('.btn-plugin-pick')[index]?.focus();
}

/**
 * Switching design keeps what the author already typed (text, link, new tab);
 * the colours follow the new design.
 */
function pickPreset(preset) {
  const values = {};
  if (state.preset) {
    const previous = readForm();
    if (previous.label && previous.label !== state.preset.label) values.label = previous.label;
    values.url = previous.url;
    values.newTab = previous.newTab;
  }
  say(state.actions ? null : 'standalone');
  openEditor(preset, values);
}

function renderGallery() {
  list.replaceChildren(...state.presets.map((preset) => {
    const li = document.createElement('li');
    li.className = 'btn-plugin-card';
    const sample = document.createElement('div');
    sample.className = 'btn-plugin-sample';
    sample.inert = true;
    sample.append(renderButton(preset));
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'btn-plugin-pick';
    const name = document.createElement('span');
    name.className = 'btn-plugin-name';
    name.textContent = preset.name;
    pick.append(name);
    if (preset.description) {
      const description = document.createElement('span');
      description.className = 'btn-plugin-card-description';
      description.textContent = preset.description;
      pick.append(description);
    }
    const go = document.createElement('span');
    go.className = 'btn-plugin-go';
    go.setAttribute('aria-hidden', 'true');
    pick.append(go);
    pick.addEventListener('click', () => pickPreset(preset));
    li.append(sample, pick);
    return li;
  }));
  markCurrent();
}

/**
 * The preset an existing button most likely came from: same style and
 * colours, else same style, else an ad-hoc one for that style.
 */
function matchPreset(values) {
  const sameExtra = (p) => extraText(p.extra) === extraText(values.extra);
  return state.presets.find((p) => p.style === values.style && sameExtra(p)
      && same(p.color, values.color) && same(p.textColor, values.textColor))
    || state.presets.find((p) => p.style === values.style && sameExtra(p))
    || state.presets.find((p) => p.style === values.style)
    || {
      name: values.style, style: values.style, label: '', description: '',
    };
}

form.addEventListener('input', (e) => {
  // a field's error clears as soon as the author edits it; submit re-checks
  if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, false);
  updatePreview();
});
form.addEventListener('change', updatePreview);
$('.btn-plugin-back').addEventListener('click', closeEditor);
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditor();
});
$('.btn-plugin-canvas').addEventListener('change', (e) => {
  preview.dataset.canvas = e.target.value;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const values = readForm();
  const url = cleanUrl(values.url);
  setError(form.elements.label, !values.label);
  setError(form.elements.url, !url);
  if (!values.label) { form.elements.label.focus(); return; }
  if (!url) { form.elements.url.focus(); return; }
  if (!state.actions?.sendHTML) { say('standalone'); return; }
  try {
    await state.actions.sendHTML(buildHtml({ ...values, url }));
    // the panel stays open; the author closes it from DA when done
    say('done');
  } catch {
    say('failed');
  }
});

const timeout = (ms) => new Promise((resolve) => { setTimeout(() => resolve(null), ms); });

async function init() {
  renderGallery();
  let sdk = null;
  try {
    // eslint-disable-next-line import/no-unresolved -- remote DA App SDK
    const { default: DA_SDK } = await import('https://da.live/nx/utils/sdk.js');
    // the SDK only resolves inside the DA editor; stand alone, show the defaults
    sdk = await Promise.race([DA_SDK, timeout(3000)]);
  } catch { /* not in DA */ }

  if (!sdk?.actions) {
    say('standalone');
    submit.disabled = true;
    return;
  }

  const { context, actions } = sdk;
  state.actions = actions;
  const fromSheet = await loadSheet(context, actions);
  renderGallery();
  say(fromSheet ? null : 'defaults');

  // edit mode: a selected link opens straight on its design, pre-filled
  let selection = null;
  try {
    if (actions.getSelection) {
      selection = await Promise.race([actions.getSelection(), timeout(1500)]);
    }
  } catch { /* nothing selected */ }
  const values = typeof selection === 'string' ? parseSelection(selection) : null;
  if (values) {
    submit.textContent = submit.dataset.update;
    say('edit');
    openEditor(matchPreset(values), values);
  }
}

init();
