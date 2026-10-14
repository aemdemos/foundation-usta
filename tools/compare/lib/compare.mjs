/**
 * Pure comparison logic for the Original-vs-EDS parity checker.
 * Input: two capture objects produced by capture.mjs. Output: per-category diffs,
 * scores and a flat issue list. No I/O here, so it's easy to reason about and test.
 */

const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|csv|rtf|zip)$/i;

/* ---------------------------------------------------------------- text utils */

export function normalizeText(s) {
  return String(s ?? '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

const words = (s) => normalizeText(s).toLowerCase().split(/[^\p{L}\p{N}'$%&@-]+/u).filter(Boolean);

/** Dice similarity on word multisets (0..1). */
export function similarity(a, b) {
  const wa = words(a);
  const wb = words(b);
  if (!wa.length && !wb.length) return 1;
  if (!wa.length || !wb.length) return 0;
  const counts = new Map();
  wa.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  let common = 0;
  wb.forEach((w) => {
    const c = counts.get(w);
    if (c) { common += 1; counts.set(w, c - 1); }
  });
  return (2 * common) / (wa.length + wb.length);
}

/**
 * LCS-based sequence diff. Returns ops: {type: equal|removed|added, a, b}.
 * Falls back to a set-based diff when the DP table would be too large.
 */
export function sequenceDiff(a, b, key = (x) => x) {
  const ka = a.map(key);
  const kb = b.map(key);
  const n = a.length;
  const m = b.length;
  if (n * m > 16e6) {
    const inB = new Set(kb);
    const inA = new Set(ka);
    return [
      ...a.map((x, i) => ({ type: inB.has(ka[i]) ? 'equal' : 'removed', a: x })),
      ...b.filter((x, j) => !inA.has(kb[j])).map((x) => ({ type: 'added', b: x })),
    ];
  }
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i * w + j] = ka[i] === kb[j]
        ? dp[(i + 1) * w + j + 1] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) {
      ops.push({ type: 'equal', a: a[i], b: b[j] });
      i += 1; j += 1;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      ops.push({ type: 'removed', a: a[i] });
      i += 1;
    } else {
      ops.push({ type: 'added', b: b[j] });
      j += 1;
    }
  }
  while (i < n) { ops.push({ type: 'removed', a: a[i] }); i += 1; }
  while (j < m) { ops.push({ type: 'added', b: b[j] }); j += 1; }
  return ops;
}

/** Word-level diff of two strings → [{type, text}] for inline highlighting. */
export function wordDiff(a, b) {
  const ta = normalizeText(a).split(' ');
  const tb = normalizeText(b).split(' ');
  return sequenceDiff(ta, tb).map((op) => ({
    type: op.type,
    text: op.type === 'added' ? op.b : op.a,
  }));
}

/**
 * Pair adjacent removed/added runs into "changed" ops when they are similar enough.
 * `text` extracts the comparable string from an item.
 */
function pairChanges(ops, text, threshold = 0.5) {
  const out = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].type === 'equal') { out.push(ops[k]); k += 1; } else {
      const removed = [];
      const added = [];
      while (k < ops.length && ops[k].type !== 'equal') {
        if (ops[k].type === 'removed') removed.push(ops[k].a); else added.push(ops[k].b);
        k += 1;
      }
      const usedB = new Set();
      const run = [];
      removed.forEach((ra) => {
        let best = -1;
        let bestSim = threshold;
        added.forEach((ab, idx) => {
          if (usedB.has(idx)) return;
          const s = similarity(text(ra), text(ab));
          if (s >= bestSim) { bestSim = s; best = idx; }
        });
        if (best >= 0) {
          usedB.add(best);
          run.push({
            type: 'changed', a: ra, b: added[best], sim: bestSim, words: wordDiff(text(ra), text(added[best])),
          });
        } else run.push({ type: 'removed', a: ra });
      });
      added.forEach((ab, idx) => { if (!usedB.has(idx)) run.push({ type: 'added', b: ab }); });
      out.push(...run);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- url utils */

function siteHosts(src, eds) {
  const hosts = new Set(['localhost', '127.0.0.1']);
  [src.finalUrl || src.url, eds.finalUrl || eds.url].forEach((u) => {
    try {
      const h = new URL(u).hostname;
      hosts.add(h);
      hosts.add(h.replace(/^www\./, ''));
      hosts.add(`www.${h.replace(/^www\./, '')}`);
    } catch { /* ignore */ }
  });
  return hosts;
}

const isSiteHost = (host, hosts) => hosts.has(host) || /--[^.]+--[^.]+\.aem\.(live|page)$/.test(host)
  || /\.(hlx|aem)\.(live|page)$/.test(host);

/** Normalize a site path so `/en/a.html`, `/content/site/en/a.html` and `/en/a/` compare equal. */
export function normalizePath(p) {
  let path = decodeURIComponent(p || '/').toLowerCase();
  if (!path.startsWith('/content/dam/')) path = path.replace(/^\/content\/[^/]+(?=\/)/, '');
  path = path.replace(/\.html?$/, '').replace(/\/index$/, '').replace(/\/+$/, '');
  return path || '/';
}

/** Comparable key for a link href. */
export function linkKey(href, hosts) {
  if (!href) return '';
  const h = href.trim();
  if (/^(mailto|tel|sms):/i.test(h)) return h.toLowerCase();
  if (/^javascript:/i.test(h) || h === '#') return '';
  let u;
  try { u = new URL(h); } catch { return h; }
  if (!/^https?:$/.test(u.protocol)) return h;
  if (isSiteHost(u.hostname, hosts)) {
    if (DOC_EXT.test(u.pathname)) return `doc:${u.pathname.split('/').pop().toLowerCase()}`;
    const hash = u.hash && u.hash.length > 1 ? u.hash : '';
    return `site:${normalizePath(u.pathname)}${hash}`;
  }
  // external: keep host+path+query, but neutralise any embedded site URL (share links)
  let q = u.search;
  hosts.forEach((host) => {
    q = q.split(encodeURIComponent(`https://${host}`)).join('{site}')
      .split(`https://${host}`).join('{site}');
  });
  q = q.replace(/\{site\}([^&]*)/g, (m, rest) => `{site}${normalizePath(decodeURIComponent(rest))}`);
  return `ext:${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}${q}`;
}

function embedKey(src) {
  try {
    const u = new URL(src);
    const yt = u.pathname.match(/\/(?:embed|shorts)\/([\w-]{6,})/) || [null, u.searchParams.get('v')];
    if (/youtu/.test(u.hostname) && yt[1]) return `youtube:${yt[1]}`;
    const vimeo = u.pathname.match(/\/(?:video\/)?(\d{5,})/);
    if (/vimeo/.test(u.hostname) && vimeo) return `vimeo:${vimeo[1]}`;
    return `${u.hostname.replace(/^www\./, '')}${u.pathname}`;
  } catch { return src; }
}

/* ---------------------------------------------------------------- categories */

function compareText(src, eds) {
  const a = src.content.blocks;
  const b = eds.content.blocks;
  const ops = pairChanges(
    sequenceDiff(a, b, (x) => normalizeText(x.text).toLowerCase()),
    (x) => x.text,
    0.5,
  );
  const fullA = normalizeText(a.map((x) => x.text).join(' ')).toLowerCase();
  const fullB = normalizeText(b.map((x) => x.text).join(' ')).toLowerCase();
  // a "removed" chunk whose text still appears in the other page was just split/regrouped
  ops.forEach((op) => {
    if (op.type === 'removed' && fullB.includes(normalizeText(op.a.text).toLowerCase())) op.regrouped = true;
    if (op.type === 'added' && fullA.includes(normalizeText(op.b.text).toLowerCase())) op.regrouped = true;
  });
  const count = (t, extra = () => true) => ops.filter((o) => o.type === t && extra(o)).length;
  const stats = {
    srcBlocks: a.length,
    edsBlocks: b.length,
    equal: count('equal'),
    changed: count('changed'),
    missing: count('removed', (o) => !o.regrouped),
    extra: count('added', (o) => !o.regrouped),
    regrouped: count('removed', (o) => o.regrouped) + count('added', (o) => o.regrouped),
    srcWords: src.content.wordCount,
    edsWords: eds.content.wordCount,
    similarity: similarity(fullA, fullB),
  };
  return { ops, stats };
}

function compareHeadings(src, eds) {
  const ops = sequenceDiff(src.content.headings, eds.content.headings, (h) => normalizeText(h.text).toLowerCase());
  const paired = pairChanges(ops, (h) => h.text, 0.6);
  paired.forEach((op) => {
    if (op.type === 'equal' && op.a.level !== op.b.level) op.levelChanged = true;
  });
  const outline = (hs) => {
    const problems = [];
    const h1s = hs.filter((h) => h.level === 1).length;
    if (h1s === 0) problems.push('No <h1> on the page');
    if (h1s > 1) problems.push(`${h1s} <h1> elements (expected 1)`);
    let prev = 0;
    hs.forEach((h) => {
      if (prev && h.level > prev + 1) problems.push(`Skipped heading level: h${prev} → h${h.level} ("${h.text.slice(0, 60)}")`);
      prev = h.level;
    });
    return problems;
  };
  return {
    ops: paired,
    srcOutline: outline(src.content.headings),
    edsOutline: outline(eds.content.headings),
  };
}

function compareLinks(src, eds, hosts) {
  const prep = (links) => links
    .map((l, idx) => ({
      ...l, idx, key: linkKey(l.href, hosts), textN: normalizeText(l.text).toLowerCase(),
    }))
    .filter((l) => l.key);
  const a = prep(src.content.links);
  const b = prep(eds.content.links);
  const pool = new Map();
  b.forEach((l, i) => {
    if (!pool.has(l.key)) pool.set(l.key, []);
    pool.get(l.key).push(i);
  });
  const usedB = new Set();
  const matched = [];
  const unmatchedA = [];
  a.forEach((l) => {
    const cands = (pool.get(l.key) || []).filter((i) => !usedB.has(i));
    if (cands.length) {
      const exact = cands.find((i) => b[i].textN === l.textN);
      const pick = exact ?? cands[0];
      usedB.add(pick);
      matched.push({ a: l, b: b[pick], textChanged: b[pick].textN !== l.textN });
    } else unmatchedA.push(l);
  });
  // same visible text, different destination
  const targetChanged = [];
  const missing = [];
  unmatchedA.forEach((l) => {
    const i = l.textN ? b.findIndex((x, idx) => !usedB.has(idx) && x.textN === l.textN) : -1;
    if (i >= 0) {
      usedB.add(i);
      targetChanged.push({ a: l, b: b[i] });
    } else missing.push(l);
  });
  const extra = b.filter((l, i) => !usedB.has(i));
  return {
    srcCount: a.length,
    edsCount: b.length,
    matched: matched.length,
    textChanged: matched.filter((m) => m.textChanged && m.a.textN && m.b.textN),
    targetChanged,
    missing,
    extra,
    stillPointingToSource: b.filter((l) => {
      try {
        const host = new URL(l.href).hostname;
        const srcHost = new URL(src.finalUrl || src.url).hostname;
        return host === srcHost && !DOC_EXT.test(new URL(l.href).pathname);
      } catch { return false; }
    }),
  };
}

function compareMedia(src, eds) {
  const vis = (imgs) => imgs.filter((i) => i.visible && i.w >= 4 && i.h >= 4);
  const ia = vis(src.content.images);
  const ib = vis(eds.content.images);
  const altA = ia.map((i) => normalizeText(i.alt).toLowerCase()).filter(Boolean);
  const altB = new Set(ib.map((i) => normalizeText(i.alt).toLowerCase()).filter(Boolean));
  const ea = src.content.embeds.map((e) => ({ ...e, key: embedKey(e.src) }));
  const eb = eds.content.embeds.map((e) => ({ ...e, key: embedKey(e.src) }));
  const ebKeys = new Set(eb.map((e) => e.key));
  const eaKeys = new Set(ea.map((e) => e.key));
  return {
    srcImages: ia,
    edsImages: ib,
    srcBgImages: src.content.bgImages,
    edsBgImages: eds.content.bgImages,
    missingAltTexts: [...new Set(altA.filter((t) => !altB.has(t)))],
    edsMissingAlt: ib.filter((i) => i.alt === null),
    edsBroken: eds.content.images.filter((i) => !i.loaded && i.src && i.visible),
    srcEmbeds: ea,
    edsEmbeds: eb,
    missingEmbeds: ea.filter((e) => !ebKeys.has(e.key)),
    extraEmbeds: eb.filter((e) => !eaKeys.has(e.key)),
    forms: { src: src.content.forms, eds: eds.content.forms },
  };
}

const META_FIELDS = [
  ['title', 'Title', 'warning'],
  ['description', 'Meta description', 'warning'],
  ['og:title', 'og:title', 'info'],
  ['og:description', 'og:description', 'info'],
  ['og:image', 'og:image (present)', 'info'],
  ['twitter:card', 'twitter:card', 'info'],
  ['canonical', 'Canonical (path)', 'info'],
  ['robots', 'Robots', 'warning'],
  ['lang', '<html lang>', 'warning'],
  ['keywords', 'Meta keywords', 'info'],
  ['jsonLd', 'JSON-LD blocks', 'info'],
];

function compareMeta(src, eds) {
  const value = (cap, field) => {
    const v = cap.meta[field];
    if (field === 'og:image') return v ? 'present' : '';
    if (field === 'canonical' && v) {
      try { return normalizePath(new URL(v).pathname); } catch { return v; }
    }
    return normalizeText(v ?? '');
  };
  return META_FIELDS.map(([field, label, severity]) => {
    const a = value(src, field);
    const b = value(eds, field);
    let status = 'match';
    if (!a && !b) status = 'n/a';
    else if (!b) status = 'missing';
    else if (!a) status = 'extra';
    else if (a !== b) status = 'different';
    return {
      field, label, src: src.meta[field] ?? '', eds: eds.meta[field] ?? '', status, severity,
    };
  });
}

const TYPO_PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'letterSpacing', 'textTransform'];

