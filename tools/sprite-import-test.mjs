/**
 * THE SPRITE EDITOR'S PNG IMPORT, DRIVEN IN A REAL BROWSER.
 *
 * Opt-in, not in CI, same terms as `npm run smoke` and `npm run tracker-test`:
 * Playwright's postinstall would pull ~150MB of browsers onto every APK build
 * for a job CI does not run.
 *
 * WHY IT CANNOT BE A UNIT TEST. `rolesFromPixels` is pure and IS unit tested,
 * but nothing about this feature's failure modes lives there. Decoding is
 * `createImageBitmap`, the size check reads a decoded bitmap, the grid comes
 * from a document fetched over the network, and the whole thing hangs off a
 * native <dialog> whose form submits on every button. Every one of those is
 * browser behaviour that a fake would have to imitate, and a fake that imitates
 * it wrongly is the failure mode CLAUDE.md already has a paragraph about.
 *
 * Only api.github.com is faked, so the app under test is the shipped file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, serve } from './harness.mjs';
import { encodePng } from './png.mjs';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const DOCS = path.join(ROOT, 'docs');
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

const SPRITE = fs.readFileSync(path.join(ROOT, 'design/sprites/player.sprite'), 'utf8');
const TARGETS = fs.readFileSync(path.join(ROOT, 'design/sprite-targets.json'), 'utf8');
const BOSSDATA = fs.readFileSync(path.join(ROOT, 'design/boss-data.json'), 'utf8');

/** A solid block in one colour, RGBA, fully opaque. */
function solid(w, h, [r, g, b]) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255; }
  return encodePng(w, h, px);
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); else console.log(`  ok — ${msg}`); };

const { url: SITE, server } = await serve(DOCS, 'sprite-editor.html');
const browser = await launchChromium('npm run sprite-import-test');
// The agent proxy's CA is not in Chromium's store, and every request this test
// cares about is fulfilled locally anyway.
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

await ctx.addInitScript(() => {
  localStorage.setItem('megadash_gh_token', 'fake-token');
  localStorage.setItem('megadash_branch', 'main');
});

