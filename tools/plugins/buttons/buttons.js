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
};

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

const DEFAULT_OPTIONS = {
  color: [
    { label: 'Brand blue', value: '#0373f3' },
    { label: 'Black', value: '#000000' },
    { label: 'Dark grey', value: '#333333' },
    { label: 'Orange', value: '#e87722' },
  ],
  'text-color': [
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
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

function parsePresets(rows) {
  const presets = (rows || [])
    .map((row) => ({
      name: row.name,
      style: (row.style || 'blue').toLowerCase(),
      color: cleanColor(row.color),
      textColor: cleanColor(row['text-color']),
      label: row.label || '',
      description: row.description || '',
    }))
    .filter((p) => p.name && STYLES[p.style]);
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
    if (presets) state.presets = presets;
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
}

/**
 * The button as the site renders it (inert: previews are not links).
 * @param {{style: string, label: string, color?: string, textColor?: string}} b
 * @returns {HTMLParagraphElement}
 */
function renderButton({
  style, label, color, textColor,
}) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = label || ' ';
  const { className } = STYLES[style];
  if (className) {
    p.className = 'button-wrapper';
    a.className = `cta-button ${className}`;
    applyColors(a, color, textColor);
  }
  p.append(a);
  return p;
}

/* ---- markup ------------------------------------------------------------ */

/**
 * @returns {string} the paragraph to insert, in the shape decorateButtons() reads
 */
function buildHtml({
  style, label, url, color, textColor, newTab,
}) {
  const { outer, inner } = STYLES[style];
  const href = newTab ? `${url}${NEW_TAB}` : url;
  let html = escapeHtml(label);
  if (inner) html = `<${inner}>${html}</${inner}>`;
  html = `<a href="${escapeHtml(href)}">${html}</a>`;
  [...outer].reverse().forEach((tag) => { html = `<${tag}>${html}</${tag}>`; });
  const options = [];
  if (style !== 'link' && color) options.push(`color="${color}"`);
  if (style !== 'link' && textColor) options.push(`text-color="${textColor}"`);
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
  if (STYLES[(options.style || '').toLowerCase()]) style = options.style.toLowerCase();

  let url = a.getAttribute('href');
  let newTab = ['true', 'yes', '1'].includes((options['new-tab'] || '').toLowerCase());
  if (url.endsWith(NEW_TAB)) {
    url = url.slice(0, -NEW_TAB.length);
    newTab = true;
  }
  return {
    style,
    url,
    newTab,
    label: a.textContent.replace(OPTIONS_SUFFIX, '').trim(),
    color: cleanColor(options.color),
    textColor: cleanColor(options['text-color']),
  };
}

/* ---- UI ------------------------------------------------------------------ */

const same = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

/**
 * Fills a colour fieldset with swatch radios: "Design default" first, then the
 * sheet's choices, then the current colour when it isn't one of them.
 * @param {HTMLFieldSetElement} fieldset `.btn-plugin-colors` (data-name, data-default)
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

function readForm() {
  const data = new FormData(form);
  const url = String(data.get('url') || '').trim();
  const typedNewTab = url.endsWith(NEW_TAB);
  return {
    style: state.preset.style,
    label: String(data.get('label') || '').trim(),
    url: typedNewTab ? url.slice(0, -NEW_TAB.length) : url,
    color: cleanColor(data.get('color')),
    textColor: cleanColor(data.get('text-color')),
    newTab: data.get('new-tab') === 'on' || typedNewTab,
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
  editor.classList.toggle('is-link', preset.style === 'link');
  $('#btn-plugin-editor-heading').textContent = preset.name;
  $('.btn-plugin-description').textContent = preset.description;
  form.elements.label.value = values.label ?? preset.label;
  form.elements.url.value = values.url ?? '';
  form.elements['new-tab'].checked = Boolean(values.newTab);
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
  return state.presets.find((p) => p.style === values.style
      && same(p.color, values.color) && same(p.textColor, values.textColor))
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
