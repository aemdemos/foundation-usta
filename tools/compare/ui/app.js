/* eslint-disable no-use-before-define */
/**
 * Page Parity Checker UI. Runs in two modes:
 *  - live:   served by tools/compare/server.mjs (form, history, progress, review marks)
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
    else if (k === 'style' && typeof v === 'object') {
      // custom properties (--x) need setProperty; plain keys can be assigned
      Object.entries(v).forEach(([prop, val]) => {
        if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val;
      });
    } else if (k === 'dataset') Object.assign(el.dataset, v);
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
        if (msg.type === 'done' && state.job.pairs.length === 1 && state.job.pairs[0].result
          && window.location.hash === `#/run/${id}`) {
          window.location.hash = `#/run/${id}/0/visual`;
          return;
        }
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
  fill(app, runHeader(job, pair, tab || 'visual'), pair ? pairDetail(pair, tab || 'visual', changeId) : runSummary(job));
  if (!pair) window.scrollTo(0, 0);
}

/** Findings + review progress for one page, across all compared widths. */
function pageStats(pair) {
  const r = pair.result;
  if (!r) return null;
  const all = r.visual.flatMap((v) => findingsAt(r, v.viewport));
  const reviews = pair.reviews || {};
  return {
    high: all.filter((f) => f.priority === 'high').length,
    medium: all.filter((f) => f.priority === 'medium').length,
    total: all.length,
    reviewed: all.filter((f) => reviews[f.id]).length,
    needsFix: all.filter((f) => reviews[f.id] === 'fix').length,
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const pagePath = (u) => {
  try {
    const x = new URL(u);
    return x.pathname + x.search || '/';
  } catch { return u; }
};

/** Plain status for a page: low score fails; otherwise what the findings say. */
function pageStatus(pair) {
  const r = pair.result;
  if (!r) return null;
  if (r.status === 'fail') return { label: 'Fail', cls: 'fail' };
  const st = pageStats(pair);
  if (st.high) return { label: 'Needs review', cls: 'review' };
  if (st.medium) return { label: 'Mostly matches', cls: 'review' };
  return { label: 'Matches', cls: 'pass' };
}

function pageNav(job, pair, tab) {
  const pages = job.pairs.filter((p) => p.result);
  if (pages.length < 2) return null;
  const i = pages.indexOf(pair);
  const link = (p, label, title) => h('a', {
    class: `btn small${p ? '' : ' disabled'}`, href: p ? runHref(p.index, tab) : null, 'aria-disabled': p ? null : 'true', title,
  }, label);
  return h(
    'span',
    { class: 'page-nav' },
    link(pages[i - 1], '‹', 'Previous page'),
    h('span', { class: 'small muted' }, `Page ${i + 1} of ${pages.length}`),
    link(pages[i + 1], '›', 'Next page'),
  );
}

function runHeader(job, pair, tab) {
  // widths actually compared (pages may have extra widths added after the run)
  const widths = [...new Set(job.pairs.flatMap((p) => p.viewports || job.options.viewports))]
    .sort((a, b) => a - b);
  const running = ['queued', 'running'].includes(job.status);
  const done = job.progress?.done || 0;
  const total = job.progress?.total || job.pairs.length;
  return h(
    'section',
    { class: 'runbar' },
    h(
      'div',
      { class: 'crumbs' },
      STATIC ? null : h('a', { href: '#/history' }, 'History'),
      STATIC ? null : h('span', { class: 'sep' }, '›'),
      pair ? h('a', { href: runHref() }, job.title) : h('span', { class: 'crumb-run' }, job.title),
      pair ? h('span', { class: 'sep' }, '›') : null,
      pair ? h('span', { class: 'crumb-run' }, pair.src?.title || pagePath(pair.original)) : null,
      h('span', { class: 'muted small' }, ` · ${fmtDate(job.createdAt)} · widths ${widths.join(', ')}px`),
      h('span', { class: 'spacer' }),
      pair ? pageNav(job, pair, tab) : null,
      STATIC ? h('button', { type: 'button', class: 'btn small', onclick: () => window.print() }, 'Print / Save as PDF') : null,
    ),
    running ? h(
      'div',
      { class: 'run-progress' },
      h('div', { class: `progress${done === 0 ? ' indeterminate' : ''}` }, h('div', { style: { width: `${Math.round((100 * done) / total)}%` } })),
      h('div', { class: 'small' }, `Comparing… ${done} of ${plural(total, 'page')} done · `, h('span', { id: 'progress-msg', class: 'muted' }, job.progress?.message || '')),
    ) : null,
    job.status === 'error' ? h('div', { class: 'error-box' }, job.error) : null,
  );
}

function runSummary(job) {
  const results = job.pairs.filter((p) => p.result);
  const stats = job.pairs.map(pageStats);
  const findings = stats.reduce((a, x) => a + (x?.total || 0), 0);
  const reviewed = stats.reduce((a, x) => a + (x?.reviewed || 0), 0);
  const firstTodo = job.pairs.find((p, i) => stats[i] && stats[i].reviewed < stats[i].total);

  const card = (p, i) => {
    const r = p.result;
    const st = stats[i];
    let status;
    if (r) status = badge(pageStatus(p).label, pageStatus(p).cls);
    else if (p.status === 'error') status = badge('Could not compare', 'fail');
    else status = badge(p.status === 'running' ? 'Comparing…' : 'Waiting', p.status === 'running' ? 'added' : '');
    const donePct = st && st.total ? Math.round((100 * st.reviewed) / st.total) : 0;
    let action = 'Review →';
    if (st?.reviewed) action = st.reviewed < st.total ? 'Continue review →' : 'Open →';
    return h(
      'li',
      { class: `page-card${r ? ' ready' : ''}` },
      h(
        'div',
        { class: 'pc-main' },
        r ? h('div', { class: 'ring small', style: { '--p': r.scores.overall, '--c': { good: 'var(--good)', mid: 'var(--mid)', bad: 'var(--bad)' }[tone(r.scores.overall)] }, title: 'Parity score (100 = identical)' }, h('span', null, r.scores.overall)) : h('div', { class: 'ring small idle' }, h('span', null, '…')),
        h(
          'div',
          { class: 'pc-text' },
          h('div', { class: 'pc-title' }, p.src?.title || pagePath(p.original), ' ', status),
          h('div', { class: 'pc-urls muted small' }, pagePath(p.original), ' → ', new URL(p.eds).host),
          p.status === 'error' ? h('div', { class: 'small error-text' }, p.error) : null,
          st ? h(
            'div',
            { class: 'pc-counts' },
            st.high ? h('span', { class: 'pill bad' }, `${st.high} to fix first`) : null,
            st.medium ? h('span', { class: 'pill mid' }, `${st.medium} worth checking`) : null,
            !st.high && !st.medium ? h('span', { class: 'pill good' }, 'No important differences') : null,
            st.needsFix ? h('span', { class: 'pill bad outline' }, `${st.needsFix} marked needs fix`) : null,
          ) : null,
        ),
      ),
      st ? h(
        'div',
        { class: 'pc-side' },
        h('div', { class: 'small muted' }, st.total ? `Reviewed ${st.reviewed} of ${st.total} · all widths` : 'Nothing to review'),
        h('div', { class: 'progress thin' }, h('div', { style: { width: `${donePct}%` } })),
        h('a', { class: `btn ${st.reviewed < st.total ? 'primary' : ''}`, href: runHref(p.index, 'visual') }, action),
      ) : null,
    );
  };

  const parts = [plural(job.pairs.length, 'page')];
  const by = (label) => results.filter((p) => pageStatus(p).label === label).length;
  if (results.length) {
    if (by('Matches')) parts.push(`${by('Matches')} match${by('Matches') === 1 ? 'es' : ''}`);
    if (by('Mostly matches')) parts.push(`${by('Mostly matches')} mostly match${by('Mostly matches') === 1 ? 'es' : ''}`);
    if (by('Needs review')) parts.push(`${by('Needs review')} need${by('Needs review') === 1 ? 's' : ''} review`);
    if (by('Fail')) parts.push(`${by('Fail')} failed`);
  }
  return h(
    'section',
    { class: 'panel' },
    h(
      'div',
      { class: 'review-head' },
      h(
        'div',
        null,
        h('h2', null, 'Pages in this run'),
        h('p', { class: 'muted' }, parts.join(' · '), findings ? ` · reviewed ${reviewed} of ${findings} findings` : ''),
      ),
      h(
        'div',
        { class: 'btn-row', style: { marginTop: 0 } },
        firstTodo ? h('a', { class: 'btn primary', href: runHref(firstTodo.index, 'visual') }, reviewed ? 'Continue reviewing →' : 'Start reviewing →') : null,
        STATIC || !['done', 'error'].includes(job.status) ? null : h('a', { class: 'btn', href: `/api/jobs/${job.id}/report.html` }, '⬇ Export report'),
      ),
    ),
    h('ol', { class: 'page-cards' }, job.pairs.map(card)),
    h('p', { class: 'small muted' }, 'The parity score (0–100) summarises how closely the EDS page matches the original: text 30%, visual 20%, links 15%, headings / images / typography 10% each, metadata 5%.'),
  );
}

/* ------------------------------------------------------------ pair detail */

const TABS = [['visual', 'Difference review'], ['issues', 'Issues']];
const DETAIL_TABS = [
  ['text', 'Text'], ['headings', 'Headings'], ['links', 'Links'], ['media', 'Images'], ['meta', 'Metadata'], ['typography', 'Typography'], ['network', 'Console'],
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
    return h('section', { class: 'panel' }, h('div', { class: 'empty' }, pair.error || 'This page has not been compared yet.'));
  }
  const s = r.scores;
  const ringColor = { good: 'var(--good)', mid: 'var(--mid)', bad: 'var(--bad)' }[tone(s.overall)];
  const scores = [['Visual', s.visual], ['Text', s.text], ['Headings', s.headings], ['Links', s.links], ['Images', s.media], ['Typography', s.typography], ['Metadata', s.meta]];
  const imperfect = scores.filter(([, v]) => v != null && v < 100);
  const head = h(
    'div',
    { class: 'pair-head compact' },
    h('div', { class: 'ring small', style: { '--p': s.overall, '--c': ringColor }, title: 'Parity score (100 = identical)' }, h('span', null, s.overall)),
    h(
      'div',
      { class: 'urls' },
      h('div', { class: 'url-line' }, h('span', { class: 'dot grey', title: 'Original' }), extLink(pair.original), pair.src?.status ? h('span', { class: 'muted small' }, ` HTTP ${pair.src.status}`) : null),
      h('div', { class: 'url-line' }, h('span', { class: 'dot blue', title: 'EDS' }), extLink(pair.eds), pair.edsInfo?.status ? h('span', { class: 'muted small' }, ` HTTP ${pair.edsInfo.status}`) : null),
    ),
    h(
      'div',
      { class: 'head-right' },
      badge(pageStatus(pair).label, pageStatus(pair).cls),
      h(
        'div',
        { class: 'score-chips', title: scores.map(([l, v]) => `${l} ${v ?? '–'}`).join(' · ') },
        imperfect.map(([label, v]) => h('span', { class: `score-chip ${tone(v)}` }, label, ' ', h('b', null, v))),
        h('span', { class: 'small muted' }, imperfect.length ? 'all other checks 100' : 'all checks 100'),
      ),
    ),
  );
  const tabLink = ([key, label]) => h(
    'a',
    { href: runHref(pair.index, key), 'aria-current': key === tab ? 'page' : null },
    label,
    tabCount(r, key),
  );
  const tabs = h(
    'nav',
    { class: 'tabs', 'aria-label': 'Comparison details' },
    TABS.map(tabLink),
    h('span', { class: 'spacer' }),
    h('span', { class: 'detail-tabs' }, h('span', { class: 'small muted' }, 'Details:'), DETAIL_TABS.map(tabLink)),
  );
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
  };
  return h('section', { class: 'panel pair-panel' }, head, tabs, (views[tab] || issuesTab)(pair, r, changeId));
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
const HOWTO_KEY = 'parity-checker-howto-hidden';
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
        // section-edge gaps say where the space is ("Above heading X, after the section above")
        title: f.place
          ? `${f.place[0].toUpperCase()}${f.place.slice(1)}: ${Math.abs(d)}px ${d > 0 ? 'more' : 'less'} space on EDS`
          : `${d > 0 ? `${d}px more` : `${Math.abs(d)}px less`} space on EDS`,
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
      if (f.category === 'Visual') return { title: 'Part of the original is missing on EDS', hint: f.detail };
      if (f.category === 'Heading') {
        return { title: 'Heading missing on EDS', hint: `“${f.detail}” is a heading (${(f.label.match(/h\d/) || ['heading'])[0]}) on the original but not on EDS.` };
      }
      return { title: f.label, hint: f.detail };
    case 'extra':
      return f.category === 'Visual'
        ? { title: 'Extra content on EDS', hint: f.detail }
        : { title: f.label, hint: f.detail };
    default:
      return { title: f.label, hint: f.detail };
  }
}

