/**
 * npm run glossary — re-render the two labelled screenshots in design/.
 *
 * THE GLOSSARY POINTS AT REAL CONTROLS, so its pictures have to come from the
 * real apps. A hand-made diagram of a UI is a second copy of that UI, and the
 * copy is the one that goes stale — the same reason `npm run status` computes
 * its board instead of remembering it.
 *
 * Opt-in like every other browser tool here: playwright is not a devDependency.
 */

import { serve, launchChromium } from '/home/user/mega-dash/tools/harness.mjs';
import { readFileSync } from 'node:fs';
const { server, url } = await serve('/home/user/mega-dash/docs');
const browser = await launchChromium('n/a');
const R = (f) => readFileSync('/home/user/mega-dash/' + f, 'utf8');
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

/** Draw a labelled callout pointing at a real element. */
const LABEL = `(sel, text, side) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const tag = document.createElement('div');
  tag.textContent = text;
  Object.assign(tag.style, {
    position: 'fixed', zIndex: 99999, font: '600 11px ui-monospace, monospace',
    background: '#ffd166', color: '#101318', padding: '2px 6px', borderRadius: '3px',
    boxShadow: '0 1px 0 #0008', whiteSpace: 'nowrap', pointerEvents: 'none',
  });
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', zIndex: 99998, border: '2px solid #ffd166', borderRadius: '3px',
    left: (r.x - 2) + 'px', top: (r.y - 2) + 'px',
    width: (r.width + 4) + 'px', height: (r.height + 4) + 'px', pointerEvents: 'none',
  });
  document.body.append(box, tag);
  const tw = 7.2 * text.length + 12;
  tag.style.left = Math.max(4, Math.min(innerWidth - tw - 4,
    side === 'left' ? r.x - tw - 6 : side === 'right' ? r.right + 6 : r.x)) + 'px';
  // A label that would sit off the top of the page goes under its box instead.
  const above = r.y - 18;
  tag.style.top = (side === 'below' || above < 2 ? r.bottom + 6 : above) + 'px';
  return true;
}`;

const page = await browser.newPage({ viewport: { width: 1100, height: 620 }, deviceScaleFactor: 2 });
await page.route('**/*', (r) => {
  const u = r.request().url();
  if (u.startsWith(url)) return r.continue();
  const isApi = u.includes('api.github.com');
  const send = (c) => r.fulfill({ status: 200, contentType: 'application/json',
    body: isApi ? JSON.stringify({ content: b64(c), sha: 'x' }) : c });
  if (u.includes('TRACKER.md')) return send(R('design/TRACKER.md'));
  if (u.includes('sprite-targets.json')) return send(R('design/sprite-targets.json'));
  if (u.includes('boss-data.json')) return send(R('design/boss-data.json'));
  if (u.includes('player.sprite')) return send(R('design/sprites/player.sprite'));
  return r.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
});

// ---------- tracker ----------
await page.goto(url + '/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  // The class is `.head`, not `.item .head` — the wrong selector made this a
  // silent no-op and every label landed on a zero-size rect.
  const h = [...document.querySelectorAll('.head')].find(x => /Thorn/i.test(x.textContent));
  (h || document.querySelector('.head')).click();
});
await page.waitForTimeout(700);
// Put the opened card at the top of the shot; a label is no use off-screen.
await page.evaluate(() => {
  // A card is open when its BODY carries .open — the head only toggles it.
  const body = document.querySelector('.body.open');
  body?.scrollIntoView({ block: 'start' });
  window.scrollBy(0, -80);
});
await page.waitForTimeout(500);
const n1 = await page.evaluate((fn) => {
  const label = eval(fn);
  const rows = [...document.querySelectorAll('.body.open .field')];
  if (!rows.length) return -1;
  // Label the DRAFT row: it shows a field, its marker and its prose together,
  // which is the whole vocabulary in one place.
  const row = rows.find((r) => r.querySelector('.st select')?.value === 'draft') || rows[0];
  row.scrollIntoView({ block: 'center' });
  row.id = 'g1';
  let n = 0;
  n += label('#g1 .lbl', 'FIELD', 'left') ? 1 : 0;
  n += label('#g1 .st select', 'MARKER — draft means BUILD IT', 'above') ? 1 : 0;
  n += label('#g1 .txt', 'PROSE — "hold for 10 frames" means 10 STEPS', 'above') ? 1 : 0;
  // A ready row to contrast against, but only if it landed somewhere visible —
  // a callout clamped to the top of the page points at the wrong control.
  const ready = rows.find((r) => {
    const y = r.getBoundingClientRect().y;
    return r.querySelector('.st select')?.value === 'ready' && y > 200 && y < innerHeight - 60;
  });
  if (ready) {
    ready.id = 'g3';
    n += label('#g3 .st select', 'ready: edit under 50 chars -> DRAFT', 'right') ? 1 : 0;
  }
  return n;
}, LABEL);
await page.waitForTimeout(200);
console.log('tracker labels drawn:', n1);
await page.screenshot({ path: '/home/user/mega-dash/design/glossary-tracker.png' });

// ---------- sprite editor ----------
await page.goto(url + '/sprite-editor.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.selectOption('#action', 'run');
await page.waitForTimeout(300);
const n2 = await page.evaluate((fn) => {
  const label = eval(fn);
  let n = 0;
  n += label('#target', 'SPRITE', 'below') ? 1 : 0;
  n += label('#action', 'ACTION', 'below') ? 1 : 0;
  n += label('#frame', 'INDEX', 'below') ? 1 : 0;
  n += label('#status', 'MARKER', 'below') ? 1 : 0;
  n += label('#hold', 'HOLD — in STEPS (= frames)', 'below') ? 1 : 0;
  n += label('#hint', 'the CYCLE cost, in steps and seconds', 'above') ? 1 : 0;
  n += label('#tOnion', 'ONION SKIN', 'above') ? 1 : 0;
  return n;
}, LABEL);
await page.screenshot({ path: '/home/user/mega-dash/design/glossary-editor.png' });
console.log('editor labels drawn:', n2);
await browser.close(); server.close();