await ctx.route('**://api.github.com/**', async (route) => {
  const url = new URL(route.request().url());
  const p = url.pathname;
  const json = (body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (p.endsWith('/contents/design/sprites/player.sprite')) return json({ sha: 'blob0', content: b64(SPRITE) });
  if (p.endsWith('/contents/design/sprite-targets.json')) return json({ sha: 'blob1', content: b64(TARGETS) });
  if (p.includes('/contents/design/sprites/')) return json({ message: 'Not Found' }, 404);   // a sprite nobody has drawn yet
  if (p.includes('/git/ref/heads/')) return json({ object: { sha: `sha-${p.split('heads/')[1]}` } });
  if (p.endsWith('/git/refs')) return json({}, 201);
  if (p.includes('/branches')) return json([{ name: 'main' }]);
  if (p.includes('/releases')) return json([]);
  return json({});
});

/**
 * TWO HOSTS, NOT ONE. The editor reads its SPRITE through the contents API but
 * its target catalogue straight off raw.githubusercontent, so faking only
 * api.github.com leaves the app stuck on "loading..." with an empty target
 * list and no request to explain it.
 */
await ctx.route('**://raw.githubusercontent.com/**', (route) => {
  const p = new URL(route.request().url()).pathname;
  const body = p.endsWith('sprite-targets.json') ? TARGETS
    : p.endsWith('boss-data.json') ? BOSSDATA : '{}';
  route.fulfill({ status: 200, contentType: 'application/json', body });
});

await page.goto(`${SITE}/sprite-editor.html`);
await page.waitForFunction(() => document.querySelector('#impFrame'), null, { timeout: 20000 });
// Land on the player, the one sprite the fake serves.
await page.selectOption('#target', 'player').catch(() => {});
await page.waitForFunction(() => globalThis.__doc?.frames.length > 0, null, { timeout: 20000 });

/**
 * COUNT THE DOCUMENT, NOT THE SELECT. `#frame` carries a "+ insert at N" entry
 * beside every real frame, so one import moves that count by two — an
 * assertion against it passes and fails for reasons that are nothing to do
 * with whether a frame landed.
 */
const before = await page.evaluate(() => globalThis.__doc.frames.length);

await page.click('#impFrame');
ok(await page.isVisible('#impGrid'), 'the import dialog opens from the frame row');

const seeded = await page.evaluate(() => ({
  act: document.querySelector('#impAct').value,
  idx: document.querySelector('#impIdx').value,
  grid: document.querySelector('#impGrid').textContent,
}));
ok(/24x24/.test(seeded.grid), `the dialog states the grid it needs (${seeded.grid.match(/\d+x\d+/)?.[0]})`);
ok(Number(seeded.idx) >= 2, `index defaults to the current frame + 1 (got ${seeded.idx})`);

// 1. WRONG SIZE — must be refused, and the refusal must name both numbers.
await page.setInputFiles('#impFile', {
  name: 'toobig.png', mimeType: 'image/png', buffer: solid(32, 32, [255, 255, 255]),
});
await page.waitForFunction(() => document.querySelector('#impWhy').textContent.trim().length > 1);
const whyBig = await page.textContent('#impWhy');
ok(/32x32/.test(whyBig) && /24x24/.test(whyBig), 'a wrong-size PNG is refused naming both grids');
ok(await page.isDisabled('#impGo'), 'Import stays disabled while the file is invalid');

// 2. NOT A PNG — the accept filter is a hint, so the bytes are checked too.
await page.setInputFiles('#impFile', {
  name: 'nope.png', mimeType: 'image/png', buffer: Buffer.from('\xff\xd8\xff\xe0 not a png', 'binary'),
});
await page.waitForFunction(() => /not a PNG/.test(document.querySelector('#impWhy').textContent));
ok(await page.isDisabled('#impGo'), 'a file lying about being a PNG is refused on its bytes');

// 3. RIGHT SIZE — lands as a frame, at the named action and index, at wip.
await page.setInputFiles('#impFile', {
  name: 'good.png', mimeType: 'image/png', buffer: solid(24, 24, [255, 255, 255]),
});
await page.waitForFunction(() => !document.querySelector('#impGo').disabled, null, { timeout: 5000 });
ok(true, 'a PNG at the sprite grid is accepted');
await page.fill('#impIdx', '2');
await page.selectOption('#impAct', 'idle');
await page.click('#impGo');
await page.waitForFunction((n) => globalThis.__doc.frames.length === n + 1, before, { timeout: 5000 });

const landed = await page.evaluate(() => {
  const d = globalThis.__doc;
  const f = d.frames.find((x) => x.action === 'idle' && x.index === 2);
  return f && { status: f.status, w: f.rows[0].length, h: f.rows.length, blank: f.rows.every((r) => /^\.+$/.test(r)) };
});
ok(!!landed, 'the imported frame is at idle 2');
ok(landed && landed.status === 'wip', 'it arrives wip — an import is not an approval');
ok(landed && landed.w === 24 && landed.h === 24, 'it is stored at the sprite grid');
ok(landed && !landed.blank, 'its pixels came through as roles, not as a hole');

/**
 * THE MENU ARENA — the UI as furniture, with an adjustable grid and a CONTACT
 * ZONE where an actor has a hurtbox.
 */
await page.selectOption('#target', 'menu-weapon-dot');
await page.waitForFunction(() => globalThis.__doc?.w === 12, null, { timeout: 10000 })
  .catch(() => {});
const dot = await page.evaluate(() => ({
  w: globalThis.__doc.w, h: globalThis.__doc.h,
  grid: !document.querySelector('#gridGrp').hidden,
  boxOn: !document.querySelector('#tBox').disabled,
  hint: document.querySelector('#hint').textContent,
  warn: !document.querySelector('#vwarn').hidden,
}));
ok(dot.w === 12 && dot.h === 12, `the weapon dot opens at its drawn 12x12 (got ${dot.w}x${dot.h})`);
ok(dot.grid, '+ROW/+COL appear for a MENU element');
ok(dot.boxOn, 'the overlay stays available — a UI element has a zone to show');
ok(/contact zone 18x18/.test(dot.hint), `the hint names the contact zone (${dot.hint.slice(0, 60)})`);

await page.click('#rowP'); await page.click('#colP');
const grown = await page.evaluate(() => ({
  w: globalThis.__doc.w, h: globalThis.__doc.h,
  rows: globalThis.__doc.frames[0].rows.length,
  cols: globalThis.__doc.frames[0].rows[0].length,
}));
ok(grown.w === 13 && grown.h === 13, `+COL and +ROW grew the grid (${grown.w}x${grown.h})`);
ok(grown.rows === 13 && grown.cols === 13, 'every frame grew with it, not just the header');

await page.click('#undo'); await page.click('#undo');
const undone = await page.evaluate(() => ({ w: globalThis.__doc.w, h: globalThis.__doc.h }));
ok(undone.w === 12 && undone.h === 12, `a resize is undoable (back to ${undone.w}x${undone.h})`);

// The standing gold warning is for a HURTBOX lie. A taller touch target is the
// right answer for a thumb, so it must not fire here.
await page.evaluate(() => { globalThis.__doc.fudgeH = 1.5; });
await page.click('#tBox'); await page.click('#tBox');
ok(!(await page.evaluate(() => !document.querySelector('#vwarn').hidden)),
  'the vertical-fudge warning does not fire on a contact zone');

ok(pageErrors.length === 0, `no page errors (${pageErrors.length})`);
if (pageErrors.length) console.log(pageErrors.join('\n'));

await browser.close();
server?.close?.();
console.log(fails.length ? `\nFAIL\n  ${fails.join('\n  ')}` : '\nOK — PNG import refuses what it should and lands what it should');
process.exit(fails.length ? 1 : 0);
