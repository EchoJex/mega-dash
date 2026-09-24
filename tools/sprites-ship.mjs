/**
 * npm run sprites:ship — the sprite half of the tracker's marker gate.
 *
 * The design tracker has one word for "this is finished, build it": a field
 * moves to `[draft]`, Claude builds it, and it settles at `[ready]` once it is
 * built and untouched. Sprite frames now carry the same markers and this is the
 * same handshake — give the word, and every `draft` frame that genuinely
 * reaches the game is promoted to `ready`.
 *
 * IT VERIFIES BEFORE IT PROMOTES, and that is the whole value of it. `ready`
 * means "built and in the game", so promoting a frame that never made it would
 * put a lie in the one file that is supposed to answer the question. Four
 * things have to be true, and every one of them has been the thing that was
 * wrong at least once:
 *
 *   THE SHEET IS IN THE MANIFEST. The Volt Spark was drawn, published, built
 *   to a PNG and still invisible, waiting on a hand-written line.
 *
 *   THE PNG IS ON DISK AT THE RIGHT SIZE. A sheet one frame short still loads
 *   and is wrong by one frame forever.
 *
 *   THE FRAME IS IN ITS ANIMATION. A `wip` frame keeps its cell and is left
 *   out of the anim, so being in the PNG is not the same as being played.
 *
 *   SOMETHING CAN ACTUALLY PLAY IT. An animation nobody names is an animation
 *   that holds frame 1 forever — which is exactly what a projectile did until
 *   `onlyClipOf` landed.
 *
 * A frame that fails any of them is LEFT AT `draft` and the reason is printed.
 * Nothing here draws, deletes or renumbers: the only edit it makes is a status.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse, serialize, framesOf } from '../docs/sprite-fmt.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(REPO, 'design/sprites');
const dry = process.argv.includes('--dry');

// BUILD FIRST, ALWAYS. Promoting against a stale sprite-art.json would check
// the previous run's answer and call it this run's.
console.log('building…\n');
execFileSync('node', [join(REPO, 'tools/sprites-build.mjs')], { stdio: 'inherit' });

const art = JSON.parse(readFileSync(join(REPO, 'src/data/sprite-art.json'), 'utf8'));
const targets = JSON.parse(readFileSync(join(REPO, 'design/sprite-targets.json'), 'utf8'));
const targetOf = (id) => (id === 'player' ? targets.player
  : targets.minions.find((x) => x.id === id)
  || targets.bosses[id] || targets.shots[id] || targets.pickups[id] || null);

/**
 * WHICH CLIP NAMES THE GAME CAN ASK FOR, PER ACTOR.
 *
 * The first version of this grepped src/ for the action name in quotes and was
 * wrong in both directions on its first real test: it passed a `charge`
 * animation because `sfx('charge')` exists, and it passed `fly` on a PROJECTILE
 * because a MINION's clip happens to be called `fly`. A string appearing
 * somewhere in the codebase is not the same as this actor being able to play it.
 *
 * The player's set is DERIVED by running `playerClip` over the states that
 * produce each branch, so it cannot drift from the function the game calls.
 * The minions' is written down, because the scene picks theirs inline and
 * there is nothing importable to ask.
 *
 * ANYTHING NOT LISTED FALLS BACK TO `onlyClipOf` — one animation plays itself.
 * An actor that grows a SECOND animation is held here until whoever taught the
 * game to pick between them says so, which is the right direction to fail: the
 * alternative is marking a frame `ready` that holds pose 1 forever.
 */
const PLAYER_STATES = [
  { sliding: true, onGround: true, vx: 0, vy: 0 },
  { sliding: false, onGround: true, vx: 1, vy: 0 },
  { sliding: false, onGround: true, vx: 0, vy: 0 },
  { sliding: false, onGround: false, vx: 0, vy: -5 },
  { sliding: false, onGround: false, vx: 0, vy: 0 },
  { sliding: false, onGround: false, vx: 0, vy: 5 },
];
const { playerClip } = await import('../src/systems/assets.js');
const CLIPS = {
  player: new Set(PLAYER_STATES.map(playerClip)),
  // GameScene picks these inline from the minion's plane of movement.
  spiglet: new Set(['walk']),
  drifter: new Set(['fly']),
};
const named = (key, action) => CLIPS[key]?.has(action) ?? false;

const png = (file) => {
  const p = join(REPO, 'public/sprites', file);
  if (!existsSync(p)) return null;
  const d = readFileSync(p);
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
};

let promoted = 0, held = 0;

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.sprite'))) {
  const id = file.replace(/\.sprite$/, '');
  const path = join(SRC, file);
  const doc = parse(readFileSync(path, 'utf8'));
  const drafts = doc.frames.filter((f) => f.status === 'draft');
  if (!drafts.length) continue;

  const key = targetOf(id)?.key || id;
  const a = art[key];
  const size = a && png(a.file);
  const sole = a && Object.keys(a.anims).length === 1;
  const lines = [];
  let changed = false;

  for (const f of drafts) {
    const at = doc.frames.indexOf(f);
    const label = `${id}  ${f.action} ${f.index}`;
    const why = !a ? 'its sheet is not in the manifest — nothing built it'
      : !size ? `public/sprites/${a.file} is not on disk`
        : size.w !== doc.w * doc.frames.length || size.h !== doc.h
          ? `${a.file} is ${size.w}x${size.h}, expected ${doc.w * doc.frames.length}x${doc.h}`
          : !a.anims[f.action]?.includes(at)
            ? `not in the '${f.action}' animation the build emitted`
            : !(sole || named(key, f.action))
              ? `nothing teaches ${key} to play '${f.action}' — it would hold frame 1`
              : null;
    if (why) { lines.push(`  HELD  ${label.padEnd(34)} ${why}`); held++; continue; }
    f.status = 'ready';
    changed = true;
    promoted++;
    lines.push(`  ready ${label.padEnd(34)} ${f.hold} steps`);
  }
  if (lines.length) console.log(`\n${file}`), lines.forEach((l) => console.log(l));
  if (changed && !dry) writeFileSync(path, serialize(doc));
}

console.log(`\n${promoted} frame(s) promoted to ready`
  + (held ? `, ${held} held at draft` : '')
  + (dry ? '  (--dry: nothing written)' : ''));
if (held) {
  console.log('\nA HELD FRAME IS NOT A FAILURE — it is drawn and it builds. It is just not'
    + '\nreachable in the game yet, and `ready` would be claiming otherwise.');
}