function sameTypo(prop, a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (prop === 'fontFamily') {
    const first = (f) => f.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
    return first(a) === first(b);
  }
  if (['fontSize', 'lineHeight', 'letterSpacing'].includes(prop)) {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      return (a === 'normal' && b === '0px') || (a === '0px' && b === 'normal');
    }
    return Math.abs(na - nb) <= (prop === 'fontSize' ? 1 : 2);
  }
  if (prop === 'fontWeight') return Math.abs(parseInt(a, 10) - parseInt(b, 10)) < 100;
  return false;
}

function compareTypography(src, eds) {
  const rows = [];
  Object.keys(src.viewports).forEach((vp) => {
    const ta = src.viewports[vp]?.typography || {};
    const tb = eds.viewports[vp]?.typography || {};
    Object.keys({ ...ta, ...tb }).forEach((sel) => {
      const props = TYPO_PROPS.map((p) => ({
        prop: p,
        src: ta[sel]?.[p] ?? null,
        eds: tb[sel]?.[p] ?? null,
        match: !ta[sel] || !tb[sel] || sameTypo(p, ta[sel]?.[p], tb[sel]?.[p]),
      }));
      rows.push({
        viewport: vp,
        selector: sel,
        srcSample: ta[sel]?.sample || '',
        edsSample: tb[sel]?.sample || '',
        presentSrc: !!ta[sel],
        presentEds: !!tb[sel],
        props,
        mismatches: props.filter((p) => !p.match).length,
      });
    });
  });
  return rows;
}

