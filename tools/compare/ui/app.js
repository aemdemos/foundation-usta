/* eslint-disable no-use-before-define */
/**
 * Page Parity Checker UI. Runs in two modes:
 *  - live:   served by tools/compare/server.mjs (form, history, progress, notes)
 *  - static: an exported report (window.REPORT + window.REPORT_ASSETS inlined)
 */

const STATIC = !!window.REPORT;
const app = document.getElementById('app');
const state = { config: null, job: null, es: null };
const DRAFT_KEY = 'parity-checker-draft';

/* ------------------------------------------------------------ helpers */

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (['checked', 'value', 'disabled', 'open', 'selected'].includes(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat(Infinity).forEach((c) => {
    if (c == null || c === false) return;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
}

/** Replace an element's children; accepts nested arrays and skips null/false. */
function fill(el, ...kids) {
  el.replaceChildren(...h('div', null, kids).childNodes);
}

const pct = (n, d = 1) => (n == null ? '–' : `${(n * 100).toFixed(d)}%`);
const tone = (s) => {
  if (s == null) return 'na';
  if (s >= 90) return 'good';
  return s >= 75 ? 'mid' : 'bad';
};
const scoreEl = (s) => h('span', { class: `score ${tone(s)}` }, s == null ? '–' : s);
const badge = (text, cls = '') => h('span', { class: `badge ${cls}` }, text);
const statusLabel = { pass: 'Pass', review: 'Needs review', fail: 'Fail' };
const verdictLabel = { pass: 'Pass', minor: 'Minor issues', fail: 'Fail' };
const fmtDate = (s) => (s ? new Date(s).toLocaleString() : '');
const extLink = (url, text) => h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, text || url);

function asset(name) {
  if (!name) return null;
  if (STATIC) return window.REPORT_ASSETS?.[name] || null;
  return `/reports/${state.job.id}/${name}`;
}

function runHref(pairIdx, tab, changeId) {
  const tail = [pairIdx, tab, changeId].filter((x) => x != null).join('/');
  if (STATIC) return `#/${tail}`;
  return `#/run/${state.job.id}${tail ? `/${tail}` : ''}`;
}

async function api(url, opts) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

function setNav(which) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === which));
}

/* ------------------------------------------------------------ form */

function toEdsUrl(original, base) {
  try {
    const u = new URL(original);
    const b = new URL(base);
    let p = u.pathname.replace(/\.html?$/, '');
    p = p.replace(/^\/content\/(?!dam\/)[^/]+(?=\/)/, '');
    return `${b.origin}${p}`;
  } catch { return ''; }
}