/** Say where a visual finding is: the closest heading at or above it on the EDS page. */
function nearHeading(f, headings) {
  if (f.category !== 'Visual' || !f.eds || !headings?.length) return f;
  const [x, y, w, bh] = f.eds;
  const inside = headings.find((hd) => hd.y >= y - 4 && hd.y <= y + bh
    && hd.x < x + w && hd.x + hd.w > x);
  const above = headings.filter((hd) => hd.y <= y + 4).sort((a, b) => b.y - a.y)[0];
  const hd = inside || above;
  const where = hd ? `near “${hd.text}”` : 'near the top of the page';
  const titles = {
    'Looks different here': `Looks different ${where}`,
    'This section looks different': `Section ${where} looks different`,
    'Part of the original is missing on EDS': `Part of the original is missing ${where}`,
    'Extra content on EDS': `Extra content on EDS ${where}`,
  };
  return { ...f, title: titles[f.title] || f.title };
}

const area = (b) => b[2] * b[3];
const overlap = (p, q) => Math.max(0, Math.min(p[0] + p[2], q[0] + q[2]) - Math.max(p[0], q[0]))
  * Math.max(0, Math.min(p[1] + p[3], q[1] + q[3]) - Math.max(p[1], q[1]));
const boxesOf = (f, side) => (f.members ? f.members.map((m) => m[side]) : [f[side]])
  .filter(Boolean);

