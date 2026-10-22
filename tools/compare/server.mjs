#!/usr/bin/env node
/**
 * Page Parity Checker — a local UI for comparing an ORIGINAL page with its EDS
 * migration: visual diff per viewport, text/heading/link/image/metadata/typography
 * diffs, console + network errors, a parity score, per-finding review marks, and an
 * exportable report (self-contained HTML, CSV issue list, JSON).
 *
 * Usage:
 *   npm run compare                 # http://localhost:4100
 *   npm run compare -- --port 4200
 *
 * Runs are stored under tools/compare/reports/<id>/ (git-ignored).
 */
import http from 'node:http';
import { execSync } from 'node:child_process';
import {
  readFile, writeFile, mkdir, readdir,
} from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  launchBrowser, capturePage, diffImages, checkLinks,
} from './lib/capture.mjs';
import { comparePair } from './lib/compare.mjs';
import { createFixStore } from './lib/fixes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const UI = path.join(HERE, 'ui');
const REPORTS = path.join(HERE, 'reports');

const args = process.argv.slice(2);
const argVal = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const PORT = Number(argVal('--port') || process.env.PORT || 4100);
const HOST = argVal('--host') || '127.0.0.1';

/* ------------------------------------------------------------ config */

async function projectConfig() {
  let breakpoints = [600, 900, 1200];
  try {
    const bp = JSON.parse(await readFile(path.join(ROOT, 'tools/quality/breakpoints.json'), 'utf8'));
    if (Array.isArray(bp.breakpoints) && bp.breakpoints.length) breakpoints = bp.breakpoints;
  } catch { /* defaults */ }
  let edsBase = '';
  const git = { owner: null, repo: null, branch: null };
  try {
    const remote = execSync('git remote get-url origin', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const m = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
    if (m) {
      edsBase = `https://main--${m[2]}--${m[1]}.aem.live`.toLowerCase();
      [git.owner, git.repo] = [m[1].toLowerCase(), m[2].toLowerCase()];
    }
    git.branch = execSync('git branch --show-current', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch { /* not a git checkout */ }
  const viewports = [...new Set([375, ...breakpoints, 1440])].sort((a, b) => a - b);
  return {
    breakpoints,
    viewports,
    defaultViewports: [375, breakpoints[0], 1440].filter((v, i, a) => a.indexOf(v) === i),
    edsBase,
    git,
    defaults: {
      excludeSelector: 'header, footer, [role="banner"], [role="contentinfo"], .cmp-experiencefragment--header, .cmp-experiencefragment--footer',
      hideSelector: '#onetrust-consent-sdk, #CybotCookiebotDialog, .cc-window, #truste-consent-track, .truste_box_overlay, iframe[class*="stickyButton"]',
      threshold: 40,
    },
  };
}

/* ------------------------------------------------------------ jobs */

const jobs = new Map();
let queue = Promise.resolve();

const newId = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`;
};

const jobDir = (id) => path.join(REPORTS, id);
const publicJob = (job) => { const { listeners, ...rest } = job; return rest; };

async function persist(job) {
  await mkdir(jobDir(job.id), { recursive: true });
  await writeFile(path.join(jobDir(job.id), 'result.json'), JSON.stringify(publicJob(job)));
}

function emit(job, event) {
  job.listeners.forEach((res) => res.write(`data: ${JSON.stringify(event)}\n\n`));
}

function progress(job, message) {
  job.progress.message = message;
  emit(job, { type: 'progress', progress: job.progress });
}

async function loadJobs() {
  if (!existsSync(REPORTS)) return;
  const dirs = await readdir(REPORTS);
  await Promise.all(dirs.map(async (d) => {
    try {
      const job = JSON.parse(await readFile(path.join(REPORTS, d, 'result.json'), 'utf8'));
      if (job.status === 'running' || job.status === 'queued') job.status = 'interrupted';
      jobs.set(job.id, { ...job, listeners: new Set() });
    } catch { /* skip */ }
  }));
}

const pageInfo = (cap) => ({
  url: cap.url, finalUrl: cap.finalUrl, status: cap.status, contentRoot: cap.contentRoot, title: cap.meta?.title || '',
});

const captureFile = (job, pair) => path.join(jobDir(job.id), `p${pair.index + 1}-capture.json`);

const captureOptions = (o) => ({
  excludeSelector: o.excludeHeaderFooter ? o.excludeSelector : '',
  hideSelector: o.hideSelector,
  includeHidden: o.includeHidden,
});

/** Pixel-diff one viewport, write its screenshots, and return the diff summary. */
async function diffViewport(browser, job, pair, vw, a, b) {
  const dir = jobDir(job.id);
  const base = `p${pair.index + 1}-${vw}`;
  let diff;
  if (a?.png && b?.png) {
    progress(job, `Pair ${pair.index + 1}/${job.pairs.length} · pixel diff · ${vw}px`);
    try {
      const d = await diffImages(browser, a.png, b.png, { threshold: job.options.threshold, foldHeight: a.viewportHeight });
      writeFileSync(path.join(dir, `${base}-src.jpg`), d.a);
      writeFileSync(path.join(dir, `${base}-eds.jpg`), d.b);
      writeFileSync(path.join(dir, `${base}-diff.jpg`), d.d);
      a.screenshot = `${base}-src.jpg`;
      b.screenshot = `${base}-eds.jpg`;
      diff = {
        diffShot: `${base}-diff.jpg`, mismatch: d.mismatch, foldMismatch: d.foldMismatch, areas: d.areas, width: d.width, height: d.height,
      };
    } catch (err) {
      diff = { error: `Pixel diff failed: ${err.message.split('\n')[0]}` };
    }
  }
  [[a, 'src'], [b, 'eds']].forEach(([v, side]) => {
    if (v?.png && !v.screenshot) {
      writeFileSync(path.join(dir, `${base}-${side}.png`), v.png);
      v.screenshot = `${base}-${side}.png`;
    }
    if (v) delete v.png;
  });
  return diff;
}

async function runPair(browser, job, pair) {
  const o = job.options;
  const step = (side) => (msg) => progress(job, `Pair ${pair.index + 1}/${job.pairs.length} · ${side} · ${msg}`);
  const common = { viewports: o.viewports, ...captureOptions(o) };
  const [src, eds] = await Promise.all([
    capturePage(browser, pair.original, { ...common, rootSelector: o.excludeHeaderFooter ? o.srcRoot : 'body' }, step('original')),
    capturePage(browser, pair.eds, { ...common, withCss: true, rootSelector: o.excludeHeaderFooter ? o.edsRoot : 'body' }, step('EDS')),
  ]);

  const diffs = {};
  for (const vw of o.viewports) {
    // eslint-disable-next-line no-await-in-loop
    const d = await diffViewport(browser, job, pair, vw, src.viewports[vw], eds.viewports[vw]);
    if (d) diffs[vw] = d;
  }

  let linkStatus = null;
  if (o.checkLinks) {
    progress(job, `Pair ${pair.index + 1}/${job.pairs.length} · checking EDS link status`);
    const edsHost = new URL(eds.finalUrl || eds.url).hostname;
    linkStatus = await checkLinks(eds.content.links.map((l) => l.href), {
      isInternal: (u) => { try { return new URL(u).hostname === edsHost; } catch { return false; } },
    });
  }

  pair.src = pageInfo(src);
  pair.edsInfo = pageInfo(eds);
  pair.result = comparePair(src, eds, { diffs, linkStatus, breakpoints: (await projectConfig()).breakpoints });
  pair.viewports = Object.keys(src.viewports).map(Number);
  // keep the raw captures so more widths can be added to this page later
  writeFileSync(captureFile(job, pair), JSON.stringify({
    src, eds, diffs, linkStatus,
  }));
}

/** Capture and compare one extra width for an already-compared page. */
async function addViewport(job, pair, vw) {
  const file = captureFile(job, pair);
  if (!existsSync(file)) throw new Error('This page was compared with an older version of the checker — run it again to add widths.');
  const saved = JSON.parse(await readFile(file, 'utf8'));
  const o = job.options;
  const browser = await launchBrowser();
  try {
    progress(job, `Pair ${pair.index + 1} · capturing ${vw}px`);
    const common = { viewports: [vw], ...captureOptions(o) };
    const [s1, e1] = await Promise.all([
      capturePage(browser, pair.original, { ...common, rootSelector: o.excludeHeaderFooter ? o.srcRoot : 'body' }),
      capturePage(browser, pair.eds, { ...common, withCss: true, rootSelector: o.excludeHeaderFooter ? o.edsRoot : 'body' }),
    ]);
    const a = s1.viewports[vw];
    const b = e1.viewports[vw];
    if (a?.error || b?.error) throw new Error(a?.error || b?.error);
    const d = await diffViewport(browser, job, pair, vw, a, b);
    saved.src.viewports[vw] = a;
    saved.eds.viewports[vw] = b;
    if (d) saved.diffs[vw] = d;
  } finally {
    await browser.close().catch(() => {});
  }
  pair.result = comparePair(saved.src, saved.eds, { diffs: saved.diffs, linkStatus: saved.linkStatus, breakpoints: (await projectConfig()).breakpoints });
  pair.viewports = Object.keys(saved.src.viewports).map(Number);
  writeFileSync(file, JSON.stringify(saved));
  progress(job, 'Finished');
  await persist(job);
}

async function runJob(job) {
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  await persist(job);
  let browser;
  try {
    browser = await launchBrowser();
    for (const pair of job.pairs) {
      pair.status = 'running';
      emit(job, { type: 'pair', index: pair.index, status: 'running' });
      try {
        // eslint-disable-next-line no-await-in-loop
        await runPair(browser, job, pair);
        pair.status = 'done';
      } catch (err) {
        pair.status = 'error';
        pair.error = err.message.split('\n')[0];
      }
      job.progress.done += 1;
      emit(job, { type: 'pair', index: pair.index, status: pair.status });
      // eslint-disable-next-line no-await-in-loop
      await persist(job);
    }
    job.status = 'done';
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  job.finishedAt = new Date().toISOString();
  job.progress.message = job.status === 'done' ? 'Finished' : `Failed: ${job.error}`;
  await persist(job);
  emit(job, { type: 'done', status: job.status });
}

function validUrl(u) {
  try {
    const url = new URL(String(u).trim());
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

async function createJob(body) {
  const cfg = await projectConfig();
  const pairs = (Array.isArray(body.pairs) ? body.pairs : [])
    .map((p) => ({ original: validUrl(p.original), eds: validUrl(p.eds) }))
    .filter((p) => p.original && p.eds)
    .slice(0, 50);
  if (!pairs.length) throw new Error('Add at least one valid pair of http(s) URLs.');
  const o = body.options || {};
  const viewports = (Array.isArray(o.viewports) ? o.viewports : cfg.defaultViewports)
    .map((v) => Math.round(Number(v))).filter((v, i, a) => v >= 280 && v <= 2560 && a.indexOf(v) === i)
    .sort((x, y) => x - y)
    .slice(0, 10);
  const str = (v, d) => (typeof v === 'string' ? v.slice(0, 2000) : d);
  const job = {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: 'queued',
    title: str(body.title, '') || `Parity check · ${pairs.length} page${pairs.length > 1 ? 's' : ''}`,
    options: {
      viewports: viewports.length ? viewports : cfg.defaultViewports,
      excludeHeaderFooter: o.excludeHeaderFooter !== false,
      excludeSelector: str(o.excludeSelector, cfg.defaults.excludeSelector),
      hideSelector: str(o.hideSelector, cfg.defaults.hideSelector),
      srcRoot: str(o.srcRoot, ''),
      edsRoot: str(o.edsRoot, ''),
      includeHidden: !!o.includeHidden,
      checkLinks: !!o.checkLinks,
      threshold: Math.max(5, Math.min(200, Number(o.threshold) || cfg.defaults.threshold)),
    },
    progress: { done: 0, total: pairs.length, message: 'Queued' },
    pairs: pairs.map((p, index) => ({
      index, original: p.original, eds: p.eds, status: 'pending',
    })),
    listeners: new Set(),
  };
  jobs.set(job.id, job);
  await persist(job);
  queue = queue.then(() => runJob(job)).catch(() => {});
  return job;
}

/* ------------------------------------------------------------ report export */

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function issuesCsv(job) {
  const rows = [['Pair', 'Original URL', 'EDS URL', 'Score', 'Status', 'Severity', 'Category', 'Issue', 'Detail']];
  job.pairs.forEach((p) => {
    const r = p.result;
    const base = [p.index + 1, p.original, p.eds, r?.scores.overall ?? '', r?.status ?? p.status];
    if (!r) rows.push([...base, 'error', 'Capture', p.error || 'Not compared', '']);
    else if (!r.issues.length) rows.push([...base, '', '', 'No issues found', '']);
    else r.issues.forEach((i) => rows.push([...base, i.severity, i.category, i.message, i.detail]));
  });
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

async function reportHtml(job, { images = true } = {}) {
  const [html, css, js] = await Promise.all(['index.html', 'app.css', 'app.js'].map((f) => readFile(path.join(UI, f), 'utf8')));
  const assets = {};
  if (images) {
    const files = await readdir(jobDir(job.id));
    await Promise.all(files.filter((f) => /\.(jpg|png)$/.test(f) && !/-diff\./.test(f)).map(async (f) => {
      const b = await readFile(path.join(jobDir(job.id), f));
      assets[f] = `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${b.toString('base64')}`;
    }));
  }
  const safe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  return html
    .replace('<link rel="stylesheet" href="app.css">', () => `<style>${css}</style>`)
    .replace('<script type="module" src="app.js"></script>', () => `<script>window.REPORT=${safe(publicJob(job))};window.REPORT_ASSETS=${safe(assets)};</script>\n<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
}

/* ------------------------------------------------------------ http */

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
};

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) { reject(new Error('Body too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); }
    });
  });
}

