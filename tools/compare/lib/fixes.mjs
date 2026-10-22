/**
 * Code fixes for the parity checker: apply a suggested CSS rule to a project file, undo it,
 * and push the applied fixes to a new git branch — without touching the user's current branch,
 * index or other uncommitted changes (the commit is built from HEAD + only the fix rules).
 */
import { execFile, spawn } from 'node:child_process';
import {
  readFile, writeFile, mkdir, rm,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROPS = ['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'max-width', 'margin-left', 'padding-left'];
const FILE_RE = /^(blocks\/[a-z0-9-]+\/[a-z0-9-]+\.css|styles\/[a-z0-9-]+\.css)$/;
const SELECTOR_RE = /^[\w\s.#>:+~\-[\]="'()*,]+$/;
const VALUE_RE = /^\d{1,4}(\.\d+)?px$/;
const BRANCH_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;

function run(cmd, args, { cwd, env, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env } });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error((err || out).trim() || `${cmd} exited with ${code}`));
    });
    if (input != null) child.stdin.end(input); else child.stdin.end();
  });
}

const execOut = (cmd, args, cwd) => new Promise((resolve) => {
  execFile(cmd, args, { cwd, timeout: 60000 }, (error, stdout, stderr) => {
    resolve({ ok: !error, output: `${stdout || ''}${stderr || ''}`.trim() });
  });
});

/** Validate a fix coming from the browser; returns a normalised copy or throws. */
export function validateFix(root, fix) {
  const f = fix || {};
  if (!FILE_RE.test(f.file || '') || !existsSync(path.join(root, f.file))) throw new Error(`Not an editable CSS file: ${f.file}`);
  const selector = String(f.selector || '').trim();
  if (!selector || selector.length > 300 || !SELECTOR_RE.test(selector)) throw new Error('Invalid selector');
  if (!PROPS.includes(f.prop)) throw new Error(`Property not allowed: ${f.prop}`);
  if (!VALUE_RE.test(f.value || '')) throw new Error(`Invalid value: ${f.value}`);
  const minWidth = f.minWidth == null ? null : Number(f.minWidth);
  if (minWidth != null && !(Number.isInteger(minWidth) && minWidth >= 200 && minWidth <= 3000)) throw new Error('Invalid breakpoint');
  return {
    file: f.file, selector, prop: f.prop, value: f.value, minWidth,
  };
}

