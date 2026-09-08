/**
 * Does a merge publish survive the next autosave?
 *
 * THIS IS THE ONE BUG THE TRACKER APP CANNOT AFFORD, and it has already
 * happened once. On 3 Sep 2026 a drafting session held a document forked before
 * Claude's 1 Sep commits. `tracker: publish` merged correctly; the autosave 26
 * seconds later PUT the editor's whole in-memory copy back over the merge, and
 * seven transcribed tracker fields were gone with a valid sha and no error.
 *
 * EVERY WRITE IS A WHOLE-FILE PUT, so "the tab's document is older than the
 * branch" is always a silent revert rather than a conflict. `publishDraft()`
 * now reports whether it fast-forwarded or merged, and `save()` re-bases the
 * tab onto the merge before it can write again. This proves that.
 *
 * IT RUNS THE REAL PAGE. docs/index.html is served and driven in Chromium with
 * nothing about the app stubbed — only api.github.com is faked, because the one
 * thing being tested is what the app PUTs after a merge. A unit test around a
 * fake `doc` could not have caught this: the bug lives in the ordering of four
 * network calls.
 *
 * OPT-IN, exactly like `npm run smoke`, and for the same reason — Playwright's
 * postinstall would pull ~150MB of browsers onto every APK build for a job CI
 * does not run:
 *
 *   npx playwright@latest install chromium     # once
 *   npm run tracker-test
 *
 * Verified against the bug: reverting docs/index.html to the pre-fix version
 * makes this exit 1, with "keeps the other side: false".
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Same opt-in guard as tools/smoke.mjs, and for the same reason: playwright is
// deliberately not a devDependency, so a missing one is a message rather than a
// stack trace.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('playwright is not installed — this tool is deliberately opt-in.\n');
  console.log('  npx playwright@latest install chromium');
  console.log('  npm i --no-save playwright');
  console.log('  npm run tracker-test\n');
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const un64 = (s) => Buffer.from(s, 'base64').toString('utf8');

// Two sides of a merge, each carrying a marker only it has. OURS is what the
// tab and the draft branch hold; THEIRS is what landed on main meanwhile.
const OURS = fs.readFileSync(path.join(ROOT, 'design/TRACKER.md'), 'utf8')
  .replace('# MEGA DASH — DEV TRACKER', '# MEGA DASH — DEV TRACKER\n\nOWNER-SIDE-MARKER');
const THEIRS = 'CLAUDE-SIDE-MARKER';
const MERGED = OURS.replace('OWNER-SIDE-MARKER', `OWNER-SIDE-MARKER\n\n${THEIRS}`);

const server = http.createServer((req, res) => {
  const rel = req.url.split('?')[0];
  const file = path.join(DOCS, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(DOCS) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html' });
  res.end(fs.readFileSync(file));
}).listen(0);
const port = server.address().port;

let mainContent = OURS;     // becomes MERGED once the merge is taken
let merged = false;
const puts = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.addInitScript(() => {
  localStorage.setItem('megadash_gh_token', 'fake-token');
  localStorage.setItem('megadash_branch', 'main');
});

await page.route('**://api.github.com/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  const method = req.method();
  const json = (body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (p.endsWith('/contents/design/TRACKER.md')) {
    if (method === 'PUT') {
      puts.push(un64(JSON.parse(req.postData()).content));
      return json({ content: { sha: `blob${puts.length}` } });
    }
    const ref = url.searchParams.get('ref');
    return json({ sha: 'blob0', content: b64(ref === 'main' ? mainContent : OURS) });
  }
  if (p.includes('/compare/')) return json({ ahead_by: 1 });
  if (p.includes('/git/ref/heads/')) return json({ object: { sha: `sha-${p.split('heads/')[1]}` } });
  if (p.endsWith('/git/refs') && method === 'POST') return json({}, 201);
  // The fast-forward is REFUSED. This is what forces the merge path, and it is
  // what really happens whenever Claude has committed since the draft forked.
  if (p.includes('/git/refs/heads/main') && method === 'PATCH') return json({ message: 'not ff' }, 422);
  if (p.endsWith('/merges') && method === 'POST') { merged = true; mainContent = MERGED; return json({}, 201); }
  if (p.includes('/git/refs/heads/tracker-draft') && method === 'PATCH') return json({});
  if (p.includes('/branches')) return json([{ name: 'main' }]);
  if (p.includes('/releases')) return json([]);
  return json({});
});

await page.goto(`http://localhost:${port}/index.html`);
await page.waitForFunction(
  () => /loaded/.test(document.querySelector('#state')?.textContent || ''),
  null, { timeout: 20000 },
);

await page.click('#saveBtn');
await page.waitForFunction(
  () => /published|conflict|failed/.test(document.querySelector('#state').textContent),
  null, { timeout: 20000 },
);
const state = await page.textContent('#state');

// The autosave that used to revert the merge.
await page.evaluate(() => {
  const field = document.querySelector('.txt[contenteditable]');
  field.focus();
  field.textContent = 'edited after publish';
  field.dispatchEvent(new InputEvent('input', { bubbles: true }));
});
await page.waitForFunction(
  () => /draft saved/.test(document.querySelector('#state').textContent),
  null, { timeout: 20000 },
);

const last = puts[puts.length - 1] || '';
const checks = [
  ['the merge path was taken', merged],
  ['the post-merge write keeps the other side', last.includes(THEIRS)],
  ['the post-merge write keeps our side', last.includes('OWNER-SIDE-MARKER')],
  ['the post-merge write carries the new typing', last.includes('edited after publish')],
  ['no page errors', pageErrors.length === 0],
];

console.log(`\nstate after publish: ${state}\n`);
for (const [name, ok] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
if (pageErrors.length) console.log('\n' + pageErrors.join('\n'));

const passed = checks.every(([, ok]) => ok);
console.log(passed
  ? '\nPASS — a merge publish survives the next autosave'
  : '\nFAIL — the next autosave reverted the merge, which is the 3 Sep data loss');

await browser.close();
server.close();
process.exit(passed ? 0 : 1);