function parseBulk(text) {
  return text.split(/\r?\n/).map((line) => line.match(/https?:\/\/[^\s,;|"']+/g) || [])
    .filter((m) => m.length).map((m) => ({ original: m[0], eds: m[1] || '' }));
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}

function showForm() {
  setNav('new');
  const cfg = state.config;
  const draft = loadDraft();
  const d = cfg.defaults;
  const opt = {
    viewports: cfg.defaultViewports,
    excludeHeaderFooter: true,
    excludeSelector: d.excludeSelector,
    hideSelector: d.hideSelector,
    srcRoot: '',
    edsRoot: '',
    includeHidden: false,
    checkLinks: false,
    threshold: d.threshold,
    ...(draft.options || {}),
  };

  const rows = h('div', { class: 'pairs' });
  const edsBase = h('input', {
    id: 'f-edsbase', type: 'url', value: draft.edsBase ?? cfg.edsBase, placeholder: 'https://main--repo--owner.aem.page',
  });
  const renumber = () => [...rows.children].forEach((r, i) => { r.querySelector('.pair-num').textContent = i + 1; });
  const addRow = (o = '', e = '') => {
    const orig = h('input', {
      type: 'url', value: o, placeholder: 'Original URL — https://www.example.com/page.html', 'aria-label': 'Original URL', class: 'orig',
    });
    const eds = h('input', {
      type: 'url', value: e, placeholder: 'EDS URL — https://main--repo--owner.aem.page/page', 'aria-label': 'EDS URL', class: 'eds',
    });
    const suggest = () => { eds.placeholder = toEdsUrl(orig.value, edsBase.value) || 'EDS URL'; };
    orig.addEventListener('input', suggest);
    edsBase.addEventListener('input', suggest);
    if (o) suggest();
    const row = h(
      'div',
      { class: 'pair-row' },
      h('span', { class: 'pair-num' }),
      orig,
      h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'),
      eds,
      h('button', {
        type: 'button',
        class: 'btn icon',
        'aria-label': 'Remove pair',
        title: 'Remove',
        onclick: () => { if (rows.children.length > 1) row.remove(); else { orig.value = ''; eds.value = ''; } renumber(); },
      }, '✕'),
    );
    rows.append(row);
    renumber();
    return row;
  };
  (draft.pairs?.length ? draft.pairs : [{ original: '', eds: '' }]).forEach((p) => addRow(p.original, p.eds));

  const bulk = h('textarea', { id: 'f-bulk', placeholder: 'One page per line:\nhttps://www.site.com/a.html  https://main--repo--owner.aem.page/a\nhttps://www.site.com/b.html   (EDS URL auto-filled from the EDS host)' });
  const bulkBox = h(
    'div',
    { hidden: true },
    h('label', { class: 'field', for: 'f-bulk' }, 'Paste a list'),
    h('div', { class: 'hint' }, 'One pair per line, separated by space, tab or comma. Lines with only an original URL use the EDS host below.'),
    bulk,
    h('div', { class: 'btn-row' }, h('button', {
      type: 'button',
      class: 'btn',
      onclick: () => {
        const parsed = parseBulk(bulk.value);
        if (!parsed.length) return;
        const empty = [...rows.children].filter((r) => !r.querySelector('.orig').value && !r.querySelector('.eds').value);
        empty.forEach((r) => r.remove());
        parsed.forEach((p) => addRow(p.original, p.eds));
        bulk.value = '';
        bulkBox.hidden = true;
      },
    }, 'Add these pages')),
  );

  const vpChecks = cfg.viewports.map((v) => h(
    'label',
    { class: 'check' },
    h('input', {
      type: 'checkbox', value: String(v), checked: opt.viewports.includes(v), class: 'vp',
    }),
    `${v}px${{ 375: ' (mobile)', 1440: ' (desktop)' }[v] || (cfg.breakpoints.includes(v) ? ' (breakpoint)' : '')}`,
  ));
  const customVp = h('input', {
    id: 'f-widths',
    type: 'text',
    value: opt.viewports.filter((v) => !cfg.viewports.includes(v)).join(', '),
    placeholder: 'Other widths, e.g. 320, 1024, 1920',
    style: { maxWidth: '320px' },
  });
  const exclHF = h('input', { type: 'checkbox', checked: opt.excludeHeaderFooter });
  const exclSel = h('input', { id: 'f-excl', type: 'text', value: opt.excludeSelector });
  const hideSel = h('input', { id: 'f-hide', type: 'text', value: opt.hideSelector });
  const srcRoot = h('input', {
    id: 'f-srcroot', type: 'text', value: opt.srcRoot, placeholder: 'auto: <main>, else <body>',
  });
  const edsRoot = h('input', {
    id: 'f-edsroot', type: 'text', value: opt.edsRoot, placeholder: 'auto: <main>',
  });
  const hidden = h('input', { type: 'checkbox', checked: opt.includeHidden });
  const links = h('input', { type: 'checkbox', checked: opt.checkLinks });
  const thrVal = h('span', { class: 'mono' }, opt.threshold);
  const thr = h('input', {
    id: 'f-thr', type: 'range', min: '5', max: '120', value: String(opt.threshold), oninput: () => { thrVal.textContent = thr.value; },
  });
  const title = h('input', { id: 'f-title', type: 'text', placeholder: 'e.g. News articles — batch 1 (optional)' });
  const err = h('div', { class: 'error-box', hidden: true });
  const runBtn = h('button', { type: 'submit', class: 'btn primary' }, 'Run comparison');

  const form = h(
    'form',
    {
      class: 'panel',
      onsubmit: async (ev) => {
        ev.preventDefault();
        err.hidden = true;
        const pairs = [];
        let bad = false;
        [...rows.children].forEach((r) => {
          const o = r.querySelector('.orig');
          const e = r.querySelector('.eds');
          if (!o.value.trim() && !e.value.trim()) return;
          if (!e.value.trim() && edsBase.value) e.value = toEdsUrl(o.value.trim(), edsBase.value);
          const ok = (inp) => { try { return /^https?:$/.test(new URL(inp.value.trim()).protocol); } catch { return false; } };
          o.classList.toggle('invalid', !ok(o));
          e.classList.toggle('invalid', !ok(e));
          if (!ok(o) || !ok(e)) bad = true;
          pairs.push({ original: o.value.trim(), eds: e.value.trim() });
        });
        if (bad || !pairs.length) {
          err.textContent = pairs.length ? 'Some URLs are not valid http(s) URLs (highlighted in red).' : 'Enter at least one original URL and its EDS URL.';
          err.hidden = false;
          return;
        }
        const options = {
          viewports: [...form.querySelectorAll('.vp:checked')].map((c) => Number(c.value))
            .concat((customVp.value.match(/\d+/g) || []).map(Number)),
          excludeHeaderFooter: exclHF.checked,
          excludeSelector: exclSel.value,
          hideSelector: hideSel.value,
          srcRoot: srcRoot.value.trim(),
          edsRoot: edsRoot.value.trim(),
          includeHidden: hidden.checked,
          checkLinks: links.checked,
          threshold: Number(thr.value),
        };
        const badVp = options.viewports.find((v) => v < 280 || v > 2560);
        if (badVp) {
          err.textContent = `Width ${badVp}px is out of range — use 280 to 2560px.`;
          err.hidden = false;
          return;
        }
        if (!options.viewports.length) {
          err.textContent = 'Select at least one width.';
          err.hidden = false;
          return;
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ pairs, options, edsBase: edsBase.value }));
        runBtn.disabled = true;
        runBtn.textContent = 'Starting…';
        try {
          const { id } = await api('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairs, options, title: title.value.trim() }),
          });
          window.location.hash = `#/run/${id}`;
        } catch (e) {
          err.textContent = e.message;
          err.hidden = false;
          runBtn.disabled = false;
          runBtn.textContent = 'Run comparison';
        }
      },
    },
    h('h2', null, 'Compare original pages with their EDS versions'),
    h('p', { class: 'lead' }, 'Each pair is loaded in a headless browser at every selected screen width. You get a visual diff, text / heading / link / image / metadata / typography differences, console and network errors, and a parity score. Export the report when you\'re done.'),
    h('label', { class: 'field' }, 'Pages to compare'),
    rows,
    h(
      'div',
      { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn', onclick: () => addRow().querySelector('.orig').focus() }, '+ Add pair'),
      h('button', { type: 'button', class: 'btn', onclick: () => { bulkBox.hidden = !bulkBox.hidden; } }, 'Paste a list…'),
      h('span', { class: 'spacer' }),
    ),
    bulkBox,
    h('label', { class: 'field', for: 'f-edsbase' }, 'EDS host (used to auto-fill empty EDS URLs)'),
    h('div', { class: 'hint' }, 'The original path is kept, ".html" is dropped. Change to the .aem.page host to compare preview content.'),
    edsBase,
    h('label', { class: 'field' }, 'Screen widths to check'),
    h('div', { class: 'hint' }, 'Tick the project breakpoints and/or type any other widths (280–2560px). You can also add more widths later from the results.'),
    h('div', { class: 'checks' }, vpChecks, customVp),
    h('label', { class: 'field', for: 'f-title' }, 'Run name'),
    title,
    h(
      'details',
      { class: 'options' },
      h('summary', null, 'Advanced options'),
      h(
        'div',
        { class: 'opt-grid' },
        h(
          'div',
          null,
          h('label', { class: 'field check' }, exclHF, 'Compare main content only (exclude header & footer)'),
          h('div', { class: 'hint' }, 'Header/footer are usually validated separately. Turn off to compare the whole page.'),
          h('label', { class: 'field', for: 'f-excl' }, 'Header / footer selectors to exclude'),
          exclSel,
          h('label', { class: 'field', for: 'f-srcroot' }, 'Original content root (CSS selector)'),
          srcRoot,
          h('label', { class: 'field', for: 'f-edsroot' }, 'EDS content root (CSS selector)'),
          edsRoot,
        ),
        h(
          'div',
          null,
          h('label', { class: 'field', for: 'f-hide' }, 'Hide before screenshots (cookie banners, chat widgets)'),
          hideSel,
          h('label', { class: 'field check' }, hidden, 'Include hidden text (closed tabs, menus)'),
          h('div', { class: 'hint' }, 'Accordions (<details>) are always opened. Hidden text can add noise from duplicated mobile/desktop markup.'),
          h('label', { class: 'field check' }, links, 'Check HTTP status of every EDS link (slower)'),
          h('label', { class: 'field', for: 'f-thr' }, 'Pixel-diff tolerance ', thrVal),
          h('div', { class: 'hint' }, 'Per-channel colour difference ignored as noise (anti-aliasing, JPEG). Higher = more lenient.'),
          thr,
        ),
      ),
    ),
    err,
    h('div', { class: 'btn-row' }, runBtn),
  );
  fill(app, form);
}

/* ------------------------------------------------------------ history */

async function showHistory() {
  setNav('history');
  fill(app, h('div', { class: 'panel' }, h('div', { class: 'empty' }, 'Loading…')));
  const list = await api('/api/jobs');
  const body = list.length
    ? h('div', { class: 'table-wrap' }, h(
      'table',
      null,
      h('thead', null, h('tr', null, ['Date', 'Run', 'Pages', 'Avg score', 'Status'].map((t) => h('th', null, t)))),
      h('tbody', null, list.map((j) => h(
        'tr',
        { class: 'clickable', onclick: () => { window.location.hash = `#/run/${j.id}`; } },
        h('td', null, fmtDate(j.createdAt)),
        h('td', null, h('a', { href: `#/run/${j.id}` }, j.title), h('div', { class: 'small muted mono' }, j.first || '')),
        h('td', { class: 'num' }, j.pairs),
        h('td', null, scoreEl(j.avg)),
        h('td', null, badge(j.status, { done: 'pass', error: 'fail', interrupted: 'review' }[j.status] || '')),
      ))),
    ))
    : h('div', { class: 'empty' }, 'No runs yet. ', h('a', { href: '#/new' }, 'Start a comparison'), '.');
  fill(app, h('div', { class: 'panel' }, h('h2', null, 'Previous runs'), h('p', { class: 'lead' }, 'Every run is saved locally so you can reopen or re-export its report.'), body));
}

/* ------------------------------------------------------------ run */

async function openRun(id, pairIdx, tab, changeId) {
  setNav('');
  if (state.job?.id !== id) {
    if (state.es) { state.es.close(); state.es = null; }
    fill(app, h('div', { class: 'panel' }, h('div', { class: 'empty' }, 'Loading run…')));
    state.job = await api(`/api/jobs/${id}`);
  }
  if (!state.es && ['queued', 'running'].includes(state.job.status)) {
    state.es = new EventSource(`/api/jobs/${id}/events`);
    state.es.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'progress') {
        state.job.progress = msg.progress;
        const el = document.getElementById('progress-msg');
        if (el) el.textContent = msg.progress.message;
      }
      if (msg.type === 'pair' || msg.type === 'done') {
        state.job = await api(`/api/jobs/${id}`);
        if (msg.type === 'done') { state.es.close(); state.es = null; }
        const [, , , p, t] = window.location.hash.split('/');
        if (window.location.hash.startsWith(`#/run/${id}`)) showRun(p, t);
      }
    };
  }
  showRun(pairIdx, tab, changeId);
}

function showRun(pairIdx, tab, changeId) {
  const { job } = state;
  const pair = pairIdx != null && pairIdx !== '' ? job.pairs[Number(pairIdx)] : null;
  fill(app, runHeader(job), pair ? pairDetail(pair, tab || 'visual', changeId) : runSummary(job));
  if (!pair) window.scrollTo(0, 0);
}

