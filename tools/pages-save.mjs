/**
 * DO THE TWO WEB PAGES ACTUALLY KEEP WHAT THE OWNER MAKES?
 *
 * The design tracker, driven in a real browser, through the three questions
 * its save engine (docs/autosave.js) has to answer.
 *
 * Three things have to hold, and each one is a way work has really been lost:
 *
 *   1. TYPING REACHES `main` WITH NO BUTTON PRESSED. The old app saved to a
 *      side branch and waited for PUBLISH; forgetting it left finished design
 *      work somewhere the game, the tools and Claude could not see, with the
 *      app cheerfully reporting "saved".
 *
 *   2. A SAVE THAT COLLIDES WITH CLAUDE KEEPS BOTH SIDES. Every write is a
 *      whole-file PUT, so a tab holding an older copy does not conflict — it
 *      silently reverts. On 3 Sep 2026 that ate seven transcribed fields with
 *      a valid sha and no error. GitHub now refuses such a write and the app
 *      combines the two versions field by field instead.
 *
 *   3. WORK THAT NEVER REACHED GITHUB COMES BACK. A phone in a lift, a closed
 *      tab, a dead battery. The browser's own copy is what makes this true and
 *      the old design had nothing of the sort.
 *
 * IT RUNS THE REAL PAGE. docs/index.html is served and driven in Chromium with
 * nothing about the app stubbed — only api.github.com is faked, because what
 * is being tested is what the app PUTs and when. A unit test around a fake
 * document cannot catch these: they live in the ordering of network calls and
 * in what survives a reload.
 *
 * OPT-IN, exactly like `npm run smoke`, and for the same reason — Playwright's
 * postinstall would pull ~150MB of browsers onto every APK build for a job CI
 * does not run:
 *
 *   npx playwright@latest install chromium     # once
 *   npm run pages-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launchChromium } from './harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const un64 = (s) => Buffer.from(s, 'base64').toString('utf8');
const REAL = fs.readFileSync(path.join(ROOT, 'design/TRACKER.md'), 'utf8');

const { server, url: SITE } = await serve(DOCS);

/** The fake repo: one file, one version marker, exactly like the real API. */
const repo = { text: REAL, sha: 'blob0' };
let puts = 0, refusals = 0, writesAllowed = true;
const pageErrors = [];

const browser = await launchChromium('npm run pages-test');
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.addInitScript(() => localStorage.setItem('megadash_gh_token', 'fake-token'));

await page.route('**://api.github.com/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname, method = req.method();
  const json = (body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (p.endsWith('/contents/design/TRACKER.md')) {
    if (method !== 'PUT') return json({ sha: repo.sha, content: b64(repo.text) });
    if (!writesAllowed) return json({ message: 'nope' }, 500);
    const body = JSON.parse(req.postData());
    // THE REAL API REFUSES A WRITE THAT NAMES A VERSION THAT IS NO LONGER
    // CURRENT. That refusal is the only thing standing between a stale tab and
    // somebody else's work, so the fake has to do it too.
    if ((body.sha || null) !== repo.sha) { refusals++; return json({ message: 'Conflict' }, 409); }
    repo.text = un64(body.content);
    repo.sha = `blob${++puts}`;
    return json({ content: { sha: repo.sha } });
  }
  if (p.includes('/releases')) return json([]);
  return json({});
});

const type = (text) => page.evaluate((t) => {
  const field = document.querySelector('.txt[contenteditable]');
  field.focus();
  field.textContent = t;
  field.dispatchEvent(new InputEvent('input', { bubbles: true }));
}, text);

const waitFor = (re, ms = 30000) => page.waitForFunction(
  (src) => new RegExp(src).test(document.querySelector('#state')?.textContent || ''),
  re.source, { timeout: ms },
);

const checks = [];
const check = (name, ok) => checks.push([name, ok]);

// ── 1. typing reaches main on its own ─────────────────────────────────
await page.goto(`${SITE}/index.html`);
await waitFor(/up to date/);
await type('SAVED WITHOUT PRESSING ANYTHING');
await waitFor(/saved to main/);
check('typing reaches main with no button pressed', repo.text.includes('SAVED WITHOUT PRESSING ANYTHING'));
check('there is no Publish button left to forget', !(await page.$('#saveBtn')));
check('there is no branch picker left to mis-tap', !(await page.$('#branch')));

// ── 2. a collision with Claude keeps both sides ───────────────────────
// Claude commits while the tab is open: the file moves on and the version the
// tab is holding stops being current.
repo.text = repo.text.replace('# MEGA DASH', 'CLAUDE-SIDE-MARKER\n\n# MEGA DASH');
repo.sha = 'moved-by-claude';
await type('OWNER-SIDE-MARKER');
await page.click('#state');
await waitFor(/saved to main/);
check('the collision was actually provoked', refusals > 0);
check('the write keeps Claude\'s side', repo.text.includes('CLAUDE-SIDE-MARKER'));
check('the write keeps the owner\'s side', repo.text.includes('OWNER-SIDE-MARKER'));

// ── 3. work that never reached GitHub comes back ──────────────────────
writesAllowed = false;
await type('TYPED WHILE GITHUB WAS UNREACHABLE');
await waitFor(/kept on this device/);
check('an unreachable GitHub is reported as kept, not as lost',
  /safe|kept/.test(await page.textContent('#state')));

// the tab closes and comes back; GitHub still only has the older copy
writesAllowed = true;
await page.goto(`${SITE}/index.html`);
await waitFor(/restored|saved to main/);
// textContent, not innerText: the tracker shows one section at a time and
// hides the rest, and innerText skips anything hidden.
const onScreen = await page.evaluate(() => document.body.textContent);
check('the unsent work is back on the page after a reload',
  onScreen.includes('TYPED WHILE GITHUB WAS UNREACHABLE'));
check('and the page says so rather than restoring it silently',
  /restored/.test(await page.textContent('#state')) || repo.text.includes('TYPED WHILE'));
await waitFor(/saved to main/);
check('and it is sent to GitHub without being asked',
  repo.text.includes('TYPED WHILE GITHUB WAS UNREACHABLE'));

check('no page errors', pageErrors.length === 0);

for (const [name, ok] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
if (pageErrors.length) console.log('\n' + pageErrors.join('\n'));
const passed = checks.every(([, ok]) => ok);
console.log(passed
  ? '\nPASS — the tracker keeps what is put into it'
  : '\nFAIL — work can still be lost');

await browser.close();
server.close();
process.exit(passed ? 0 : 1);