const ROW_KINDS = ['spacing', 'visual', 'width', 'padding', 'size'];
const vOverlap = (a, b) => {
  if (!a || !b) return 0;
  const o = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return o / Math.max(1, Math.min(a[3], b[3]));
};
const rank = { high: 0, medium: 1, low: 2 };

/**
 * Findings of the same kind that sit on the same horizontal band (e.g. the gap under the left and
 * the right column of one two-column row) are one issue for the reviewer — merge them.
 */
function mergeRows(list) {
  const rows = [];
  const out = [];
  [...list].sort((p, q) => (p.eds || p.src)[1] - (q.eds || q.src)[1]).forEach((f) => {
    if (f.members || !ROW_KINDS.includes(f.kind)) { out.push(f); return; }
    const row = rows.find((g) => g.kind === f.kind && g.category === f.category
      && vOverlap(g.items[0].eds, f.eds) >= 0.5
      && (!g.items[0].src || !f.src || vOverlap(g.items[0].src, f.src) >= 0.3));
    if (row) row.items.push(f); else rows.push({ kind: f.kind, category: f.category, items: [f] });
  });
  rows.forEach(({ kind, items }) => {
    if (items.length === 1) { out.push(items[0]); return; }
    const first = items[0];
    const priority = items.map((f) => f.priority).sort((a, b) => rank[a] - rank[b])[0];
    const deltas = items.map((f) => f.delta ?? nums(f.measure)[0])
      .filter((d) => Number.isFinite(d));
    let title = `${describe(first).title} — ${items.length} areas in this row`;
    let hint = 'Several areas in the same row differ — compare this row on both pages.';
    if (kind === 'spacing' && deltas.length === items.length && deltas.every((d) => Math.sign(d) === Math.sign(deltas[0]))) {
      const lo = Math.min(...deltas.map(Math.abs));
      const hi = Math.max(...deltas.map(Math.abs));
      const amount = lo === hi ? `${lo}px` : `${lo}–${hi}px`;
      const t = first.transition || '';
      let where = '';
      if (t.startsWith('section top')) where = 'At the top of the section: ';
      else if (t.endsWith('section bottom')) where = 'At the bottom of the section: ';
      else if (t.startsWith('section end')) where = 'After the section above: ';
      title = `${where}${amount} ${deltas[0] > 0 ? 'more' : 'less'} space on EDS — ${items.length} columns in this row`;
      hint = 'The gap above/below this row differs in every column, so it is most likely the section padding/margin. Check the spacing of the section, not each block.';
    }
    out.push({
      ...first,
      id: `r-${first.id}`,
      priority,
      members: items,
      title,
      hint,
    });
  });
  return out;
}

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
  list = mergeRows(list);
  const y = (f) => (f.eds || f.src)[1];
  return list
    .map((f) => ({ ...f, ...(f.title ? {} : describe(f)), type: typeOf(f) }))
    .map((f) => nearHeading(f, v?.headings))
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
  let zoom = 1;
  let typeFilter = 'all';
  let outlineAll = false;
  let showMinor = false;
  let selected = focusVp ? findingsAt(r, focusVp.viewport).find((f) => owns(f, focusId))?.id : null;
  let keys = () => {};
  if (state.reviewKeys) document.removeEventListener('keydown', state.reviewKeys);
  state.reviewKeys = (e) => keys(e);
  document.addEventListener('keydown', state.reviewKeys);
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
      const placed = [];
      const near = W / 22; // ~ one pin width at normal zoom, in screenshot pixels
      const taken = (px, y) => placed
        .some(([qx, qy]) => Math.abs(qx - px) < near && Math.abs(qy - y) < near);
      const spot = (x, y) => {
        let px = x;
        while (taken(px, y)) px += near;
        placed.push([px, y]);
        return px;
      };
      shown.forEach((f) => {
        const isSel = sel && f.id === sel.id;
        if (f.priority === 'low' && !showMinor && !isSel) return;
        boxesOf(f, side).filter((b) => b[1] < H).forEach((b, i) => {
          const [x, y, w, bh] = b;
          if (isSel || outlineAll) {
            out.push(h('div', {
              class: `hl prio-${f.priority}${isSel ? ' selected' : ''}${isSel && !f.members ? ' spot' : ''}`,
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
              class: `pin prio-${f.priority}${isSel ? ' selected' : ''}${(pair.reviews || {})[f.id] ? ` rv-${pair.reviews[f.id]}` : ''}`,
              dataset: { f: f.id },
              style: {
                left: pctOf(Math.min(W - near, spot(Math.max(0, x), Math.max(0, y))), W),
                top: pctOf(Math.max(0, y), H),
              },
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

    const stage = h(
      'div',
      { class: 'shot-grid', style: { width: `${zoom * 100}%` } },
      h('div', { class: 'shot', style: cap }, pageHead('grey', 'Original page', pair.original), canvas(hSrc, 'src', img(v.srcShot, 'Original page screenshot'))),
      h('div', { class: 'shot', style: cap }, pageHead('blue', 'EDS migrated page', pair.eds), canvas(hEds, 'eds', img(v.edsShot, 'EDS page screenshot'))),
    );

    // the "what's different" list
    const reviews = pair.reviews || {};
    const order = GROUPS.flatMap(([prio]) => shown.filter((f) => f.priority === prio))
      .filter((f) => f.priority !== 'low' || showMinor || (sel && sel.id === f.id));
    const reviewedCount = all.filter((f) => reviews[f.id]).length;
    const STATE_LABEL = { ok: '✓ Looks fine', fix: '✗ Needs fix' };
    const mark = async (f, st) => {
      const after = order.slice(order.indexOf(f) + 1);
      const next = st ? after.find((x) => !reviews[x.id] && x.id !== f.id) : null;
      if (st) reviews[f.id] = st; else delete reviews[f.id];
      pair.reviews = reviews;
      if (!STATIC) {
        api(`/api/jobs/${state.job.id}/review`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: pair.index, id: f.id, state: st }),
        }).catch(() => {});
      }
      // eslint-disable-next-line no-use-before-define
      if (next) choose(next.id, true); else draw();
    };
    const item = (f) => {
      const isSel = sel && f.id === sel.id;
      const st = reviews[f.id];
      return h(
        'li',
        { class: `${isSel ? 'open' : ''}${st ? ` reviewed-${st}` : ''}` },
        h(
          'button',
          {
            type: 'button',
            class: `fi${isSel ? ' selected' : ''}`,
            dataset: { f: f.id },
            // eslint-disable-next-line no-use-before-define
            onclick: () => choose(f.id),
            'aria-expanded': String(!!isSel),
          },
          h('span', { class: `pin static prio-${f.priority}` }, f.num),
          h(
            'span',
            { class: 'fi-body' },
            h('span', { class: 'fi-title' }, f.title),
            h('span', { class: 'fi-hint' }, f.hint),
            isSel && f.members ? h('span', { class: 'fi-detail' }, h('b', null, 'Places: '), f.members.map((m) => (m.detail || m.title || '').replace(/^Gap between /, '').replace(/:.*$/, '')).join(' · ')) : null,
            isSel && !f.members && f.detail && f.kind !== 'spacing' && !f.hint.includes(f.detail) ? h('span', { class: 'fi-detail' }, f.detail) : null,
            h('span', { class: 'fi-tags' }, h('span', { class: `type-tag type-${f.type}` }, TYPE_INFO[f.type].label), h('span', { class: 'muted' }, whereText(f))),
          ),
          st ? h('span', { class: `rv rv-${st}`, title: STATE_LABEL[st] }, st === 'ok' ? '✓' : '✗') : null,
        ),
        isSel && !STATIC ? h(
          'div',
          { class: 'fi-actions' },
          h('button', { type: 'button', class: `btn small ok${st === 'ok' ? ' on' : ''}`, onclick: () => mark(f, st === 'ok' ? '' : 'ok') }, '✓ Looks fine'),
          h('button', { type: 'button', class: `btn small fix${st === 'fix' ? ' on' : ''}`, onclick: () => mark(f, st === 'fix' ? '' : 'fix') }, '✗ Needs fix'),
          h('span', { class: 'small muted' }, 'or press O / X'),
        ) : null,
        isSel ? fixBox(pair, { ...f, vp }, draw) : null,
      );
    };
    const groupBlock = ([prio, label, blurb]) => {
      const list = shown.filter((f) => f.priority === prio);
      if (!list.length) return null;
      const done = list.filter((f) => reviews[f.id]).length;
      const count = `${label} (${list.length})${done ? ` · ${done} reviewed` : ''}`;
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
          h('summary', null, h('span', { class: `fg-title prio-${prio}` }, count), h('span', { class: 'fg-blurb' }, blurb)),
          body,
        );
      }
      return h('div', { class: 'fg' }, h('div', { class: `fg-title prio-${prio}` }, count), h('div', { class: 'fg-blurb' }, blurb), body);
    };
    const nType = (t) => all.filter((f) => f.type === t).length;
    const step = (d) => {
      if (!order.length) return;
      const i = order.findIndex((f) => sel && f.id === sel.id);
      const fresh = d > 0 ? 0 : order.length - 1; // nothing selected yet: start at an end
      const next = order[i < 0 ? fresh : (i + d + order.length) % order.length];
      // eslint-disable-next-line no-use-before-define
      choose(next.id, true);
    };
    const pos = order.findIndex((f) => sel && f.id === sel.id);
    const panel = h(
      'aside',
      { class: 'fpanel', 'aria-label': 'What is different' },
      h(
        'div',
        { class: 'fp-top' },
        h(
          'div',
          { class: 'fp-head' },
          h('b', null, 'What’s different'),
          h('span', { class: 'muted small' }, ` at ${vp}px`),
          h('span', { class: 'spacer' }),
          h('button', {
            type: 'button', class: 'btn icon small', onclick: () => step(-1), disabled: !order.length, 'aria-label': 'Previous finding (↑)',
          }, '↑'),
          h('span', { class: 'small muted pos' }, pos >= 0 ? `${pos + 1} / ${order.length}` : `${order.length}`),
          h('button', {
            type: 'button', class: 'btn icon small', onclick: () => step(1), disabled: !order.length, 'aria-label': 'Next finding (↓)',
          }, '↓'),
        ),
        all.length ? h(
          'div',
          { class: 'progress-line' },
          h('div', { class: 'progress thin' }, h('div', { style: { width: `${Math.round((100 * reviewedCount) / all.length)}%` } })),
          h('span', { class: 'small muted' }, `Reviewed ${reviewedCount} of ${all.length}`),
        ) : null,
        STATIC || localStorage.getItem(HOWTO_KEY) ? null : h(
          'div',
          { class: 'howto' },
          h('span', null, 'Pick a finding → compare the highlighted area → mark ', h('b', null, '✓ fine'), ' or ', h('b', null, '✗ needs fix'), '. Keys: ↑ ↓ · O · X'),
          h('button', {
            type: 'button', class: 'howto-x', 'aria-label': 'Hide tip', onclick: () => { localStorage.setItem(HOWTO_KEY, '1'); draw(); },
          }, '✕'),
        ),
        h('div', { class: 'chips' }, [['all', `All ${all.length}`], ['content', `Content ${nType('content')}`], ['spacing', `Spacing ${nType('spacing')}`], ['visual', `Visual ${nType('visual')}`]]
          .filter(([k]) => k === 'all' || nType(k) || typeFilter === k)
          .map(([k, l]) => h('button', {
            type: 'button', class: 'chip', 'aria-pressed': String(typeFilter === k), onclick: () => { typeFilter = k; draw(); },
          }, l))),
      ),
      shown.length ? GROUPS.map(groupBlock) : h('div', { class: 'empty small' }, all.length ? 'Nothing of this type.' : 'No differences found at this width 🎉'),
    );

    const choose = (id, keep) => {
      selected = selected === id && !keep ? null : id;
      draw();
      if (selected) {
        setTimeout(() => {
          scrollTo(selected);
          wrap.querySelector(`.fi[data-f="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
        }, 30);
      }
    };

    // keyboard: ↑/↓ or K/J move, O = looks fine, X = needs fix, Esc = clear
    keys = (e) => {
      if (!wrap.isConnected) { document.removeEventListener('keydown', state.reviewKeys); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowdown' || k === 'j') { e.preventDefault(); step(1); }
      if (k === 'arrowup' || k === 'k') { e.preventDefault(); step(-1); }
      if (k === 'escape' && sel) { selected = null; draw(); }
      if (!STATIC && sel && (k === 'o' || k === 'x')) mark(sel, k === 'o' ? 'ok' : 'fix');
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
      ? h('button', { type: 'button', class: 'btn small', onclick: () => window.print() }, '⬇ Print / PDF')
      : h('a', { class: 'btn small', href: `/api/jobs/${state.job.id}/report.html` }, '⬇ Export report');
    let verdict = `${vp}px · matches`;
    if (counts.high || counts.medium) verdict = `${vp}px`;

    fill(
      wrap,
      v.error ? h('div', { class: 'error-box' }, v.error) : null,
      !r.changes && !v.areas ? h('div', { class: 'error-box' }, 'This run was made before differences were marked — run the page again to see findings.') : null,
      h(
        'div',
        { class: 'review-panel' },
        h(
          'div',
          { class: 'review-toolbar' },
          h('span', { class: 'rb-verdict' }, verdict),
          counts.high ? h('span', { class: 'pill bad' }, `${counts.high} fix first`) : null,
          counts.medium ? h('span', { class: 'pill mid' }, `${counts.medium} worth checking`) : null,
          counts.low ? h('span', { class: 'pill' }, `${counts.low} minor`) : null,
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
          exportBtn,
        ),
        h('div', { class: 'review-body' }, h('div', { class: 'shot-scroll' }, stage), panel),
      ),
      h('p', { class: 'small muted' }, `Content that only moved up or down is ignored. Findings in the same row are combined. Page height: EDS ${(v.edsHeight || 0).toLocaleString()}px · original ${(v.srcHeight || 0).toLocaleString()}px.`),
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

/* ------------------------------------------------------------ code fixes */

/** Same text the server appends (shown as a preview). */
function fixCss(fx, title) {
  const rule = (ind) => `${ind}${fx.selector} {\n${ind}  ${fx.prop}: ${fx.value};\n${ind}}`;
  const body = fx.minWidth ? `@media (width >= ${fx.minWidth}px) {\n${rule('  ')}\n}` : rule('');
  return `/* parity fix: ${title} */\n${body}`;
}

const fixKey = (fx) => [fx.file, fx.selector, fx.prop, fx.minWidth || 0].join('|');

/** Distinct fixes for a finding (grouped findings may share one rule). */
function fixesOf(f) {
  const seen = new Set();
  return (f.members || [f]).map((m) => m.fix).filter((fx) => {
    if (!fx || seen.has(fixKey(fx))) return false;
    seen.add(fixKey(fx));
    return true;
  });
}

async function loadFixes() {
  if (STATIC) return;
  try { state.fixes = await api('/api/fixes'); } catch { state.fixes = []; }
  renderChangesButton();
}

const appliedFor = (fx) => (state.fixes || []).find((e) => e.status === 'applied' && fixKey(e) === fixKey(fx) && e.value === fx.value);

/** "Suggested fix" box shown under a selected finding. */
function fixBox(pair, f, redraw) {
  const list = fixesOf(f);
  if (!list.length) {
    let msg = 'No automatic code fix for this one — compare the area by eye.';
    if (f.type === 'content') msg = 'Content difference — fix it in the page content (authoring), not in code.';
    return h('div', { class: 'fixbox none small muted' }, msg);
  }
  return h('div', { class: 'fixbox' }, list.map((fx) => {
    const title = `${f.title} (${pagePath(pair.eds)}, ${f.vp || ''}px)`.replace(/ \(([^,]+), px\)$/, ' ($1)');
    const applied = appliedFor(fx);
    const status = h('span', { class: 'small', role: 'status' });
    const copy = h('button', {
      type: 'button',
      class: 'btn small',
      onclick: async () => {
        try { await navigator.clipboard.writeText(fixCss(fx, title)); status.textContent = 'Copied'; } catch { status.textContent = 'Copy failed'; }
      },
    }, 'Copy');
    const apply = async () => {
      status.textContent = 'Applying…';
      try {
        const res = await api('/api/fixes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fix: fx,
            title,
            page: pair.eds,
            jobId: state.job.id,
            pairIndex: pair.index,
            findingId: f.id,
          }),
        });
        await loadFixes();
        state.lastChecks = { id: res.entry.id, ...res.checks };
        redraw();
      } catch (e) { status.textContent = e.message; }
    };
    const undo = async () => {
      try { await api(`/api/fixes/${applied.id}/undo`, { method: 'POST' }); await loadFixes(); redraw(); } catch (e) { status.textContent = e.message; }
    };
    const checks = applied && state.lastChecks?.id === applied.id ? state.lastChecks : null;
    let applyControls = null;
    if (!STATIC && applied) {
      applyControls = [h('span', { class: 'pill good' }, `✓ Added to ${fx.file}`), h('button', { type: 'button', class: 'btn small', onclick: undo }, 'Undo')];
    } else if (!STATIC) {
      applyControls = h('button', { type: 'button', class: 'btn small primary', onclick: apply }, 'Apply to code');
    }
    return h(
      'div',
      { class: 'fix' },
      h(
        'div',
        { class: 'fix-head' },
        h('b', null, 'Suggested fix'),
        h('span', { class: 'mono small' }, fx.file),
        fx.current ? h('span', { class: 'small muted' }, `now ${fx.prop}: ${fx.current}`) : null,
      ),
      fx.affects > 1 ? h('div', { class: 'small warn-text' }, `This selector matches ${fx.affects} elements on the page — check the others still look right.`) : null,
      h('pre', { class: 'fix-code' }, fixCss(fx, title)),
      h(
        'div',
        { class: 'btn-row', style: { marginTop: '6px' } },
        applyControls,
        copy,
        status,
      ),
      checks ? h(
        'div',
        { class: `small ${checks.stylelint.ok && checks.breakpoints.ok ? 'ok-text' : 'warn-text'}` },
        checks.stylelint.ok ? 'stylelint ✓' : 'stylelint found problems',
        ' · ',
        checks.breakpoints.ok ? 'breakpoint check ✓' : 'breakpoint check failed',
        checks.stylelint.ok && checks.breakpoints.ok ? null : h('pre', { class: 'fix-code' }, `${checks.stylelint.output}\n${checks.breakpoints.ok ? '' : checks.breakpoints.output}`.trim()),
      ) : null,
    );
  }));
}

/** Floating "Code changes (N)" button + drawer with undo and push-to-branch. */
function renderChangesButton() {
  if (STATIC) return;
  let btn = document.getElementById('changes-btn');
  const live = (state.fixes || []).filter((e) => e.status === 'applied');
  if (!btn) {
    btn = h('button', {
      type: 'button', id: 'changes-btn', class: 'changes-btn', onclick: () => toggleDrawer(),
    });
    document.body.append(btn);
  }
  btn.hidden = !(state.fixes || []).length;
  fill(btn, '⟨/⟩ Code changes ', h('span', { class: 'count' }, live.length));
  if (document.getElementById('changes-drawer')) toggleDrawer(true);
}

function toggleDrawer(keepOpen) {
  let d = document.getElementById('changes-drawer');
  if (d && !keepOpen) { d.remove(); return; }
  if (!d) {
    d = h('aside', { id: 'changes-drawer', class: 'changes-drawer', 'aria-label': 'Code changes' });
    document.body.append(d);
  }
  const all = state.fixes || [];
  const applied = all.filter((e) => e.status === 'applied');
  const pushed = all.filter((e) => e.status === 'pushed');
  const { git = {} } = state.config || {};
  const d8 = new Date();
  const branchInput = h('input', {
    type: 'text', value: `parity-fixes-${String(d8.getMonth() + 1).padStart(2, '0')}${String(d8.getDate()).padStart(2, '0')}`, 'aria-label': 'New branch name', class: 'mono',
  });
  const out = h('div', { role: 'status' });
  const push = async (ev) => {
    const name = branchInput.value.trim();
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Commit ${applied.length} change(s) to a new branch "${name}" and push it to GitHub?\n\nOnly these CSS rules are committed — your current branch and other local changes stay as they are.`)) return;
    ev.target.disabled = true;
    fill(out, h('span', { class: 'small muted' }, 'Committing and pushing…'));
    try {
      const res = await api('/api/git/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: name }) });
      state.lastPush = res;
      await loadFixes();
    } catch (e) {
      ev.target.disabled = false;
      fill(out, h('div', { class: 'error-box' }, e.message));
    }
  };
  const recheck = async (res) => {
    const { job } = state;
    if (!job || !res.previewBase) return;
    const pairs = job.pairs.map((p) => {
      const u = new URL(p.eds);
      return { original: p.original, eds: `${res.previewBase}${u.pathname}${u.search}` };
    });
    const { id } = await api('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs, options: { ...job.options }, title: `${job.title} — re-check on ${res.branch}` }),
    });
    toggleDrawer();
    window.location.hash = `#/run/${id}`;
  };
  const row = (e) => h(
    'li',
    { class: 'chg' },
    h('div', { class: 'mono small' }, e.file),
    h('div', { class: 'small' }, h('code', null, `${e.selector} { ${e.prop}: ${e.value} }`), e.minWidth ? h('span', { class: 'muted' }, ` · ≥ ${e.minWidth}px`) : null),
    h('div', { class: 'small muted' }, e.title),
    e.status === 'applied'
      ? h('button', {
        type: 'button',
        class: 'btn small',
        onclick: async () => { try { await api(`/api/fixes/${e.id}/undo`, { method: 'POST' }); await loadFixes(); route(); } catch (err) { fill(out, h('div', { class: 'error-box' }, err.message)); } },
      }, 'Undo')
      : h('span', { class: 'pill good' }, `pushed to ${e.branch}`),
  );
  const res = state.lastPush;
  fill(
    d,
    h('div', { class: 'cd-head' }, h('b', null, 'Code changes'), h('span', { class: 'spacer' }), h('button', {
      type: 'button', class: 'btn icon small', 'aria-label': 'Close', onclick: () => toggleDrawer(),
    }, '✕')),
    h('p', { class: 'small muted' }, 'Rules you applied are already in your local files (the local dev server shows them). Push them to a new branch to preview on aem.page and open a pull request.'),
    applied.length ? h('ol', { class: 'chg-list' }, applied.map(row)) : h('div', { class: 'small muted' }, 'No unpushed changes.'),
    applied.length ? h(
      'div',
      { class: 'cd-push' },
      h('label', { class: 'small' }, 'New branch'),
      branchInput,
      h('button', { type: 'button', class: 'btn primary', onclick: push }, `Push ${applied.length} change${applied.length > 1 ? 's' : ''} to new branch`),
      h('div', { class: 'small muted' }, `From ${git.branch || 'the current branch'} → github.com/${git.owner || '?'}/${git.repo || '?'}`),
    ) : null,
    out,
    res ? h(
      'div',
      { class: 'cd-done' },
      h('div', null, h('b', null, `✓ Pushed ${res.count} change${res.count > 1 ? 's' : ''} to `), h('code', null, res.branch)),
      h(
        'div',
        { class: 'btn-row' },
        res.previewBase ? h('a', {
          class: 'btn small', href: `${res.previewBase}${state.job ? new URL(state.job.pairs[0].eds).pathname : '/'}`, target: '_blank', rel: 'noopener noreferrer',
        }, 'Preview on branch ↗') : null,
        res.prUrl ? h('a', {
          class: 'btn small', href: res.prUrl, target: '_blank', rel: 'noopener noreferrer',
        }, 'Open pull request ↗') : null,
        state.job ? h('button', { type: 'button', class: 'btn small primary', onclick: () => recheck(res) }, 'Re-check on branch') : null,
      ),
      h('div', { class: 'small muted' }, 'AEM Code Sync needs a moment to pick up a new branch before its preview is ready.'),
    ) : null,
    pushed.length ? h('details', { class: 'small' }, h('summary', null, `Pushed earlier (${pushed.length})`), h('ol', { class: 'chg-list' }, pushed.map(row))) : null,
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
  loadFixes();
}

boot();