function runHeader(job) {
  // widths actually compared (pages may have extra widths added after the run)
  const widths = [...new Set(job.pairs.flatMap((p) => p.viewports || job.options.viewports))]
    .sort((a, b) => a - b);
  const running = ['queued', 'running'].includes(job.status);
  const done = job.progress?.done || 0;
  const total = job.progress?.total || job.pairs.length;
  const exports = STATIC
    ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, 'Print / Save as PDF'))
    : null;
  const o = job.options;
  return h(
    'section',
    { class: 'panel' },
    h(
      'div',
      { class: 'run-head' },
      h(
        'div',
        null,
        h('h2', null, job.title),
        h(
          'div',
          { class: 'muted small' },
          `${STATIC ? 'Report generated from run' : 'Run'} ${job.id} · ${fmtDate(job.createdAt)} · widths ${widths.join(', ')}px · `,
          o.excludeHeaderFooter ? 'main content only' : 'whole page',
          o.checkLinks ? ' · link status checked' : '',
        ),
      ),
      running ? null : exports,
    ),
    running ? h(
      'div',
      null,
      h('div', { class: `progress${done === 0 ? ' indeterminate' : ''}` }, h('div', { style: { width: `${Math.round((100 * done) / total)}%` } })),
      h('div', { class: 'small' }, `${done} of ${total} page${total > 1 ? 's' : ''} compared · `, h('span', { id: 'progress-msg', class: 'muted' }, job.progress?.message || '')),
    ) : null,
    job.status === 'error' ? h('div', { class: 'error-box' }, job.error) : null,
  );
}

function runSummary(job) {
  const results = job.pairs.filter((p) => p.result);
  const total = results.reduce((a, p) => a + p.result.scores.overall, 0);
  const avg = results.length ? Math.round(total / results.length) : null;
  const count = (st) => results.filter((p) => p.result.status === st).length;
  const errors = results.reduce((a, p) => a + p.result.counts.error, 0);
  const reviewed = job.pairs.filter((p) => p.notes?.verdict).length;
  const cards = h(
    'div',
    { class: 'cards' },
    [['Pages', job.pairs.length, ''], ['Average score', avg ?? '–', tone(avg)], ['Pass', count('pass'), 'good'],
      ['Needs review', count('review'), 'mid'], ['Fail', count('fail'), 'bad'], ['Errors found', errors, errors ? 'bad' : 'good'],
      ['Manually reviewed', `${reviewed}/${job.pairs.length}`, '']]
      .map(([k, v, c]) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: `v ${c}` }, v))),
  );
  const s = (p, k) => p.result?.scores[k];
  const table = h('div', { class: 'table-wrap' }, h(
    'table',
    null,
    h('thead', null, h('tr', null, ['#', 'Original → EDS', 'Score', 'Visual', 'Text', 'Links', 'Images', 'Issues', 'Auto status', 'Your verdict']
      .map((t) => h('th', null, t)))),
    h('tbody', null, job.pairs.map((p) => {
      const r = p.result;
      let statusCell;
      if (r) statusCell = badge(statusLabel[r.status], r.status);
      else if (p.status === 'error') statusCell = h('span', null, badge('Error', 'fail'), h('div', { class: 'small muted' }, p.error));
      else statusCell = badge(p.status === 'running' ? 'Running…' : 'Pending');
      return h(
        'tr',
        { class: r ? 'clickable' : '', onclick: r ? () => { window.location.hash = runHref(p.index); } : null },
        h('td', { class: 'num' }, p.index + 1),
        h(
          'td',
          { class: 'url' },
          r ? h('a', { href: runHref(p.index) }, p.original) : p.original,
          h('div', { class: 'muted' }, '→ ', p.eds),
          p.src?.title ? h('div', { class: 'small muted' }, p.src.title) : null,
        ),
        h('td', null, scoreEl(s(p, 'overall'))),
        h('td', null, scoreEl(s(p, 'visual'))),
        h('td', null, scoreEl(s(p, 'text'))),
        h('td', null, scoreEl(s(p, 'links'))),
        h('td', null, scoreEl(s(p, 'media'))),
        h('td', null, r ? [badge(`${r.counts.error} errors`, r.counts.error ? 'error' : ''), ' ', badge(`${r.counts.warning} warnings`, r.counts.warning ? 'warning' : '')] : ''),
        h('td', null, statusCell),
        h('td', null, p.notes?.verdict ? badge(verdictLabel[p.notes.verdict], p.notes.verdict) : h('span', { class: 'muted small' }, '—')),
      );
    })),
  ));
  return h(
    'section',
    { class: 'panel' },
    h(
      'div',
      { class: 'review-head' },
      h('h2', null, 'Summary'),
      STATIC || !['done', 'error'].includes(job.status) ? null : h('a', { class: 'btn', href: `/api/jobs/${job.id}/report.html` }, '⬇ Export report'),
    ),
    h('p', { class: 'lead' }, 'Click a page to see its differences. The score weights text 30%, visual 20%, links 15%, headings / images / typography 10% each, metadata 5%.'),
    cards,
    table,
  );
}

/* ------------------------------------------------------------ pair detail */

const TABS = [
  ['visual', 'Difference review'], ['issues', 'Issues'], ['text', 'Text'], ['headings', 'Headings'], ['links', 'Links'],
  ['media', 'Images & media'], ['meta', 'Metadata'], ['typography', 'Typography'], ['network', 'Console & network'], ['notes', 'Review notes'],
];

function tabCount(r, key) {
  const t = r.text.stats;
  const n = {
    issues: r.counts.error + r.counts.warning,
    visual: (() => {
      const vs = r.visual.map((v) => Number(v.viewport));
      return vs.length ? findingsAt(r, String(Math.max(...vs))).filter((f) => f.priority === 'high').length : 0;
    })(),
    text: t.missing + t.changed + t.extra,
    headings: r.headings.ops.filter((o) => o.type !== 'equal' || o.levelChanged).length,
    links: r.links.missing.length + r.links.targetChanged.length + r.links.extra.length,
    media: r.media.edsBroken.length + r.media.edsMissingAlt.length + r.media.missingEmbeds.length,
    meta: r.meta.filter((m) => m.status === 'missing' || m.status === 'different').length,
    typography: r.typography.filter((x) => x.mismatches).length,
    network: r.network.eds.failed.length + r.network.eds.console.length,
  }[key];
  return n ? h('span', { class: `count${['issues', 'network'].includes(key) && r.counts.error ? ' bad' : ''}` }, n) : null;
}

function pairDetail(pair, tab, changeId) {
  const r = pair.result;
  if (!r) {
    return h('section', { class: 'panel' }, h('a', { class: 'backlink', href: runHref() }, '← All pages'), h('div', { class: 'empty' }, pair.error || 'This page has not been compared yet.'));
  }
  const s = r.scores;
  const ringColor = { good: 'var(--good)', mid: 'var(--mid)', bad: 'var(--bad)' }[tone(s.overall)];
  const bars = [['Visual', s.visual], ['Text', s.text], ['Headings', s.headings], ['Links', s.links], ['Images & media', s.media], ['Typography', s.typography], ['Metadata', s.meta]]
    .map(([label, v]) => h(
      'div',
      null,
      h('div', { class: 'bar-label' }, h('span', null, label), h('b', null, v ?? '–')),
      h('div', { class: 'bar' }, h('div', { style: { width: `${v ?? 0}%`, background: `var(--${{ good: 'good', mid: 'mid', bad: 'bad' }[tone(v)] || 'line'})` } })),
    ));
  const head = h(
    'section',
    { class: 'panel' },
    h('a', { class: 'backlink', href: runHref() }, '← All pages'),
    h(
      'div',
      { class: 'pair-head' },
      h('div', { class: 'ring', style: { '--p': s.overall, '--c': ringColor } }, h('span', null, s.overall)),
      h(
        'div',
        { class: 'urls' },
        h('div', null, badge(statusLabel[r.status], r.status), ' ', pair.notes?.verdict ? badge(`Reviewer: ${verdictLabel[pair.notes.verdict]}`, pair.notes.verdict) : null),
        h('div', null, h('b', null, 'Original: '), extLink(pair.original), pair.src?.status ? h('span', { class: 'muted small' }, ` (HTTP ${pair.src.status})`) : null),
        h('div', null, h('b', null, 'EDS: '), extLink(pair.eds), pair.edsInfo?.status ? h('span', { class: 'muted small' }, ` (HTTP ${pair.edsInfo.status})`) : null),
        h('div', { class: 'small muted' }, `Compared content root — original: ${pair.src?.contentRoot || '?'}, EDS: ${pair.edsInfo?.contentRoot || '?'}`),
      ),
      h('div', { class: 'cards', style: { margin: 0 } }, h('div', { class: 'card' }, h('div', { class: 'k' }, 'Errors'), h('div', { class: `v ${r.counts.error ? 'bad' : 'good'}` }, r.counts.error)), h('div', { class: 'card' }, h('div', { class: 'k' }, 'Warnings'), h('div', { class: `v ${r.counts.warning ? 'mid' : 'good'}` }, r.counts.warning))),
    ),
    h('div', { class: 'bars' }, bars),
  );
  const tabs = h('nav', { class: 'tabs', 'aria-label': 'Comparison details' }, TABS.map(([key, label]) => h(
    'a',
    { href: runHref(pair.index, key), 'aria-current': key === tab ? 'page' : null },
    label,
    tabCount(r, key),
  )));
  const views = {
    issues: issuesTab,
    visual: visualTab,
    text: textTab,
    headings: headingsTab,
    links: linksTab,
    media: mediaTab,
    meta: metaTab,
    typography: typographyTab,
    network: networkTab,
    notes: notesTab,
  };
  return h('div', null, head, h('section', { class: 'panel' }, tabs, (views[tab] || issuesTab)(pair, r, changeId)));
}