const fileSafe = (s) => s.replace(/[^\w-]+/g, '-').slice(0, 60);

const fixes = createFixStore(ROOT, REPORTS);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, await readFile(path.join(UI, 'index.html')), TYPES['.html']);
    }
    if (req.method === 'GET' && ['/app.js', '/app.css'].includes(url.pathname)) {
      return send(res, 200, await readFile(path.join(UI, url.pathname.slice(1))), TYPES[path.extname(url.pathname)]);
    }
    if (parts[0] === 'reports' && parts.length === 3 && req.method === 'GET') {
      if (!/^[\w-]+$/.test(parts[1]) || !/^[\w.-]+\.(jpg|png)$/.test(parts[2])) return send(res, 400, { error: 'bad path' });
      const f = path.join(REPORTS, parts[1], parts[2]);
      if (!existsSync(f)) return send(res, 404, { error: 'not found' });
      return send(res, 200, await readFile(f), TYPES[path.extname(f)], { 'Cache-Control': 'max-age=3600' });
    }
    if (parts[0] !== 'api') return send(res, 404, { error: 'not found' });

    if (url.pathname === '/api/config') return send(res, 200, await projectConfig());

    // code fixes: apply / undo a suggested CSS rule, push applied fixes to a new branch
    if (url.pathname === '/api/fixes' && req.method === 'GET') return send(res, 200, await fixes.list());
    if (url.pathname === '/api/fixes' && req.method === 'POST') return send(res, 201, await fixes.apply(await readBody(req)));
    const undo = url.pathname.match(/^\/api\/fixes\/([\w-]+)\/undo$/);
    if (undo && req.method === 'POST') return send(res, 200, await fixes.undo(undo[1]));
    if (url.pathname === '/api/git/push' && req.method === 'POST') {
      const body = await readBody(req);
      const { git } = await projectConfig();
      return send(res, 200, await fixes.push({ branch: String(body.branch || '').trim(), owner: git.owner, repo: git.repo }));
    }
    if (url.pathname === '/api/jobs' && req.method === 'GET') {
      const list = [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((j) => ({
        id: j.id,
        title: j.title,
        createdAt: j.createdAt,
        status: j.status,
        pairs: j.pairs.length,
        avg: (() => {
          const s = j.pairs.filter((p) => p.result).map((p) => p.result.scores.overall);
          return s.length ? Math.round(s.reduce((x, y) => x + y, 0) / s.length) : null;
        })(),
        first: j.pairs[0]?.original,
      }));
      return send(res, 200, list);
    }
    if (url.pathname === '/api/jobs' && req.method === 'POST') {
      const job = await createJob(await readBody(req));
      return send(res, 201, { id: job.id });
    }
    const job = parts[1] === 'jobs' && jobs.get(parts[2]);
    if (!job) return send(res, 404, { error: 'run not found' });
    const action = parts[3] || '';

    if (!action && req.method === 'GET') return send(res, 200, publicJob(job));
    if (action === 'events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'progress', progress: job.progress, status: job.status })}\n\n`);
      if (job.status !== 'running' && job.status !== 'queued') {
        res.write(`data: ${JSON.stringify({ type: 'done', status: job.status })}\n\n`);
      }
      job.listeners.add(res);
      req.on('close', () => job.listeners.delete(res));
      return undefined;
    }
    if (action === 'viewport' && req.method === 'POST') {
      const body = await readBody(req);
      const pair = job.pairs[Number(body.index)];
      const vw = Math.round(Number(body.width));
      if (!pair?.result) return send(res, 400, { error: 'This page has not been compared yet.' });
      if (!(vw >= 280 && vw <= 2560)) return send(res, 400, { error: 'Width must be between 280 and 2560px.' });
      if (job.status === 'running' || job.status === 'queued') return send(res, 409, { error: 'Wait for the run to finish first.' });
      // run through the same queue so only one browser job runs at a time
      const task = queue.then(() => addViewport(job, pair, vw));
      queue = task.catch(() => {});
      await task;
      return send(res, 200, { ok: true });
    }
    if (action === 'review' && req.method === 'POST') {
      // per-finding review state: ok | fix ('' clears)
      const body = await readBody(req);
      const pair = job.pairs[Number(body.index)];
      const id = String(body.id || '').slice(0, 40);
      if (!pair || !/^[\w-]+$/.test(id)) return send(res, 400, { error: 'bad finding' });
      pair.reviews = pair.reviews || {};
      if (body.state === 'ok' || body.state === 'fix') pair.reviews[id] = body.state;
      else delete pair.reviews[id];
      await persist(job);
      return send(res, 200, { ok: true });
    }
    const name = `parity-report-${fileSafe(job.id)}`;
    if (action === 'report.html') {
      const html = await reportHtml(job, { images: url.searchParams.get('images') !== '0' });
      return send(res, 200, html, TYPES['.html'], { 'Content-Disposition': `attachment; filename="${name}.html"` });
    }
    if (action === 'issues.csv') {
      return send(res, 200, `\ufeff${issuesCsv(job)}`, 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="${name}-issues.csv"` });
    }
    if (action === 'result.json') {
      return send(res, 200, JSON.stringify(publicJob(job), null, 2), 'application/json; charset=utf-8', { 'Content-Disposition': `attachment; filename="${name}.json"` });
    }
    return send(res, 404, { error: 'not found' });
  } catch (err) {
    return send(res, 400, { error: err.message });
  }
});

await mkdir(REPORTS, { recursive: true });
await loadJobs();
server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Page Parity Checker running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
