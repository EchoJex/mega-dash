/**
 * npm run art:placeholders -- <weapon> — paint a weapon's placeholder sheets.
 *
 * THE FIRST STEP OF A WEAPON'S ART, and the only one that is arithmetic. A
 * weapon whose look will be drawn (src/data/weapon-art.js) gets every sheet
 * the code plays, at its real grid, with every clip, every frame, every hold,
 * every hit area and every pivot already in place — painted in the plainest
 * shapes there are. The game plays them exactly as it will play the real art,
 * so what the drawing has to fit is on screen and in the repo before anyone
 * draws a pixel. Design then redraws the pictures in the same files.
 *
 * The pictures and the starting frame data come from the weapon's RIG,
 * `tools/art/<weapon>.mjs`, which paints with the game's own fallback shapes
 * through a stand-in for Phaser's Graphics (tools/art/raster.mjs).
 *
 * Frames land at `ready`: built and in the game, which is the honest marker
 * for a placeholder the game is really playing.
 *
 * IT NEVER OVERWRITES DRAWN ART. A sheet is written only when it does not
 * exist yet, or when its `note` still starts with PLACEHOLDER — the mark this
 * tool leaves, and which a handoff replaces with the art's own label.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, serialize, checkFrameData } from '../docs/sprite-fmt.js';
import { WEAPON_ART, sheetId } from '../src/data/weapon-art.js';
import { PaintGraphics } from './art/raster.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const weapon = process.argv[2];
if (!weapon || !WEAPON_ART[weapon]) {
  console.error(`usage: npm run art:placeholders -- <weapon>\n  weapons with art: ${Object.keys(WEAPON_ART).join(', ')}`);
  process.exit(1);
}
if (!existsSync(join(REPO, 'tools/art', `${weapon}.mjs`))) {
  console.error(`no rig for ${weapon}: write tools/art/${weapon}.mjs (tools/art/quake_hammer.mjs is the model)`);
  process.exit(1);
}
const { rig } = await import(`./art/${weapon}.mjs`);

const PLACEHOLDER_NOTE = 'PLACEHOLDER — plain shapes painted by npm run art:placeholders. '
  + 'Redraw any frame; the clips, holds, hit areas and pivot are what the game plays.';

let wrote = 0, kept = 0;
for (const sh of rig()) {
  const spec = WEAPON_ART[weapon].sheets[sh.sheet];
  if (!spec) throw new Error(`the rig paints a '${sh.sheet}' sheet that src/data/weapon-art.js does not list`);
  const id = sheetId(weapon, sh.sheet);
  const path = join(REPO, 'design/sprites', `${id}.sprite`);
  if (existsSync(path) && !parse(readFileSync(path, 'utf8')).note.startsWith('PLACEHOLDER')) {
    console.log(`  kept   ${id}.sprite — it carries drawn art, not a placeholder`);
    kept++;
    continue;
  }
  const frames = [];
  for (const [action, list] of Object.entries(sh.clips)) {
    for (const f of list) {
      const g = new PaintGraphics(spec.grid.w, spec.grid.h, sh.palette);
      f.paint(g);
      frames.push({
        action, index: 0, status: 'ready', hold: f.hold,
        ...(f.hit ? { hit: f.hit } : {}), ...(f.spawn ? { spawn: f.spawn } : {}),
        rows: g.done(),
      });
    }
  }
  const text = serialize({
    id, w: spec.grid.w, h: spec.grid.h, fudgeW: 0.7, fudgeH: 1,
    note: PLACEHOLDER_NOTE, palette: sh.palette, pivot: sh.pivot, frames,
  });
  const broke = checkFrameData(parse(text), spec);
  if (broke.length) throw new Error(`${id}: the rig breaks its own contract:\n  ${broke.join('\n  ')}`);
  writeFileSync(path, text);
  console.log(`  wrote  ${id}.sprite  ${spec.grid.w}x${spec.grid.h}  ${frames.length} frames  `
    + Object.entries(sh.clips).map(([k, v]) => `${k}:${v.length}`).join(' '));
  wrote++;
}
for (const s of Object.keys(WEAPON_ART[weapon].sheets)) {
  if (!rig().some((r) => r.sheet === s)) console.error(`  MISSING: the rig paints no '${s}' sheet`);
}
console.log(`\n${wrote} written, ${kept} kept. Next: npm run sprites:build`);