function issuesTab(pair, r) {
  if (!r.issues.length) return h('div', { class: 'empty' }, '🎉 No differences detected.');
  let filter = r.counts.error ? 'error' : 'all';
  const wrap = h('div');
  const draw = () => {
    const list = r.issues.filter((i) => filter === 'all' || i.severity === filter);
    fill(
      wrap,
      h('div', { class: 'chips' }, [['all', `All (${r.issues.length})`], ['error', `Errors (${r.counts.error})`], ['warning', `Warnings (${r.counts.warning})`], ['info', `Info (${r.counts.info})`]]
        .map(([k, l]) => h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(filter === k), onclick: () => { filter = k; draw(); },
        }, l))),
      list.length ? list.map((i) => h(
        'div',
        { class: 'issue' },
        h('div', null, badge(i.severity, i.severity)),
        h('div', { class: 'cat' }, i.category),
        h('div', null, i.message, ' ', locateLink(pair, i.changeId), i.detail ? h('div', { class: 'detail' }, i.detail) : null),
      )) : h('div', { class: 'empty' }, 'Nothing in this category.'),
    );
  };
  draw();
  return wrap;
}

const ELEMENT_PRIORITY = {
  missing: 'high', broken: 'high', changed: 'medium', extra: 'low',
};
const PRIORITY_RANK2 = { high: 0, medium: 1, low: 2 };
const GROUPS = [
  ['high', 'Fix first', 'Clear differences — content missing or layout clearly off.'],
  ['medium', 'Worth checking', 'Noticeable differences — confirm whether they matter.'],
  ['low', 'Minor', 'Small differences — usually fine to ignore.'],
];
const TYPE_INFO = {
  content: { label: 'Content' },
  spacing: { label: 'Spacing & layout' },
  visual: { label: 'Visual' },
};

function locateLink(pair, id) {
  if (id == null) return null;
  return h('a', { class: 'locate', href: runHref(pair.index, 'visual', id), title: 'Show this on the screenshots' }, '📍 Show');
}

const whereText = (f) => {
  if (f.src && f.eds) return 'both pages';
  return f.src ? 'original only' : 'EDS only';
};
const pctOf = (n, total) => `${(100 * n) / total}%`;
const nums = (s) => (String(s || '').match(/-?\d+/g) || []).map(Number);

const typeOf = (f) => {
  if (f.category === 'Spacing' || f.category === 'Layout') return 'spacing';
  return f.category === 'Visual' ? 'visual' : 'content';
};

/** Plain-language title + "what to check" for one finding. */
function describe(f) {
  const [m1, m2] = nums(f.measure);
  const d = f.delta ?? m1;
  switch (f.kind) {
    case 'spacing':
      return {
        title: d > 0 ? `${d}px more space on EDS` : `${Math.abs(d)}px less space on EDS`,
        hint: f.detail
          ? `${f.detail.replace(/^Gap between /, 'Between ').replace(/: (\d+)px on the original vs (\d+)px on EDS.*$/, ': $1px → $2px')}. Check margin / padding.`
          : 'The gap between these blocks differs — check margin / padding.',
      };
    case 'padding':
      return {
        title: `Content sits ${Math.abs(m1)}px further ${m1 > 0 ? 'right' : 'left'} on EDS`,
        hint: 'Check the left padding / margin of this block.',
      };
    case 'width':
      return {
        title: `Text column ${Math.abs(m2 - m1)}px ${m2 > m1 ? 'wider' : 'narrower'} on EDS`,
        hint: `Lines wrap differently (${m1}px → ${m2}px) — check the container width / padding.`,
      };
    case 'size':
      return { title: 'Image is a different size', hint: f.detail };
    case 'visual':
      return { title: 'Looks different here', hint: 'Pixels differ in this area — compare colours, images and styling by eye.' };
    case 'section':
      return { title: 'This section looks different', hint: 'Layout, wrapping or content changed here — compare the two pages side by side.' };
    case 'missing':
      return f.category === 'Visual'
        ? { title: 'Part of the original is missing on EDS', hint: f.detail }
        : { title: f.label, hint: f.detail };
    case 'extra':
      return f.category === 'Visual'
        ? { title: 'Extra content on EDS', hint: f.detail }
        : { title: f.label, hint: f.detail };
    default:
      return { title: f.label, hint: f.detail };
  }
}

const area = (b) => b[2] * b[3];
const overlap = (p, q) => Math.max(0, Math.min(p[0] + p[2], q[0] + q[2]) - Math.max(p[0], q[0]))
  * Math.max(0, Math.min(p[1] + p[3], q[1] + q[3]) - Math.max(p[1], q[1]));
const boxesOf = (f, side) => (f.members ? f.members.map((m) => m[side]) : [f[side]])
  .filter(Boolean);

/**
 * Findings for one viewport, simplified for review:
 * repeated spacing differences become one grouped item, pixel areas that a spacing/content
 * finding already explains are dropped, and everything gets a plain-language title.
 */
function findingsAt(r, vp) {
  const v = r.visual.find((x) => String(x.viewport) === String(vp));
  let list = [
    ...(r.changes || []).filter((c) => c.src?.[vp] || c.eds?.[vp]).map((c) => ({
      id: String(c.id),
      priority: c.priority || ELEMENT_PRIORITY[c.kind] || 'low',
      kind: c.kind,
      category: c.category,
      label: c.label,
      detail: c.detail,
      src: c.src?.[vp] || null,
      eds: c.eds?.[vp] || null,
    })),
    ...(v?.areas || []).map((a) => ({ ...a, id: String(a.id) })),
  ];
  // repeated spacing differences → one item
  (v?.patterns || []).forEach((pt, i) => {
    const ids = pt.ids.map(String);
    const members = list.filter((f) => ids.includes(f.id));
    if (members.length < 2) return;
    list = list.filter((f) => !ids.includes(f.id));
    const [from, to] = pt.transition.split(' → ');
    list.push({
      id: `p${vp}-${i + 1}`,
      kind: 'spacing',
      category: 'Spacing',
      priority: members.some((m) => m.priority === 'high') ? 'high' : 'medium',
      members,
      title: `${pt.delta > 0 ? `${pt.delta}px more` : `${-pt.delta}px less`} space between ${from}s and ${to} on EDS — ${members.length} places`,
      hint: 'Same difference repeats, so it is probably one global CSS rule (margin / padding). Fix it once.',
      src: members[0].src,
      eds: members[0].eds,
    });
  });
  // pixel differences already explained by a spacing / content finding
  const explained = list.filter((f) => f.category !== 'Visual');
  list = list.filter((f) => {
    if (f.kind !== 'visual' || !f.eds) return true;
    const covered = explained.reduce((a, o) => a + boxesOf(o, 'eds').reduce((b, x) => b + overlap(f.eds, x), 0), 0);
    return covered / area(f.eds) < 0.4;
  });
  const y = (f) => (f.eds || f.src)[1];
  return list
    .map((f) => ({ ...f, ...(f.title ? {} : describe(f)), type: typeOf(f) }))
    .sort((p, q) => PRIORITY_RANK2[p.priority] - PRIORITY_RANK2[q.priority] || y(p) - y(q))
    .map((f, i) => ({ ...f, num: i + 1 }));
}