const union = (boxes) => {
  const bs = boxes.filter(Boolean);
  if (!bs.length) return null;
  const x0 = Math.min(...bs.map((b) => b[0]));
  const y0 = Math.min(...bs.map((b) => b[1]));
  const x1 = Math.max(...bs.map((b) => b[0] + b[2]));
  const y1 = Math.max(...bs.map((b) => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
};
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/**
 * Turn the raw diff areas of one viewport into numbered, prioritised findings.
 * Neighbouring missing/extra runs are clustered: missing + extra together = a section that differs.
 */
function visualFindings(vp, areas = []) {
  const out = [];
  const gaps = areas.filter((a) => a.kind !== 'visual').sort((p, q) => p.src[1] - q.src[1]);
  const clusters = [];
  gaps.forEach((g) => {
    const last = clusters[clusters.length - 1];
    const span = (list, side) => union(list.map((x) => x[side]));
    if (last) {
      const ls = span(last, 'src');
      const le = span(last, 'eds');
      if (g.src[1] <= ls[1] + ls[3] + 32 && g.eds[1] <= le[1] + le[3] + 32) { last.push(g); return; }
    }
    clusters.push([g]);
  });
  clusters.forEach((cl) => {
    const has = (k) => cl.some((g) => g.kind === k);
    const missing = cl.filter((g) => g.kind === 'missing' || g.kind === 'spacing-missing');
    const extra = cl.filter((g) => g.kind === 'extra' || g.kind === 'spacing-extra');
    const content = has('missing') || has('extra');
    const srcBox = union((missing.length ? missing : cl).map((g) => g.src));
    const edsBox = union((extra.length ? extra : cl).map((g) => g.eds));
    const mh = missing.reduce((a, g) => a + g.src[3], 0);
    const eh = extra.reduce((a, g) => a + g.eds[3], 0);
    let f;
    if (!content) {
      f = {
        kind: 'spacing', priority: 'low', label: 'Spacing differs', detail: `Vertical white space differs by about ${Math.abs(eh - mh)}px (original ${mh}px vs EDS ${eh}px).`,
      };
    } else if (missing.length && extra.length) {
      f = {
        kind: 'section', priority: Math.max(mh, eh) >= 120 ? 'high' : 'medium', label: 'Section differs', detail: `A ${mh}px tall part of the original was replaced by ${eh}px of different content on EDS (layout, wrapping or content change).`,
      };
    } else if (missing.length) {
      f = {
        kind: 'missing', priority: mh >= 80 ? 'high' : 'medium', label: 'Section missing on EDS', detail: `About ${mh}px of the original has no matching area on EDS.`,
      };
    } else {
      f = {
        kind: 'extra', priority: eh >= 80 ? 'medium' : 'low', label: 'Extra section on EDS', detail: `About ${eh}px on EDS has no matching area on the original.`,
      };
    }
    out.push({ ...f, src: srcBox, eds: edsBox });
  });
  areas.filter((a) => a.kind === 'visual' && a.ratio >= 0.05).forEach((a) => {
    const area = a.eds[2] * a.eds[3];
    let priority = 'low';
    if (a.ratio >= 0.3 && area >= 5000) priority = 'high';
    else if (a.ratio >= 0.1 && area >= 2000) priority = 'medium';
    out.push({
      kind: 'visual', priority, label: 'Visual difference', detail: `${a.eds[2]}×${a.eds[3]}px area — ${Math.round(a.ratio * 100)}% of its pixels differ.`, src: a.src, eds: a.eds,
    });
  });
  return out
    .sort((p, q) => PRIORITY_RANK[p.priority] - PRIORITY_RANK[q.priority] || q.eds[2] * q.eds[3] - p.eds[2] * p.eds[3])
    .slice(0, 30)
    .map((f, i) => ({ ...f, id: `v${vp}-${i + 1}`, category: 'Visual' }));
}

function compareVisual(src, eds, diffs) {
  return Object.keys(src.viewports).map((vp) => {
    const va = src.viewports[vp] || {};
    const vb = eds.viewports[vp] || {};
    const d = diffs?.[vp] || {};
    const ha = va.layout?.scrollHeight || 0;
    const hb = vb.layout?.scrollHeight || 0;
    return {
      viewport: vp,
      width: Number(vp),
      srcShot: va.screenshot,
      edsShot: vb.screenshot,
      diffShot: d.diffShot,
      mismatch: d.mismatch ?? null,
      foldMismatch: d.foldMismatch ?? null,
      areas: visualFindings(vp, d.areas),
      // screenshot pixel size (both shots are padded to the same size when diffed)
      shotWidth: d.width || Number(vp),
      srcShotHeight: d.height || va.shotHeight || ha,
      edsShotHeight: d.height || vb.shotHeight || hb,
      srcHeight: ha,
      edsHeight: hb,
      heightDelta: ha ? (hb - ha) / ha : 0,
      srcOverflow: va.layout?.overflowX || 0,
      edsOverflow: vb.layout?.overflowX || 0,
      error: va.error || vb.error || d.error || null,
    };
  });
}

/* ---------------------------------------------------------------- change markers */

const lastSegment = (u) => {
  try { return new URL(u).pathname.split('/').filter(Boolean).pop() || ''; } catch { return u || ''; }
};
const MARK_KEYS = {
  blocks: (x) => normalizeText(x.text).toLowerCase(),
  headings: (x) => normalizeText(x.text).toLowerCase(),
  links: (x) => `${normalizeText(x.text).toLowerCase()}|${x.href}`,
  images: (x) => `${normalizeText(x.alt).toLowerCase()}|${lastSegment(x.src)}`,
};

/**
 * Returns locate(item) → { [viewport]: [x, y, w, h] } — where an extracted item appears on
 * each viewport's screenshot. Items are matched by key + occurrence (Nth item with that key).
 */
function locator(cap, kind) {
  const key = MARK_KEYS[kind];
  const perVp = Object.entries(cap.viewports).map(([vp, v]) => {
    const m = new Map();
    (v.boxes?.[kind] || []).forEach((x) => {
      const k = key(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x.box);
    });
    return [vp, m];
  });
  const list = cap.content[kind];
  const occ = [];
  const seen = new Map();
  list.forEach((x, i) => {
    const k = key(x);
    occ[i] = seen.get(k) || 0;
    seen.set(k, occ[i] + 1);
  });
  return (item) => {
    if (!item) return null;
    const i = item.idx ?? list.indexOf(item);
    const k = key(item);
    const out = {};
    perVp.forEach(([vp, m]) => {
      const boxes = m.get(k);
      if (boxes?.length) out[vp] = boxes[Math.min(occ[i] ?? 0, boxes.length - 1)];
    });
    return Object.keys(out).length ? out : null;
  };
}

const clip = (t, n = 160) => {
  const s = normalizeText(t);
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const HEADING_TAG = /^h[1-6]$/;

/**
 * Every located difference becomes a numbered "change" with its box on the original and/or
 * EDS screenshot at each viewport. Ops/items get a changeId so issues and tables can link to it.
 */
function buildChanges(src, eds, r) {
  const L = {
    src: Object.fromEntries(Object.keys(MARK_KEYS).map((k) => [k, locator(src, k)])),
    eds: Object.fromEntries(Object.keys(MARK_KEYS).map((k) => [k, locator(eds, k)])),
  };
  const changes = [];
  const add = (target, c) => {
    if ((!c.src && !c.eds) || changes.length >= 400) return;
    const priority = {
      missing: 'high', broken: 'high', changed: 'medium', extra: 'low',
    }[c.kind];
    const change = { id: changes.length + 1, priority, ...c };
    changes.push(change);
    target.changeId = change.id;
  };

  r.headings.ops.forEach((o) => {
    const a = L.src.headings(o.a);
    const b = L.eds.headings(o.b);
    if (o.type === 'removed') {
      add(o, {
        kind: 'missing', category: 'Heading', label: `Missing h${o.a.level}`, detail: clip(o.a.text), src: a,
      });
    } else if (o.type === 'added') {
      add(o, {
        kind: 'extra', category: 'Heading', label: `Extra h${o.b.level}`, detail: clip(o.b.text), eds: b,
      });
    } else if (o.type === 'changed') {
      add(o, {
        kind: 'changed', category: 'Heading', label: 'Heading text changed', detail: `${clip(o.a.text, 80)} → ${clip(o.b.text, 80)}`, src: a, eds: b,
      });
    } else if (o.levelChanged) {
      add(o, {
        kind: 'changed', category: 'Heading', label: `Heading level h${o.a.level} → h${o.b.level}`, detail: clip(o.a.text), src: a, eds: b,
      });
    }
  });

  // headings are already marked above, so skip heading blocks here
  const isHeading = (x) => HEADING_TAG.test(x?.tag || '');
  r.text.ops.forEach((o) => {
    if (o.regrouped || o.type === 'equal' || isHeading(o.a) || isHeading(o.b)) return;
    if (o.type === 'removed') {
      add(o, {
        kind: 'missing', category: 'Text', label: 'Text missing on EDS', detail: clip(o.a.text), src: L.src.blocks(o.a),
      });
    } else if (o.type === 'added') {
      add(o, {
        kind: 'extra', category: 'Text', label: 'Extra text on EDS', detail: clip(o.b.text), eds: L.eds.blocks(o.b),
      });
    } else if (o.type === 'changed') {
      const removed = o.words.filter((w) => w.type === 'removed').map((w) => w.text).join(' ');
      const added = o.words.filter((w) => w.type === 'added').map((w) => w.text).join(' ');
      add(o, {
        kind: 'changed',
        category: 'Text',
        label: 'Text changed',
        detail: [removed && `− ${clip(removed, 70)}`, added && `+ ${clip(added, 70)}`].filter(Boolean).join('  ') || clip(o.a.text),
        src: L.src.blocks(o.a),
        eds: L.eds.blocks(o.b),
      });
    }
  });

  const l = r.links;
  l.missing.forEach((x) => add(x, {
    kind: 'missing', category: 'Link', label: 'Link missing on EDS', detail: `${clip(x.text, 60) || '(no text)'} → ${x.href}`, src: L.src.links(x),
  }));
  l.targetChanged.forEach((x) => add(x, {
    kind: 'changed', category: 'Link', label: 'Link destination changed', detail: `${clip(x.a.text, 60)}: ${x.a.href} → ${x.b.href}`, src: L.src.links(x.a), eds: L.eds.links(x.b),
  }));
  l.textChanged.forEach((x) => add(x, {
    kind: 'changed', category: 'Link', label: 'Link text changed', detail: `${clip(x.a.text, 60)} → ${clip(x.b.text, 60)}`, src: L.src.links(x.a), eds: L.eds.links(x.b),
  }));
  l.extra.forEach((x) => add(x, {
    kind: 'extra', category: 'Link', label: 'Extra link on EDS', detail: `${clip(x.text, 60) || '(no text)'} → ${x.href}`, eds: L.eds.links(x),
  }));

  const m = r.media;
  m.edsBroken.forEach((i) => add(i, {
    kind: 'broken', category: 'Image', label: 'Broken image', detail: i.src, eds: L.eds.images(i),
  }));
  m.edsMissingAlt.forEach((i) => add(i, {
    kind: 'broken', category: 'Image', label: 'Image has no alt attribute', detail: i.src, eds: L.eds.images(i),
  }));
  const edsAlts = new Set(m.edsImages.map((i) => normalizeText(i.alt).toLowerCase()).filter(Boolean));
  m.srcImages.filter((i) => normalizeText(i.alt) && !edsAlts.has(normalizeText(i.alt).toLowerCase()))
    .forEach((i) => add(i, {
      kind: 'missing', category: 'Image', label: 'Image (by alt text) not found on EDS', detail: clip(i.alt), src: L.src.images(i),
    }));
  return changes;
}

/* ---------------------------------------------------------------- scoring */

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

function scoreAll(r) {
  const s = {};
  const t = r.text.stats;
  s.text = clamp(t.similarity * 100);
  const hOps = r.headings.ops;
  const hTotal = Math.max(1, hOps.filter((o) => o.type !== 'added').length + hOps.filter((o) => o.type === 'added').length);
  s.headings = clamp((100 * (hOps.filter((o) => o.type === 'equal' && !o.levelChanged).length
    + 0.5 * hOps.filter((o) => o.type === 'changed' || o.levelChanged).length)) / hTotal);
  const l = r.links;
  s.links = l.srcCount ? clamp((100 * (l.matched + 0.5 * l.targetChanged.length)) / Math.max(l.srcCount, l.edsCount)) : 100;
  const m = r.media;
  const cnt = Math.max(m.srcImages.length, m.edsImages.length);
  let media = cnt ? (100 * Math.min(m.srcImages.length, m.edsImages.length)) / cnt : 100;
  media -= 10 * m.edsBroken.length + 5 * m.edsMissingAlt.length + 15 * m.missingEmbeds.length;
  s.media = clamp(media);
  const metaCmp = r.meta.filter((x) => x.status !== 'n/a' && x.status !== 'extra');
  s.meta = metaCmp.length ? clamp((100 * metaCmp.filter((x) => x.status === 'match').length) / metaCmp.length) : 100;
  const typoProps = r.typography.flatMap((row) => row.props);
  s.typography = typoProps.length ? clamp((100 * typoProps.filter((p) => p.match).length) / typoProps.length) : 100;
  const vis = r.visual.filter((v) => v.foldMismatch != null);
  s.visual = vis.length
    ? clamp(vis.reduce((acc, v) => acc + (100 - 100 * (0.6 * v.foldMismatch + 0.4 * v.mismatch)), 0) / vis.length)
    : null;
  const weights = {
    text: 30, headings: 10, links: 15, media: 10, meta: 5, typography: 10, visual: 20,
  };
  let sum = 0;
  let wsum = 0;
  Object.entries(weights).forEach(([k, w]) => {
    if (s[k] != null) { sum += s[k] * w; wsum += w; }
  });
  s.overall = clamp(sum / wsum);
  return s;
}

/* ---------------------------------------------------------------- issues */

function buildIssues(r) {
  const out = [];
  const add = (severity, category, message, detail = '', changeId = null) => out.push({
    severity, category, message, detail, changeId,
  });
  const t = r.text.stats;
  if (t.missing) add(t.missing > 3 ? 'error' : 'warning', 'Text', `${t.missing} text block(s) from the original are missing on EDS`);
  if (t.changed) add('warning', 'Text', `${t.changed} text block(s) differ in wording`);
  if (t.extra) add('info', 'Text', `${t.extra} text block(s) on EDS are not on the original`);
  r.text.ops.filter((o) => o.type === 'removed' && !o.regrouped).slice(0, 25)
    .forEach((o) => add('warning', 'Text', 'Missing text', o.a.text.slice(0, 200), o.changeId));
  r.text.ops.filter((o) => o.type === 'changed').slice(0, 25)
    .forEach((o) => add('info', 'Text', 'Text differs', `${o.a.text.slice(0, 120)} → ${o.b.text.slice(0, 120)}`, o.changeId));

  r.headings.ops.forEach((o) => {
    if (o.type === 'removed') add('error', 'Headings', `Missing heading h${o.a.level}`, o.a.text, o.changeId);
    if (o.type === 'added') add('info', 'Headings', `Extra heading h${o.b.level} on EDS`, o.b.text, o.changeId);
    if (o.type === 'changed') add('warning', 'Headings', `Heading text differs (h${o.a.level} → h${o.b.level})`, `${o.a.text} → ${o.b.text}`, o.changeId);
    if (o.levelChanged) add('warning', 'Headings', `Heading level changed h${o.a.level} → h${o.b.level}`, o.a.text, o.changeId);
  });
  r.headings.edsOutline.forEach((p) => add('warning', 'Accessibility', `EDS heading outline: ${p}`));

  r.links.missing.forEach((l) => add('error', 'Links', 'Link missing on EDS', `${l.text || '(no text)'} → ${l.href}`, l.changeId));
  r.links.targetChanged.forEach((x) => {
    const anchorOnly = x.a.key.split('#')[0] === x.b.key.split('#')[0];
    add('warning', 'Links', anchorOnly ? `Link "${x.a.text}" goes to the same page but a different #anchor` : `Link "${x.a.text}" points elsewhere`, `${x.a.href} → ${x.b.href}`, x.changeId);
  });
  r.links.extra.forEach((l) => add('info', 'Links', 'Extra link on EDS', `${l.text || '(no text)'} → ${l.href}`, l.changeId));
  r.links.stillPointingToSource.forEach((l) => add('warning', 'Links', 'EDS link still points to the original domain', `${l.text} → ${l.href}`));
  (r.linkStatus || []).filter((x) => !x.ok).forEach((x) => add(x.internal ? 'error' : 'warning', 'Broken links', `HTTP ${x.status || 'error'}${x.error ? ` (${x.error})` : ''}`, x.url));

  const m = r.media;
  if (m.srcImages.length !== m.edsImages.length) {
    add(Math.abs(m.srcImages.length - m.edsImages.length) > 2 ? 'warning' : 'info', 'Images', `Image count differs: original ${m.srcImages.length}, EDS ${m.edsImages.length}`);
  }
  m.edsBroken.forEach((i) => add('error', 'Images', 'Broken image on EDS', i.src, i.changeId));
  m.edsMissingAlt.forEach((i) => add('error', 'Accessibility', 'EDS image has no alt attribute', i.src, i.changeId));
  m.missingAltTexts.slice(0, 20).forEach((a) => add('info', 'Images', 'Image alt text from original not found on EDS', a));
  m.missingEmbeds.forEach((e) => add('error', 'Media', `Embedded ${e.tag} missing on EDS`, e.src));
  if (m.forms.src > m.forms.eds) add('error', 'Forms', `Original has ${m.forms.src} form(s), EDS has ${m.forms.eds}`);

  r.meta.filter((x) => x.status === 'missing' || x.status === 'different').forEach((x) => {
    add(x.status === 'missing' && x.severity === 'warning' ? 'error' : x.severity, 'Metadata', `${x.label} ${x.status === 'missing' ? 'missing on EDS' : 'differs'}`, `${x.src || '(none)'} → ${x.eds || '(none)'}`);
  });

  r.typography.filter((row) => row.mismatches).forEach((row) => {
    const props = row.props.filter((p) => !p.match).map((p) => `${p.prop}: ${p.src} → ${p.eds}`).join('; ');
    // <body> styles are often overridden on every element of the original; report but don't nag
    add(row.selector === 'body' ? 'info' : 'warning', 'Typography', `${row.selector} @ ${row.viewport}px differs`, props);
  });
  r.typography.filter((row) => row.presentSrc && !row.presentEds && row.viewport === r.typography[0]?.viewport)
    .forEach((row) => add('info', 'Typography', `${row.selector} present on original but not on EDS`));

  r.visual.forEach((v) => {
    v.areas.filter((a) => a.priority !== 'low').slice(0, 8).forEach((a) => add(
      a.priority === 'high' ? 'warning' : 'info',
      'Visual',
      `${a.label} @ ${v.viewport}px`,
      a.detail,
      a.id,
    ));
    if (v.error) add('error', 'Visual', `Capture failed @ ${v.viewport}px`, v.error);
    if (v.foldMismatch != null && v.foldMismatch > 0.3) add('error', 'Visual', `Above-the-fold differs by ${(v.foldMismatch * 100).toFixed(1)}% @ ${v.viewport}px`);
    else if (v.foldMismatch != null && v.foldMismatch > 0.12) add('warning', 'Visual', `Above-the-fold differs by ${(v.foldMismatch * 100).toFixed(1)}% @ ${v.viewport}px`);
    if (Math.abs(v.heightDelta) > 0.1) add('warning', 'Layout', `Page height differs by ${(v.heightDelta * 100).toFixed(0)}% @ ${v.viewport}px`, `${v.srcHeight}px → ${v.edsHeight}px`);
    if (v.edsOverflow > 1) add('error', 'Layout', `Horizontal overflow on EDS @ ${v.viewport}px (${v.edsOverflow}px)`);
  });

  const net = r.network;
  net.eds.failed.filter((f) => f.sameSite).forEach((f) => add('error', 'Network', `EDS request failed (${f.status || f.error})`, f.url));
  net.eds.failed.filter((f) => !f.sameSite).forEach((f) => add('info', 'Network', `Third-party request failed (${f.status || f.error})`, f.url));
  net.eds.console.forEach((c) => add('warning', 'Console', 'JavaScript error on EDS', c));

  const rank = { error: 0, warning: 1, info: 2 };
  return out.sort((x, y) => rank[x.severity] - rank[y.severity]);
}

/* ---------------------------------------------------------------- entry */

export function comparePair(src, eds, { diffs, linkStatus } = {}) {
  const hosts = siteHosts(src, eds);
  const r = {
    text: compareText(src, eds),
    headings: compareHeadings(src, eds),
    links: compareLinks(src, eds, hosts),
    media: compareMedia(src, eds),
    meta: compareMeta(src, eds),
    typography: compareTypography(src, eds),
    visual: compareVisual(src, eds, diffs),
    network: {
      src: { failed: src.network.failed, console: src.network.console },
      eds: { failed: eds.network.failed, console: eds.network.console },
    },
    linkStatus: linkStatus || null,
  };
  r.changes = buildChanges(src, eds, r);
  r.scores = scoreAll(r);
  r.issues = buildIssues(r);
  const errors = r.issues.filter((i) => i.severity === 'error').length;
  r.status = r.scores.overall >= 90 && errors === 0 ? 'pass' : (r.scores.overall >= 75 ? 'review' : 'fail');
  r.counts = {
    error: errors,
    warning: r.issues.filter((i) => i.severity === 'warning').length,
    info: r.issues.filter((i) => i.severity === 'info').length,
  };
  return r;
}
