/**
 * npm run art:brief [-- <weapon>] — rewrite the generated parts of a weapon's
 * art brief, `design/weapon-art/<weapon>.md`.
 *
 * The brief is what Claude Design reads before drawing a weapon. Its prose —
 * what the weapon is, what each level shows — is written by hand. Its NUMBERS
 * are not: every sheet, every clip, how many frames and how long each holds,
 * the step each move hits on and where its hit area sits are worked out here
 * from `src/data/frame-data.json`, along with the rules the code holds the
 * drawing to (the weapon's rig, `tools/art/<weapon>.mjs`) and the prompt to
 * paste into Claude Design. A table copied by hand would be wrong the first
 * time a hold moved; this one cannot be, and `npm test` fails if it is stale.
 *
 * Two marked blocks in the brief are rewritten; everything else is left alone:
 *
 *     <!-- generated:contract -->  ...  <!-- /generated:contract -->
 *     <!-- generated:prompt -->    ...  <!-- /generated:prompt -->
 *
 * `npm run design:import` runs this after a handoff lands, so the brief always
 * describes the art the game is actually playing.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WEAPON_ART, weaponSheets } from '../src/data/weapon-art.js';
import { CLIP_KINDS } from '../docs/sprite-fmt.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const GITHUB = 'https://github.com/EchoJex/mega-dash/blob/main';
const frameData = () => JSON.parse(readFileSync(join(REPO, 'src/data/frame-data.json'), 'utf8'));

export const briefPath = (weapon) => join(REPO, 'design/weapon-art', `${weapon}.md`);

/** The numbers: every sheet and every clip, as the game plays them today. */
export async function contractSection(weapon) {
  const FD = frameData();
  const sheets = weaponSheets().filter((w) => w.weapon === weapon);
  const out = [];
  out.push('### The sheets', '',
    '| file | size | pivot (the pixel the game holds it by) | drawn | clips |', '|---|---|---|---|---|');
  for (const w of sheets) {
    const d = FD[w.key];
    const pv = d?.pivot ? `${d.pivot.x}, ${d.pivot.y} — ${w.heldBy}` : `none yet — ${w.heldBy}`;
    out.push(`| [\`${w.id}.sprite\`](${GITHUB}/design/sprites/${w.id}.sprite) | ${w.grid.w}×${w.grid.h} | ${pv} `
      + `| ${{ held: 'in front of the player', player: 'in place of the player' }[w.layer] ?? 'behind the player'} | ${Object.keys(w.clips).join(', ')} |`);
  }
  out.push('', '### Every clip, frame by frame', '',
    'Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move '
    + 'connects on (its first step). Hit areas are in the sheet\'s own pixels, `x, y, width×height`, drawn '
    + 'facing right.', '');
  for (const w of sheets) {
    const d = FD[w.key];
    if (!d) { out.push(`**${w.id}** — no frame data yet (run \`npm run sprites:build\`).`, ''); continue; }
    out.push(`**${w.id}**`, '', '| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |',
      '|---|---|---|---|---|---|---|');
    for (const [name, kind] of Object.entries(w.clips)) {
      const c = d.clips[name];
      if (!c) { out.push(`| ${name} | ${kind} | missing | | | | |`); continue; }
      const hitFrames = new Set(c.hits.map((h) => h.frame));
      const frames = c.holds.map((h, i) => (hitFrames.has(i) ? `**${h}**` : `${h}`)).join(' · ');
      const rects = c.hits.filter((h) => h.w);
      const area = rects.length
        ? rects.map((r) => `${r.x + d.pivot.x}, ${r.y + d.pivot.y}, ${r.w}×${r.h}`).join(' then ') : '—';
      const on = !c.hits.length ? '—'
        : kind === 'grow' ? `hurts for steps 0–${c.hits[c.hits.length - 1].step + c.hits[c.hits.length - 1].len - 1}`
          : c.hits.map((h) => h.step).join(' then ');
      const sp = c.spawns.length ? c.spawns.map((s) => `${s.x + d.pivot.x}, ${s.y + d.pivot.y}`).join('; ') : '—';
      out.push(`| ${name} | ${kind} | ${frames} | ${c.total} | ${on} | ${area} | ${sp} |`);
    }
    out.push('');
  }
  out.push('Clip kinds: ' + Object.entries(CLIP_KINDS).map(([k, v]) => `**${k}** ${v}`).join('; ') + '.', '');
  const rig = join(REPO, 'tools/art', `${weapon}.mjs`);
  if (existsSync(rig)) {
    const { constraints } = await import(pathToFileURL(rig).href);
    if (constraints) {
      out.push('### What the code holds the drawing to', '',
        'Worked out from the weapon\'s ladder; `npm test` checks every one, and a handoff that breaks one is '
        + 'refused with the reason.', '', ...constraints().map((c) => `- ${c}`), '');
    }
  }
  return out.join('\n').trimEnd();
}