const WIDTH_SUGGESTIONS = [
  320, 360, 390, 414, 600, 768, 820, 992, 1024, 1200, 1280, 1366, 1440, 1536, 1920,
];

/** "+ Add width": capture and compare one more width for this page, then show it. */
function addWidth(pair, vis) {
  const have = vis.map((v) => Number(v.viewport));
  const listId = `w-sugg-${pair.index}`;
  const options = [...new Set([...(state.config?.viewports || []), ...WIDTH_SUGGESTIONS])]
    .filter((w) => !have.includes(w)).sort((a, b) => a - b);
  const input = h('input', {
    type: 'number', min: '280', max: '2560', step: '1', placeholder: 'e.g. 1024', list: listId, 'aria-label': 'Width to add in pixels',
  });
  const status = h('span', { class: 'small muted', role: 'status' });
  const btn = h('button', { type: 'button', class: 'btn small' }, '+ Add width');
  const go = async () => {
    const w = Math.round(Number(input.value));
    if (!(w >= 280 && w <= 2560)) { status.textContent = 'Enter 280–2560'; return; }
    if (have.includes(w)) {
      state.preferVp = w;
      showRun(pair.index, 'visual');
      return;
    }
    btn.disabled = true;
    input.disabled = true;
    status.textContent = `Checking ${w}px… (about 30s)`;
    try {
      await api(`/api/jobs/${state.job.id}/viewport`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: pair.index, width: w }),
      });
      state.job = await api(`/api/jobs/${state.job.id}`);
      state.preferVp = w;
      showRun(pair.index, 'visual');
    } catch (e) {
      status.textContent = e.message;
      btn.disabled = false;
      input.disabled = false;
    }
  };
  btn.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  return h(
    'span',
    { class: 'add-width' },
    input,
    h('datalist', { id: listId }, options.map((w) => h('option', { value: String(w) }))),
    btn,
    status,
  );
}