/** The exact CSS text appended for a fix (mobile-first: base rule, or a min-width media query). */
export function cssText(fix, title) {
  const note = String(title || 'parity fix').replace(/\*\//g, '').replace(/\s+/g, ' ').slice(0, 140);
  const rule = (indent) => `${indent}${fix.selector} {\n${indent}  ${fix.prop}: ${fix.value};\n${indent}}\n`;
  const body = fix.minWidth ? `@media (width >= ${fix.minWidth}px) {\n${rule('  ')}}\n` : rule('');
  return `\n/* parity fix: ${note} */\n${body}`;
}

export function createFixStore(root, reportsDir) {
  const file = path.join(reportsDir, 'fixes.json');
  let cache = null;
  const load = async () => {
    if (cache) return cache;
    try { cache = JSON.parse(await readFile(file, 'utf8')); } catch { cache = []; }
    return cache;
  };
  const save = async () => { await mkdir(reportsDir, { recursive: true }); await writeFile(file, JSON.stringify(cache, null, 2)); };

  /** Lint the changed file + the project breakpoint rule. */
  const checks = async (cssFile) => ({
    stylelint: await execOut('npx', ['stylelint', cssFile], root),
    breakpoints: await execOut('node', ['tools/quality/breakpoint-check.mjs'], root),
  });

  return {
    async list() { return (await load()).filter((x) => x.status !== 'undone'); },

    async apply({
      fix, title, page, jobId, pairIndex, findingId,
    }) {
      const f = validateFix(root, fix);
      const text = cssText(f, title);
      const target = path.join(root, f.file);
      const current = await readFile(target, 'utf8');
      await writeFile(target, `${current.replace(/\s*$/, '\n')}${text}`);
      const list = await load();
      const entry = {
        id: `fx-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        ...f,
        css: text,
        title: String(title || '').slice(0, 200),
        page: String(page || '').slice(0, 500),
        jobId,
        pairIndex,
        findingId,
        appliedAt: new Date().toISOString(),
        status: 'applied',
      };
      list.push(entry);
      await save();
      return { entry, checks: await checks(f.file) };
    },

    async undo(id) {
      const list = await load();
      const entry = list.find((x) => x.id === id && x.status === 'applied');
      if (!entry) throw new Error('Fix not found (or already pushed / undone).');
      const target = path.join(root, entry.file);
      const current = await readFile(target, 'utf8');
      const at = current.lastIndexOf(entry.css);
      if (at < 0) throw new Error(`The rule is no longer in ${entry.file} — it was edited by hand.`);
      await writeFile(target, current.slice(0, at) + current.slice(at + entry.css.length));
      entry.status = 'undone';
      await save();
      return entry;
    },

    /**
     * Commit only the applied fixes (HEAD version of each file + its fix rules) to a new branch and push it.
     * Uses a temporary index, so the working tree, the real index and the current branch stay untouched.
     */
    async push({
      branch, remote = process.env.PARITY_GIT_REMOTE || 'origin', owner, repo,
    }) {
      if (!BRANCH_RE.test(branch || '')) throw new Error('Branch name: lowercase letters, numbers and dashes only (max 41).');
      if (owner && repo && `${branch}--${repo}--${owner}`.length > 63) throw new Error('Branch name too long for an aem.page preview URL (branch--repo--owner must be ≤ 63 characters).');
      const list = await load();
      const pending = list.filter((x) => x.status === 'applied');
      if (!pending.length) throw new Error('No applied fixes to push.');
      const exists = await run('git', ['ls-remote', '--heads', remote, branch], { cwd: root }).catch(() => '');
      if (exists) throw new Error(`Branch "${branch}" already exists on ${remote} — pick another name.`);

      const files = [...new Set(pending.map((x) => x.file))];
      const tmpIndex = path.join(os.tmpdir(), `parity-index-${process.pid}-${Date.now()}`);
      const env = { GIT_INDEX_FILE: tmpIndex };
      try {
        await run('git', ['read-tree', 'HEAD'], { cwd: root, env });
        for (const file of files) {
          // eslint-disable-next-line no-await-in-loop
          const base = await run('git', ['show', `HEAD:${file}`], { cwd: root });
          const content = `${base.replace(/\s*$/, '\n')}${pending.filter((x) => x.file === file).map((x) => x.css).join('')}`;
          // eslint-disable-next-line no-await-in-loop
          const blob = await run('git', ['hash-object', '-w', '--stdin'], { cwd: root, input: content });
          // eslint-disable-next-line no-await-in-loop
          await run('git', ['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`], { cwd: root, env });
        }
        const tree = await run('git', ['write-tree'], { cwd: root, env });
        const message = [
          `Parity fixes: ${pending.length} CSS change${pending.length > 1 ? 's' : ''} from the Page Parity Checker`,
          '',
          ...pending.map((x) => `- ${x.file}: ${x.selector} { ${x.prop}: ${x.value} }${x.minWidth ? ` @ >= ${x.minWidth}px` : ''} — ${x.title}`),
        ].join('\n');
        const ident = {
          GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || (await run('git', ['config', 'user.name'], { cwd: root }).catch(() => '')) || 'Page Parity Checker',
          GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || (await run('git', ['config', 'user.email'], { cwd: root }).catch(() => '')) || 'parity-checker@localhost',
        };
        ident.GIT_COMMITTER_NAME = ident.GIT_AUTHOR_NAME;
        ident.GIT_COMMITTER_EMAIL = ident.GIT_AUTHOR_EMAIL;
        const commit = await run('git', ['commit-tree', tree, '-p', 'HEAD', '-m', message], { cwd: root, env: ident });
        await run('git', ['push', remote, `${commit}:refs/heads/${branch}`], { cwd: root });
        pending.forEach((x) => { Object.assign(x, { status: 'pushed', branch, commit, pushedAt: new Date().toISOString() }); });
        await save();
        return {
          branch,
          commit,
          files,
          count: pending.length,
          previewBase: owner && repo ? `https://${branch}--${repo}--${owner}.aem.page` : null,
          prUrl: owner && repo ? `https://github.com/${owner}/${repo}/compare/main...${branch}?expand=1` : null,
        };
      } finally {
        await rm(tmpIndex, { force: true });
      }
    },
  };
}