/** A sheet still in the plain shapes `npm run art:placeholders` paints (its note says so). */
function isPlaceholder(id) {
  const path = join(REPO, 'design/sprites', `${id}.sprite`);
  if (!existsSync(path)) return true;
  const note = readFileSync(path, 'utf8').split('\n').find((l) => l.startsWith('note')) || '';
  return note.replace(/^note\s+/, '').startsWith('PLACEHOLDER');
}

/** The prompt to paste into Claude Design, naming this weapon's exact files. */
export function promptSection(weapon) {
  const sheets = weaponSheets().filter((w) => w.weapon === weapon);
  const name = weapon.replace(/_/g, ' ').toUpperCase();
  // Only sheets still in placeholder shapes are asked for: a finished sheet the owner
  // approved must not be redrawn because a prompt listed it (the hammer's effects, 22 Oct).
  const todo = sheets.filter((w) => isPlaceholder(w.id)), done = sheets.filter((w) => !isPlaceholder(w.id));
  const link = (w) => `   - ${GITHUB}/design/sprites/${w.id}.sprite`;
  if (!todo.length) return `Every sheet of the ${name} is finished art, so there is no prompt to paste.`;
  const files = todo.map(link).join('\n')
    + (done.length ? `\n   These ${done.length === 1 ? 'one is' : `${done.length} are`} finished art the owner approved: `
      + `read ${done.length === 1 ? 'it' : 'them'} for the look, and leave ${done.length === 1 ? 'it' : 'them'} exactly as `
      + `${done.length === 1 ? 'it is' : 'they are'}:\n${done.map(link).join('\n')}` : '');
  const what = todo.length === sheets.length ? `its ${sheets.length} sprite sheet${sheets.length === 1 ? '' : 's'}`
    : `${todo.length} of its ${sheets.length} sprite sheets`;
  return ['Paste this into Claude Design, with the repository linked:', '', '```text',
    `Draw the art for MEGA DASH's ${name}, replacing the placeholder pictures in ${what}.`,
    '',
    'Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the '
    + 'design/ and docs/ folders are enough) and read, in this order:',
    `1. ${GITHUB}/design/weapon-art/README.md — how weapon art works in this game: the .sprite format, what you `
    + 'may change, how it is checked, and what to hand back.',
    `2. ${GITHUB}/design/weapon-art/${weapon}.md — this weapon: what it is, what each level shows, every clip `
    + 'with its timing and hit areas, and the rules the code holds the drawing to.',
    `3. ${todo.length === 1 ? 'The sheet' : 'The sheets'} to draw, already in the game and playing exactly as your art will:`,
    files,
    `4. ${GITHUB}/design/DESIGN-BRIEF.md (the game's look and limits) and ${GITHUB}/design/sprites/player.sprite `
    + '(the 16-bit player: the reference for style and for scale).',
    '',
    'Redraw every frame of those sheets in the same files: same file names, same sheet sizes, same clip names, drawn facing right '
    + '(the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits '
    + 'on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game '
    + 'as soon as they pass the checks, so say what you changed and why.',
    '',
    'Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its '
    + 'hold), facing both ways, beside the player, with the hit areas drawn on.',
    '',
    'When the owner approves, give the owner ONE zip file to download, holding the .sprite files you drew and a '
    + 'HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and '
    + 'anything you would like the code to change. (If your menu has Export, then Hand off to Claude Code, that '
    + 'makes the same bundle.) The owner gives that zip to Claude Code.',
    '```'].join('\n');
}

const block = (text, tag, body) => {
  const open = `<!-- generated:${tag} -->`, close = `<!-- /generated:${tag} -->`;
  const a = text.indexOf(open), b = text.indexOf(close);
  if (a < 0 || b < a) throw new Error(`the brief has no ${open} … ${close} block`);
  return `${text.slice(0, a + open.length)}\n${body}\n${text.slice(b)}`;
};

/** The brief with both blocks rewritten (not written to disk). */
export async function refreshed(weapon) {
  const text = readFileSync(briefPath(weapon), 'utf8');
  return block(block(text, 'contract', await contractSection(weapon)), 'prompt', promptSection(weapon));
}

async function main() {
  const want = process.argv[2];
  const weapons = want ? [want] : Object.keys(WEAPON_ART);
  for (const w of weapons) {
    if (!WEAPON_ART[w]) { console.error(`no weapon art registered for '${w}'`); process.exit(1); }
    if (!existsSync(briefPath(w))) {
      console.error(`design/weapon-art/${w}.md does not exist — copy the Quake Hammer's, keep its two generated blocks, rewrite its prose`);
      process.exit(1);
    }
    const next = await refreshed(w);
    const was = readFileSync(briefPath(w), 'utf8');
    if (next !== was) writeFileSync(briefPath(w), next);
    console.log(`  ${next === was ? 'current' : 'rewrote'}  design/weapon-art/${w}.md`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