function visualTab(pair, r, focusId) {
  const vis = r.visual;
  if (!vis.length) return h('div', { class: 'empty' }, 'No screenshots captured.');
  const owns = (f, id) => f.id === id || f.members?.some((m) => m.id === id);
  const hasFocus = (v) => findingsAt(r, v.viewport).some((f) => owns(f, focusId));
  const focusVp = focusId && vis.find(hasFocus);
  const widest = String(Math.max(...vis.map((x) => Number(x.viewport))));
  const preferred = vis.find((v) => Number(v.viewport) === state.preferVp);
  state.preferVp = null;
  let current = preferred || focusVp || vis.find((v) => v.viewport === widest) || vis[0];
  let view = 'side';
  let overlayMode = 'blend';
  let zoom = 1;
  let typeFilter = 'all';
  let outlineAll = false;
  let showMinor = false;
  let selected = focusVp ? findingsAt(r, focusVp.viewport).find((f) => owns(f, focusId))?.id : null;
  const wrap = h('div', { class: 'review' });
  const img = (name, alt) => {
    const src = asset(name);
    return src ? h('img', { src, alt, loading: 'lazy' }) : h('div', { class: 'placeholder' }, 'Screenshot not included in this report');
  };

  const scrollTo = (id) => {
    const scroller = wrap.querySelector('.shot-scroll');
    const marks = [...(scroller?.querySelectorAll(`[data-f="${id}"]`) || [])];
    if (!marks.length) return;
    const sr = scroller.getBoundingClientRect();
    const top = Math.min(...marks.map((m) => m.getBoundingClientRect().top)) - sr.top;
    scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + top - 120), behavior: 'smooth' });
  };

  const draw = () => {
    const v = current;
    const vp = v.viewport;
    const W = v.shotWidth || v.width;
    const all = findingsAt(r, vp);
    const counts = { high: 0, medium: 0, low: 0 };
    all.forEach((f) => { counts[f.priority] += 1; });
    const shown = all.filter((f) => typeFilter === 'all' || f.type === typeFilter);
    const sel = all.find((f) => f.id === selected) || null;

    // screenshot layer: a numbered pin per finding; outline + spotlight only for the selected one
    const layer = (H, side) => {
      const out = [];
      shown.forEach((f) => {
        const isSel = sel && f.id === sel.id;
        if (f.priority === 'low' && !showMinor && !isSel) return;
        let boxes = side === 'both' ? boxesOf(f, 'eds') : boxesOf(f, side);
        let dashed = false;
        if (side === 'both' && !boxes.length) { boxes = boxesOf(f, 'src'); dashed = true; }
        boxes.filter((b) => b[1] < H).forEach((b, i) => {
          const [x, y, w, bh] = b;
          if (isSel || outlineAll) {
            out.push(h('div', {
              class: `hl prio-${f.priority}${isSel ? ' selected' : ''}${isSel && !f.members ? ' spot' : ''}${dashed ? ' dashed' : ''}`,
              dataset: { f: f.id },
              style: {
                left: pctOf(Math.max(0, x - 4), W),
                top: pctOf(Math.max(0, y - 4), H),
                width: pctOf(Math.min(W, w + 8), W),
                height: pctOf(Math.max(8, bh + 8), H),
              },
            }));
          }
          if (i === 0 || isSel) {
            out.push(h('button', {
              type: 'button',
              class: `pin prio-${f.priority}${isSel ? ' selected' : ''}`,
              dataset: { f: f.id },
              style: { left: pctOf(Math.max(0, x), W), top: pctOf(Math.max(0, y), H) },
              title: `${f.num}. ${f.title}`,
              'aria-label': `Finding ${f.num}: ${f.title}`,
              // eslint-disable-next-line no-use-before-define
              onclick: () => choose(f.id),
            }, f.num));
          }
        });
      });
      return out;
    };
    const canvas = (H, side, ...kids) => h('div', { class: 'shot-canvas', style: { aspectRatio: `${W} / ${H}` } }, kids, layer(H, side));
    const hSrc = v.srcShotHeight || v.srcHeight;
    const hEds = v.edsShotHeight || v.edsHeight;
    const cap = { maxWidth: `${Math.round(W * zoom)}px` };
    const pageHead = (dot, label, url) => h(
      'div',
      { class: 'page-head' },
      h('span', { class: `dot ${dot}` }),
      h('b', null, label),
      h('a', {
        class: 'page-url', href: url, target: '_blank', rel: 'noopener noreferrer', title: url,
      }, url),
    );

    let stage;
    if (view === 'side') {
      stage = h(
        'div',
        { class: 'shot-grid', style: { width: `${zoom * 100}%` } },
        h('div', { class: 'shot', style: cap }, pageHead('grey', 'Original page', pair.original), canvas(hSrc, 'src', img(v.srcShot, 'Original page screenshot'))),
        h('div', { class: 'shot', style: cap }, pageHead('blue', 'EDS migrated page', pair.eds), canvas(hEds, 'eds', img(v.edsShot, 'EDS page screenshot'))),
      );
    } else {
      const H = Math.max(hSrc, hEds);
      let layers;
      let control = null;
      if (overlayMode === 'heatmap') {
        layers = [img(v.diffShot, 'Pixel difference heatmap')];
      } else {
        const top = h('div', { class: 'top' }, img(v.edsShot, 'EDS page screenshot'));
        const line = h('div', { class: 'swipe-line' });
        const range = h('input', {
          type: 'range', min: '0', max: '100', value: '50', 'aria-label': overlayMode === 'swipe' ? 'Swipe position' : 'EDS opacity',
        });
        const apply = () => {
          if (overlayMode === 'swipe') {
            top.style.clipPath = `inset(0 0 0 ${range.value}%)`;
            line.style.left = `${range.value}%`;
          } else top.style.opacity = String(range.value / 100);
        };
        range.addEventListener('input', apply);
        apply();
        layers = [img(v.srcShot, 'Original page screenshot'), top, overlayMode === 'swipe' ? line : null];
        control = h('span', { class: 'range' }, overlayMode === 'swipe' ? 'Original ◀' : 'Original', range, overlayMode === 'swipe' ? '▶ EDS' : 'EDS');
      }
      stage = h(
        'div',
        null,
        h(
          'div',
          { class: 'overlay-bar' },
          h('div', { class: 'seg' }, [['blend', 'Blend'], ['swipe', 'Swipe'], ['heatmap', 'Heatmap']].map(([k, l]) => h('button', {
            type: 'button', 'aria-pressed': String(overlayMode === k), onclick: () => { overlayMode = k; draw(); },
          }, l))),
          control,
          h('span', { class: 'small muted' }, overlayMode === 'heatmap' ? 'Red = pixels that differ after lining the pages up · blue = rows that only exist on EDS.' : 'Drag the slider to compare the two pages in place.'),
        ),
        h('div', { class: 'shot-grid single' }, h('div', { class: 'shot', style: cap }, canvas(H, 'both', layers))),
      );
    }

    // the "what's different" list
    const item = (f) => h(
      'li',
      null,
      h(
        'button',
        {
          type: 'button',
          class: `fi${sel && f.id === sel.id ? ' selected' : ''}`,
          dataset: { f: f.id },
          // eslint-disable-next-line no-use-before-define
          onclick: () => choose(f.id),
          'aria-expanded': String(!!(sel && f.id === sel.id)),
        },
        h('span', { class: `pin static prio-${f.priority}` }, f.num),
        h(
          'span',
          { class: 'fi-body' },
          h('span', { class: 'fi-title' }, f.title),
          h('span', { class: 'fi-hint' }, f.hint),
          sel && f.id === sel.id && f.members ? h('span', { class: 'fi-detail' }, h('b', null, 'Places: '), f.members.map((m) => m.detail.replace(/^Gap between /, '').replace(/:.*$/, '')).join(' · ')) : null,
          sel && f.id === sel.id && !f.members && f.detail && f.kind !== 'spacing' && !f.hint.includes(f.detail) ? h('span', { class: 'fi-detail' }, f.detail) : null,
          h('span', { class: 'fi-meta' }, TYPE_INFO[f.type].label, ' · ', whereText(f)),
        ),
      ),
    );
    const groupBlock = ([prio, label, blurb]) => {
      const list = shown.filter((f) => f.priority === prio);
      if (!list.length) return null;
      const body = h('ol', { class: 'fl' }, list.map(item));
      if (prio === 'low') {
        return h(
          'details',
          {
            class: 'fg',
            open: showMinor || (sel && sel.priority === 'low'),
            ontoggle: (e) => {
              if (showMinor !== e.target.open) { showMinor = e.target.open; draw(); }
            },
          },
          h('summary', null, h('span', { class: `fg-title prio-${prio}` }, `${label} (${list.length})`), h('span', { class: 'fg-blurb' }, blurb)),
          body,
        );
      }
      return h('div', { class: 'fg' }, h('div', { class: `fg-title prio-${prio}` }, `${label} (${list.length})`), h('div', { class: 'fg-blurb' }, blurb), body);
    };
    const nType = (t) => all.filter((f) => f.type === t).length;
    const panel = h(
      'aside',
      { class: 'fpanel', 'aria-label': 'What is different' },
      h('div', { class: 'fp-head' }, h('b', null, 'What’s different'), h('span', { class: 'muted small' }, ` at ${vp}px`)),
      h('div', { class: 'chips' }, [['all', `All (${all.length})`], ['content', `Content (${nType('content')})`], ['spacing', `Spacing (${nType('spacing')})`], ['visual', `Visual (${nType('visual')})`]]
        .map(([k, l]) => h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(typeFilter === k), onclick: () => { typeFilter = k; draw(); },
        }, l))),
      shown.length ? GROUPS.map(groupBlock) : h('div', { class: 'empty small' }, all.length ? 'Nothing of this type.' : 'No differences found at this width 🎉'),
    );

    const choose = (id) => {
      selected = selected === id ? null : id;
      draw();
      if (selected) {
        setTimeout(() => {
          scrollTo(selected);
          wrap.querySelector(`.fi[data-f="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
        }, 30);
      }
    };

    const zoomBtn = (d, label) => h('button', {
      type: 'button',
      class: 'btn icon',
      'aria-label': label,
      disabled: (d < 0 && zoom <= 0.5) || (d > 0 && zoom >= 2),
      onclick: () => {
        zoom = Math.round(Math.min(2, Math.max(0.5, zoom + d)) * 100) / 100;
        draw();
      },
    }, d < 0 ? '−' : '+');
    const exportBtn = STATIC
      ? h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, '⬇ Print / PDF')
      : h('a', { class: 'btn', href: `/api/jobs/${state.job.id}/report.html` }, '⬇ Export report');
    let verdict = `At ${vp}px everything important matches.`;
    if (counts.high) verdict = `At ${vp}px: ${counts.high} thing${counts.high > 1 ? 's' : ''} to fix first, ${counts.medium} worth checking.`;
    else if (counts.medium) verdict = `At ${vp}px nothing critical — ${counts.medium} thing${counts.medium > 1 ? 's' : ''} worth checking.`;

    fill(
      wrap,
      h(
        'div',
        { class: 'review-head' },
        h('div', null, h('h2', null, 'Difference review'), h('p', { class: 'muted' }, verdict)),
        exportBtn,
      ),
      h(
        'div',
        { class: 'cards review-cards' },
        [['Fix first', counts.high, counts.high ? 'bad' : 'good', 'Clear differences'],
          ['Worth checking', counts.medium, counts.medium ? 'mid' : 'good', 'Confirm if they matter'],
          ['Minor', counts.low, '', 'Usually fine'],
          ['Page height', h('span', null, (v.edsHeight || 0).toLocaleString(), h('small', null, ' px')), '', `EDS · original ${(v.srcHeight || 0).toLocaleString()}px`]]
          .map(([k, val, c, sub]) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: `v ${c}` }, val), h('div', { class: 'small muted' }, sub))),
      ),
      v.error ? h('div', { class: 'error-box' }, v.error) : null,
      !r.changes && !v.areas ? h('div', { class: 'error-box' }, 'This run was made before differences were marked — run the page again to see findings.') : null,
      h(
        'div',
        { class: 'review-panel' },
        h(
          'div',
          { class: 'review-toolbar' },
          h('div', { class: 'seg tabs-seg', role: 'tablist' }, [['side', 'Side by side'], ['overlay', 'Overlay']].map(([k, l]) => h('button', {
            type: 'button', role: 'tab', 'aria-selected': String(view === k), onclick: () => { view = k; draw(); },
          }, l))),
          h('span', { class: 'spacer' }),
          h('div', { class: 'seg' }, vis.map((x) => h('button', {
            type: 'button',
            'aria-pressed': String(x === current),
            onclick: () => { current = x; selected = null; draw(); },
          }, `${x.viewport}px`))),
          STATIC ? null : addWidth(pair, vis),
          h('label', { class: 'check small' }, h('input', {
            type: 'checkbox', checked: outlineAll, onchange: (e) => { outlineAll = e.target.checked; draw(); },
          }), 'Outline all'),
          h('div', { class: 'zoom' }, zoomBtn(-0.25, 'Zoom out'), h('span', { class: 'zoom-val' }, `${Math.round(zoom * 100)}%`), zoomBtn(0.25, 'Zoom in')),
        ),
        h('div', { class: 'review-body' }, h('div', { class: 'shot-scroll' }, stage), panel),
      ),
      h('p', { class: 'small muted' }, 'Pick an item in the list (or a numbered pin) to highlight it on both pages. Content that only moved up or down is ignored. Click the item again to clear the highlight.'),
    );
  };
  draw();
  if (selected) {
    setTimeout(() => {
      wrap.scrollIntoView({ block: 'start' });
      scrollTo(selected);
    }, 60);
  }
  return wrap;
}

function wordsHtml(words, side) {
  return words.map((w) => {
    if (w.type === 'equal') return `${w.text} `;
    if (side === 'a' && w.type === 'removed') return [h('del', null, w.text), ' '];
    if (side === 'b' && w.type === 'added') return [h('ins', null, w.text), ' '];
    return null;
  });
}

function diffTable(ops, { label, render, pair }) {
  let filter = 'diff';
  const wrap = h('div');
  const draw = () => {
    const shown = ops.filter((o) => filter === 'all' || o.type !== 'equal' || o.levelChanged);
    const kind = (o) => {
      if (o.regrouped) return badge('regrouped');
      if (o.levelChanged) return badge('level changed', 'changed');
      return badge({
        equal: 'same', changed: 'changed', removed: 'missing', added: 'extra',
      }[o.type], o.type);
    };
    fill(
      wrap,
      h('div', { class: 'chips' }, [['diff', 'Differences only'], ['all', 'Everything']].map(([k, l]) => h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(filter === k), onclick: () => { filter = k; draw(); },
      }, l))),
      shown.length ? h('div', { class: 'table-wrap' }, h(
        'table',
        { class: 'diff-table' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, `Original ${label}`), h('th', null, `EDS ${label}`), h('th', null, ''))),
        h('tbody', null, shown.slice(0, 2000).map((o) => h(
          'tr',
          { class: `${o.type}${o.regrouped ? ' regrouped' : ''}` },
          h('td', { class: 'kind' }, kind(o)),
          h('td', { class: 'a' }, o.a ? render(o, 'a') : ''),
          h('td', { class: 'b' }, o.b ? render(o, 'b') : ''),
          h('td', { class: 'loc' }, locateLink(pair, o.changeId)),
        ))),
      )) : h('div', { class: 'empty' }, 'No differences 🎉'),
    );
  };
  draw();
  return wrap;
}

function textTab(pair, r) {
  const t = r.text.stats;
  return h(
    'div',
    null,
    h(
      'div',
      { class: 'cards' },
      [['Text similarity', pct(t.similarity), tone(t.similarity * 100)], ['Words original → EDS', `${t.srcWords} → ${t.edsWords}`, ''],
        ['Missing blocks', t.missing, t.missing ? 'bad' : 'good'], ['Changed blocks', t.changed, t.changed ? 'mid' : 'good'],
        ['Extra blocks', t.extra, ''], ['Regrouped', t.regrouped, '']]
        .map(([k, v, c]) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: `v ${c}`, style: { fontSize: '18px' } }, v))),
    ),
    h('p', { class: 'small muted' }, '"Regrouped" text exists on both pages but is split or merged into different paragraphs — usually fine. Word-level changes are highlighted: ', h('del', null, 'removed'), ' ', h('ins', null, 'added'), '.'),
    diffTable(r.text.ops, {
      pair,
      label: 'text',
      render: (o, side) => {
        const item = o[side];
        return [h('span', { class: 'tag' }, item.tag), o.type === 'changed' ? wordsHtml(o.words, side) : item.text];
      },
    }),
  );
}

function headingsTab(pair, r) {
  const outline = (ops, side) => ops.filter((o) => o[side]).map((o) => h(
    'div',
    { class: 'outline-item', style: { paddingLeft: `${(o[side].level - 1) * 16}px` } },
    h('span', { class: 'tag' }, `H${o[side].level}`),
    o[side].text,
  ));
  const problems = (list) => (list.length ? h('ul', { class: 'list' }, list.map((p) => h('li', null, badge('outline', 'warning'), ' ', p))) : h('div', { class: 'small muted' }, 'Heading outline OK'));
  return h(
    'div',
    null,
    h(
      'div',
      { class: 'cols' },
      h('div', null, h('h3', null, 'Original outline'), problems(r.headings.srcOutline), outline(r.headings.ops, 'a')),
      h('div', null, h('h3', null, 'EDS outline'), problems(r.headings.edsOutline), outline(r.headings.ops, 'b')),
    ),
    h('h3', null, 'Differences'),
    diffTable(r.headings.ops, {
      pair,
      label: 'heading',
      render: (o, side) => [h('span', { class: 'tag' }, `H${o[side].level}`), o.type === 'changed' ? wordsHtml(o.words, side) : o[side].text],
    }),
  );
}

function linkTable(rows, cols) {
  if (!rows.length) return h('div', { class: 'small muted' }, 'None');
  return h('div', { class: 'table-wrap' }, h(
    'table',
    null,
    h('thead', null, h('tr', null, cols.map(([l]) => h('th', null, l)))),
    h('tbody', null, rows.slice(0, 500).map((row) => h('tr', null, cols.map(([, fn, cls]) => h('td', { class: cls || '' }, fn(row)))))),
  ));
}

function linksTab(pair, r) {
  const l = r.links;
  const href = (x) => (x?.href ? extLink(x.href) : '');
  const sections = [
    h('div', { class: 'cards' }, [['Links original → EDS', `${l.srcCount} → ${l.edsCount}`, ''], ['Matched', l.matched, 'good'], ['Missing on EDS', l.missing.length, l.missing.length ? 'bad' : 'good'],
      ['Different target', l.targetChanged.length, l.targetChanged.length ? 'mid' : 'good'], ['Extra on EDS', l.extra.length, '']]
      .map(([k, v, c]) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: `v ${c}`, style: { fontSize: '18px' } }, v)))),
    h('p', { class: 'small muted' }, 'Links are matched on their normalised destination: same-site paths ignore host, ".html" and trailing slashes; documents match on file name.'),
    h('h3', null, 'Missing on EDS'),
    linkTable(l.missing, [['Text', (x) => x.text || h('i', { class: 'muted' }, '(no text)')], ['Original href', href, 'url'], ['', (x) => locateLink(pair, x.changeId)]]),
    h('h3', null, 'Same text, different destination'),
    linkTable(l.targetChanged, [['Text', (x) => x.a.text], ['Original href', (x) => href(x.a), 'url'], ['EDS href', (x) => href(x.b), 'url'], ['', (x) => locateLink(pair, x.changeId)]]),
    h('h3', null, 'Extra on EDS'),
    linkTable(l.extra, [['Text', (x) => x.text || h('i', { class: 'muted' }, '(no text)')], ['EDS href', href, 'url'], ['', (x) => locateLink(pair, x.changeId)]]),
    h('h3', null, 'Same destination, different text'),
    linkTable(l.textChanged, [['Original text', (x) => x.a.text], ['EDS text', (x) => x.b.text], ['Destination', (x) => href(x.b), 'url'], ['', (x) => locateLink(pair, x.changeId)]]),
    h('h3', null, 'EDS links still pointing to the original domain'),
    linkTable(l.stillPointingToSource, [['Text', (x) => x.text], ['href', href, 'url']]),
  ];
  if (r.linkStatus) {
    const broken = r.linkStatus.filter((x) => !x.ok);
    sections.push(
      h('h3', null, `Link status check — ${broken.length} of ${r.linkStatus.length} failed`),
      linkTable(broken, [['Status', (x) => badge(x.status || x.error || 'error', x.internal ? 'error' : 'warning')], ['Internal', (x) => (x.internal ? 'yes' : 'no')], ['URL', (x) => extLink(x.url), 'url']]),
    );
  }
  return h('div', null, sections);
}

function thumbs(images) {
  if (!images.length) return h('div', { class: 'small muted' }, 'No images');
  return h('div', { class: 'thumbs' }, images.slice(0, 80).map((i) => h(
    'div',
    { class: 'thumb' },
    h('img', { src: i.src, alt: i.alt || '', loading: 'lazy' }),
    h('div', null, i.alt === null ? h('span', { class: 'noalt' }, 'no alt attribute') : (i.alt || h('i', { class: 'muted' }, 'alt="" (decorative)'))),
    h('div', { class: 'muted' }, `${i.w}×${i.h}${i.loaded ? '' : ' · not loaded'}`),
  )));
}

function mediaTab(pair, r) {
  const m = r.media;
  const list = (items, fn) => (items.length ? h('ul', { class: 'list' }, items.map((x) => h('li', null, fn(x)))) : h('div', { class: 'small muted' }, 'None'));
  return h(
    'div',
    null,
    h('div', { class: 'cards' }, [['Images original → EDS', `${m.srcImages.length} → ${m.edsImages.length}`, m.srcImages.length === m.edsImages.length ? 'good' : 'mid'],
      ['Background images', `${m.srcBgImages.length} → ${m.edsBgImages.length}`, ''], ['Broken on EDS', m.edsBroken.length, m.edsBroken.length ? 'bad' : 'good'],
      ['EDS missing alt', m.edsMissingAlt.length, m.edsMissingAlt.length ? 'bad' : 'good'], ['Videos / embeds', `${m.srcEmbeds.length} → ${m.edsEmbeds.length}`, m.missingEmbeds.length ? 'bad' : ''],
      ['Forms', `${m.forms.src} → ${m.forms.eds}`, m.forms.src > m.forms.eds ? 'bad' : '']]
      .map(([k, v, c]) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: `v ${c}`, style: { fontSize: '18px' } }, v)))),
    h('h3', null, 'Embeds missing on EDS'),
    list(m.missingEmbeds, (e) => [badge(e.tag), ' ', extLink(e.src)]),
    h('h3', null, 'Broken images on EDS'),
    list(m.edsBroken, (i) => extLink(i.src)),
    h('h3', null, 'Alt texts from the original not found on EDS'),
    list(m.missingAltTexts, (a) => a),
    h('div', { class: 'cols' }, h('div', null, h('h3', null, 'Original images'), thumbs(m.srcImages)), h('div', null, h('h3', null, 'EDS images'), thumbs(m.edsImages))),
  );
}

function metaTab(pair, r) {
  return h('div', { class: 'table-wrap' }, h(
    'table',
    null,
    h('thead', null, h('tr', null, ['Field', 'Original', 'EDS', ''].map((t) => h('th', null, t)))),
    h('tbody', null, r.meta.map((m) => h(
      'tr',
      null,
      h('td', null, h('b', null, m.label)),
      h('td', { class: 'url' }, m.src || h('i', { class: 'muted' }, '(none)')),
      h('td', { class: `url ${m.status === 'missing' ? 'cell-missing' : ''}${m.status === 'different' ? 'cell-mismatch' : ''}` }, m.eds || h('i', { class: 'muted' }, '(none)')),
      h('td', null, badge(m.status, m.status === 'n/a' ? '' : m.status)),
    ))),
  ));
}

function typographyTab(pair, r) {
  const vps = [...new Set(r.typography.map((x) => x.viewport))];
  if (!vps.length) return h('div', { class: 'empty' }, 'No typography captured.');
  let vp = vps[0];
  const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'letterSpacing', 'textTransform'];
  const wrap = h('div');
  const short = (p, v) => (p === 'fontFamily' && v ? v.split(',')[0].replace(/["']/g, '') : v);
  const draw = () => {
    const rows = r.typography.filter((x) => x.viewport === vp);
    fill(
      wrap,
      h('div', { class: 'chips' }, vps.map((x) => h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(x === vp), onclick: () => { vp = x; draw(); },
      }, `${x}px`))),
      h('p', { class: 'small muted' }, 'Computed styles of the first visible element of each type in the content area. Highlighted cells differ (tolerance: 1px font-size, 2px line-height).'),
      h('div', { class: 'table-wrap' }, h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', null, 'Element'), props.map((p) => h('th', null, p.replace(/([A-Z])/g, ' $1').toLowerCase())))),
        h('tbody', null, rows.map((row) => h(
          'tr',
          null,
          h(
            'td',
            null,
            h('b', null, row.selector),
            !row.presentEds ? h('div', null, badge('not on EDS', 'missing')) : null,
            !row.presentSrc ? h('div', null, badge('not on original')) : null,
            row.srcSample ? h('div', { class: 'small muted' }, `“${row.srcSample.slice(0, 40)}”`) : null,
          ),
          row.props.map((p) => h(
            'td',
            { class: p.match ? '' : 'cell-mismatch' },
            p.match ? short(p.prop, p.src ?? p.eds) : [h('div', null, h('span', { class: 'tag' }, 'O'), short(p.prop, p.src)), h('div', null, h('span', { class: 'tag' }, 'E'), short(p.prop, p.eds))],
          )),
        ))),
      )),
    );
  };
  draw();
  return wrap;
}

function networkTab(pair, r) {
  const block = (label, n) => h(
    'div',
    null,
    h('h3', null, `${label} — failed requests (${n.failed.length})`),
    linkTable(n.failed, [['Status', (x) => badge(x.status || x.error, x.sameSite ? 'error' : 'warning')], ['Same site', (x) => (x.sameSite ? 'yes' : 'no')], ['URL', (x) => x.url, 'url']]),
    h('h3', null, `${label} — JavaScript console errors (${n.console.length})`),
    n.console.length ? h('ul', { class: 'list' }, n.console.map((c) => h('li', { class: 'mono' }, c))) : h('div', { class: 'small muted' }, 'None'),
  );
  return h('div', { class: 'cols' }, block('EDS', r.network.eds), block('Original', r.network.src));
}

function notesTab(pair) {
  const n = pair.notes || {};
  if (STATIC) {
    return h(
      'div',
      null,
      h('h3', null, 'Reviewer verdict'),
      n.verdict ? badge(verdictLabel[n.verdict], n.verdict) : h('span', { class: 'muted' }, 'Not reviewed'),
      h('h3', null, 'Notes'),
      n.text ? h('div', { class: 'notes-text' }, n.text) : h('span', { class: 'muted' }, 'No notes'),
    );
  }
  const text = h('textarea', {
    id: 'f-notes', value: n.text || '', placeholder: 'What did you check? What still needs fixing?', style: { fontFamily: 'inherit', fontSize: '14px' },
  });
  const saved = h('span', { class: 'small muted' }, n.updatedAt ? `Saved ${fmtDate(n.updatedAt)}` : '');
  const radios = [['pass', 'Pass'], ['minor', 'Minor issues'], ['fail', 'Fail']].map(([v, l]) => h(
    'label',
    { class: 'verdict' },
    h('input', {
      type: 'radio', name: 'verdict', value: v, checked: n.verdict === v,
    }),
    l,
  ));
  const save = async () => {
    const verdict = radios.map((x) => x.querySelector('input')).find((i) => i.checked)?.value || '';
    try {
      await api(`/api/jobs/${state.job.id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: pair.index, verdict, text: text.value }),
      });
      pair.notes = { verdict, text: text.value, updatedAt: new Date().toISOString() };
      saved.textContent = `Saved ${fmtDate(pair.notes.updatedAt)} — included in the exported report`;
    } catch (e) { saved.textContent = `Save failed: ${e.message}`; }
  };
  return h(
    'div',
    null,
    h('p', { class: 'lead' }, 'Record your manual review. The verdict and notes appear in the summary, the HTML report and the CSV.'),
    h('div', { class: 'verdicts', role: 'radiogroup', 'aria-label': 'Verdict' }, radios),
    h('label', { class: 'field', for: 'f-notes' }, 'Notes'),
    text,
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn primary', onclick: save }, 'Save review'), saved),
  );
}

