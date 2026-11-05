/**
 * node design/world-art/render.mjs <out-dir> — paint the world-pieces canvas's pictures.
 *
 * Opens variants.mjs in Chromium through the shared harness (tools/harness.mjs),
 * paints every picture the review canvas shows at the game's own size, one PNG
 * each, and prints how each material's ground and lit edge do against the
 * seventeen backdrops (the same three checks tests/contrast.test.js makes on the
 * game's ground today). The PNGs are uploaded to the canvas; none is in the game.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, serve } from '../../tools/harness.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const out = process.argv[2];
if (!out) { console.error('usage: node design/world-art/render.mjs <out-dir>'); process.exit(1); }
mkdirSync(out, { recursive: true });

const { server, url } = await serve(REPO, 'package.json');
const browser = await launchChromium('node design/world-art/render.mjs <out-dir>');
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { console.error(e); process.exitCode = 1; });
  await page.goto(url);
  const { P, C } = await page.evaluate(async (base) => {
    const m = await import(`${base}/design/world-art/variants.mjs`);
    const { BOSSES } = await import(`${base}/src/data/bosses.js`);
    const boss = (id) => BOSSES.find((b) => b.id === id);
    const player = new Image();
    player.src = `${base}/public/sprites/player.png`;
    await player.decode();
    const png = (cv) => cv.toDataURL('image/png');
    const P = {};
    for (const s of ['A', 'B', 'C']) {
      P[`materials-${s}`] = png(m.scene({ ground: s, platform: s, spikes: s, door: s, boss: boss('proto') }, player));
    }
    for (const v of ['TODAY', 'SKYLINE', 'HILLS', 'STARS']) P[`bg-${v}`] = png(m.composite({ bg: v, boss: boss('volt') }, 'bg', player));
    for (const v of ['TODAY', 'A', 'B', 'C']) {
      P[`ground-${v}`] = png(m.composite({ ground: v, boss: boss('tempest') }, 'ground', player));
      P[`platform-${v}`] = png(m.composite({ platform: v, boss: boss('thorn') }, 'platform', player));
      P[`spikes-${v}`] = png(m.composite({ spikes: v, boss: boss('blaze') }, 'spikes', player));
      P[`door-${v}`] = png(m.composite({ door: v, unarmed: true, boss: boss('proto') }, 'door', player));
      P[`exit-${v}`] = png(m.composite({ exit: v, room: true, boss: boss('strike') }, 'exit', player));
    }
    const C = Object.fromEntries(['TODAY', 'A', 'B', 'C'].map((v) => [v, m.contrast(v)]));
    return { P, C };
  }, url);
  for (const [name, data] of Object.entries(P)) writeFileSync(join(out, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  console.log(`${Object.keys(P).length} pictures in ${out}`);
  console.log('worst contrast against the 17 backdrops (the game asks ground 2, edge 4.5, player 4.5):');
  for (const [v, k] of Object.entries(C)) console.log(`  ${v.padEnd(6)} ground ${k.ground.toFixed(2)}  edge ${k.cap.toFixed(2)}  player on ground ${k.player.toFixed(2)}`);
} finally {
  await browser.close();
  server.close();
}
