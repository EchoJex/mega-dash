/**
 * node design/world-art/render.mjs <out-dir> [--batch N] — paint the review canvases' pictures.
 *
 * Opens the painters in Chromium through the shared harness (tools/harness.mjs) and writes one
 * PNG per picture, at the game's own size, into <out-dir>. None of them is in the game.
 *
 * - With no --batch: the first round (variants.mjs), one look for every slice, and how each
 *   material's ground and lit edge do against all seventeen backdrops.
 * - With --batch N: batch N of the per-slice world pieces (batchN.mjs): per slice, six backdrops
 *   and three materials, and how each material does against its own slice's six backdrops. A
 *   backdrop that scrolls in layers is also written as a moving picture (.apng: an animated PNG,
 *   which every browser plays) of the camera running while the player runs on the spot.
 *
 * The contrast lines use the game's own floors (tests/contrast.test.js): ground 2, its lit edge
 * 4.5 and the white player on it 4.5, measured against the brightest pixel under each pit.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { launchChromium, serve } from '../../tools/harness.mjs';
import { chunk } from '../../tools/png.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const out = process.argv[2];
const bi = process.argv.indexOf('--batch');
const batch = bi > 0 ? Number(process.argv[bi + 1]) : 0;
if (!out || out.startsWith('--')) { console.error('usage: node design/world-art/render.mjs <out-dir> [--batch N]'); process.exit(1); }
mkdirSync(out, { recursive: true });

/** An animated PNG from frames already deflated in the browser: every frame shown 1/fps of a second, looping. */
function apng(w, h, frames, fps) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(frames.length, 0);
  const parts = [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('acTL', actl)];
  let seq = 0;
  frames.forEach((b64, i) => {
    const fc = Buffer.alloc(26);
    fc.writeUInt32BE(seq++, 0); fc.writeUInt32BE(w, 4); fc.writeUInt32BE(h, 8);
    fc.writeUInt16BE(1, 20); fc.writeUInt16BE(fps, 22);
    parts.push(chunk('fcTL', fc));
    const data = Buffer.from(b64, 'base64');
    if (i === 0) parts.push(chunk('IDAT', data));
    else { const s = Buffer.alloc(4); s.writeUInt32BE(seq++); parts.push(chunk('fdAT', Buffer.concat([s, data]))); }
  });
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

const { server, url } = await serve(REPO, 'package.json');
const browser = await launchChromium('node design/world-art/render.mjs <out-dir>');
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { console.error(e); process.exitCode = 1; });
  await page.goto(url);
  const res = await page.evaluate(async ({ base, n }) => {
    const { BOSSES } = await import(`${base}/src/data/bosses.js`);
    const boss = (id) => BOSSES.find((b) => b.id === id);
    const player = new Image();
    player.src = `${base}/public/sprites/player.png`;
    await player.decode();
    const png = (cv) => cv.toDataURL('image/png');
    const lum = (rgb) => {
      const ch = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const P = {}, A = {}, report = [];

    if (!n) {
      const m = await import(`${base}/design/world-art/variants.mjs`);
      for (const s of ['A', 'B', 'C']) P[`materials-${s}`] = png(m.scene({ ground: s, platform: s, spikes: s, door: s, boss: boss('proto') }, player));
      for (const v of ['TODAY', 'SKYLINE', 'HILLS', 'STARS']) P[`bg-${v}`] = png(m.composite({ bg: v, boss: boss('volt') }, 'bg', player));
      for (const v of ['TODAY', 'A', 'B', 'C']) {
        P[`ground-${v}`] = png(m.composite({ ground: v, boss: boss('tempest') }, 'ground', player));
        P[`platform-${v}`] = png(m.composite({ platform: v, boss: boss('thorn') }, 'platform', player));
        P[`spikes-${v}`] = png(m.composite({ spikes: v, boss: boss('blaze') }, 'spikes', player));
        P[`door-${v}`] = png(m.composite({ door: v, unarmed: true, boss: boss('proto') }, 'door', player));
        P[`exit-${v}`] = png(m.composite({ exit: v, room: true, boss: boss('strike') }, 'exit', player));
        const k = m.contrast(v);
        report.push(`${v.padEnd(6)} ground ${k.ground.toFixed(2)}  edge ${k.cap.toFixed(2)}  player on ground ${k.player.toFixed(2)}`);
      }
      return { P, A, report };
    }

    const S = await import(`${base}/design/world-art/scenes.mjs`);
    const SLICES = (await import(`${base}/design/world-art/batch${n}.mjs`))[`BATCH${n}`];
    for (const slice of SLICES) {
      const b = boss(slice.id);
      for (const [i, bd] of slice.backdrops.entries()) {
        P[`bd-${slice.id}-${i + 1}`] = png(S.backdropPicture(slice, bd, b, player));
        if (!bd.moving) continue;
        const frames = [];
        for (let f = 0; f < 60; f++) frames.push(await S.deflated(S.backdropFrame(slice, bd, b, player, f * 4, f)));
        A[`bd-${slice.id}-${i + 1}`] = frames;
      }
      const brightest = slice.backdrops.map((bd) => S.pitSample(bd, b).reduce((m, p) => (lum(p) > lum(m) ? p : m), [0, 0, 0]));
      for (const [k, name, , M] of slice.materials) {
        P[`mat-${slice.id}-${k}`] = png(S.materialPicture(slice, M, b, player));
        const g = brightest.map((p) => cr(rgb(M.check.ground), p)), e = brightest.map((p) => cr(rgb(M.check.cap), p));
        const worst = g.indexOf(Math.min(...g));
        report.push(`${slice.type.padEnd(9)} ${k} ${name.padEnd(17)} ground ${Math.min(...g).toFixed(2)} (backdrop ${worst + 1})  edge ${Math.min(...e).toFixed(2)}  player ${cr([255, 255, 255], rgb(M.check.ground)).toFixed(2)}`);
      }
    }
    return { P, A, report };
  }, { base: url, n: batch });

  for (const [name, data] of Object.entries(res.P)) writeFileSync(join(out, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  for (const [name, frames] of Object.entries(res.A)) writeFileSync(join(out, `${name}.apng`), apng(480, 268, frames, 15));
  console.log(`${Object.keys(res.P).length} pictures and ${Object.keys(res.A).length} moving pictures in ${out}`);
  console.log('worst contrast (the game asks ground 2, edge 4.5, player 4.5):');
  for (const line of res.report) console.log('  ' + line);
} finally {
  await browser.close();
  server.close();
}