/* ------------------------------------------------------------ boot */

async function route() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (STATIC) {
      showRun(parts[0], parts[1], parts[2]);
      return;
    }
    if (parts[0] === 'run' && parts[1]) await openRun(parts[1], parts[2], parts[3], parts[4]);
    else if (parts[0] === 'history') await showHistory();
    else showForm();
  } catch (e) {
    fill(app, h('div', { class: 'panel' }, h('div', { class: 'error-box' }, e.message), h('p', null, h('a', { href: '#/new' }, 'Back to a new check'))));
  }
}

async function boot() {
  if (STATIC) {
    document.body.classList.add('static');
    state.job = window.REPORT;
  } else {
    try {
      state.config = await api('/api/config');
    } catch {
      // opened as a file, or the server isn't running: explain how to start it
      const code = (t) => h('pre', { class: 'mono', style: { background: '#f2f4f7', padding: '10px 12px', borderRadius: '8px' } }, t);
      fill(app, h(
        'div',
        { class: 'panel' },
        h('h2', null, 'Start the checker first'),
        h('p', { class: 'lead' }, 'This page needs the Page Parity Checker server. Opening index.html directly from disk will not work.'),
        h('ol', { class: 'list' }, h('li', null, 'Open a terminal in the project folder.'), h('li', null, 'First time only:', code('npm install')), h('li', null, 'Start the checker:', code('npm run compare')), h('li', null, 'Open ', h('a', { href: 'http://localhost:4100' }, 'http://localhost:4100'), ' in your browser.')),
      ));
      return;
    }
  }
  window.addEventListener('hashchange', route);
  route();
}

boot();
