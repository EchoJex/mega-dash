/**
 * Boss fights, arenas and elemental attributes — PLUMBING ONLY.
 *
 * These check that every behaviour runs, that state machines advance instead of
 * throwing, that layer fallback picks the right entry, and that attributes obey
 * their structural rules (no stacking, source immunity). They deliberately do
 * NOT assert damage numbers, cooldowns or spawn counts: those are placeholders
 * straight off the tracker's adjectives and pinning them would only break the
 * build every time one is nudged. See the testing note in CLAUDE.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIGHTS, fightFor } from '../src/data/bossFights.js';
import { BOSS_BY_ID } from '../src/data/bosses.js';
import * as Attr from '../src/systems/attributes.js';
import * as Arena from '../src/systems/arena.js';
import { FEEL } from '../src/config/feel.js';

const VIEW_W = 400, FLOOR = 184;

/** A boss mid-fight in its own arena, with everything a behaviour may read. */
function harness(bossId, layer) {
  const def = BOSS_BY_ID[bossId];
  const arena = Arena.makeArena(def, layer, VIEW_W, FLOOR);
  const shots = [], shakes = [], hurts = [];
  const boss = { ...def, layer, x: 200, y: FLOOR - 42, w: 32, h: 42, fs: null, hs: null };
  const player = { x: 80, y: FLOOR - 24, vx: 0, vy: 0, onGround: true };
  return {
    arena, shots, shakes, hurts, boss, player,
    ctx: {
      boss, player, layer, arena, floorY: FLOOR,
      playerBox: { x: 86, y: FLOOR - 22, w: 12, h: 22 },
      bounds: { x0: 16, x1: VIEW_W - 16 },
      shoot: (s) => shots.push(s),
      shake: (mag, dur) => shakes.push({ mag, dur }),
      hurt: (x, d) => hurts.push({ x, d }),
      status: (id, f) => Attr.applyStatus({}, id, f),
      patch: (id, x, y, w, h, f, o = {}) =>
        Attr.addPatch(arena.patches, Object.assign(Attr.makePatch(id, x, y, w, h, f), o)),
    },
  };
}

test('every defined fight layer runs for a long stretch without throwing', () => {
  for (const [id, f] of Object.entries(FIGHTS)) {
    for (const kind of ['attack', 'hazard']) {
      for (const layer of [1, 2, 3]) {
        const beh = f[kind][layer];
        if (!beh) continue;
        const h = harness(id, layer);
        assert.doesNotThrow(() => {
          // Long enough for every state machine to cycle several times,
          // including Blaze Man's layer-3 flood at ~900 frames.
          for (let i = 0; i < 3000; i++) {
            beh.step(h.ctx);
            Arena.stepArena(h.arena);
          }
        }, `${id} ${kind} L${layer}`);
      }
    }
  }
});

test('each boss actually does something over a fight-length window', () => {
  const acted = {};
  for (const [id, f] of Object.entries(FIGHTS)) {
    const h = harness(id, 3);
    const { attack, hazard } = fightFor(id, 3);
    for (let i = 0; i < 2000; i++) {
      attack?.step(h.ctx);
      hazard?.step(h.ctx);
      Arena.stepArena(h.arena);
    }
    acted[id] = h.shots.length + h.shakes.length + h.arena.hazards.length
      + h.arena.patches.length + h.hurts.length;
  }
  for (const id of ['core', 'blaze', 'torrent']) {
    assert.ok(acted[id] > 0, `${id} did nothing at all across 2000 frames`);
  }
});

test('layer falls BACK to the hardest layer written, never forward', () => {
  // Tempest has attack L1 only and hazard L1-L2 in the tracker.
  const t3 = fightFor('torrent', 3);
  assert.equal(t3.attack, FIGHTS.torrent.attack[1]);
  assert.equal(t3.hazard, FIGHTS.torrent.hazard[2]);
  // A boss with no entry at all degrades instead of throwing.
  assert.deepEqual(fightFor('nope', 2), { attack: null, hazard: null });
});

test('the three built bosses get the furniture their hazards need', () => {
  const core = Arena.makeArena(BOSS_BY_ID.core, 1, VIEW_W, FLOOR);
  assert.ok(core.turrets.length > 0, 'Core Man needs ceiling turrets');

  const blaze = Arena.makeArena(BOSS_BY_ID.blaze, 1, VIEW_W, FLOOR);
  assert.ok(blaze.platforms.length > 0, 'Blaze Man needs phasing platforms');
  assert.equal(blaze.liquid.kind, 'lava');

  const torrent = Arena.makeArena(BOSS_BY_ID.torrent, 2, VIEW_W, FLOOR);
  assert.ok(torrent.drain, 'Tempest Man needs a drain');
  assert.equal(torrent.liquid.kind, 'water');
  assert.equal(torrent.drain.grateHurts, true, 'the grate hurts from layer 2');

  // A boss with no furniture entry still gets a valid, empty room.
  const other = Arena.makeArena(BOSS_BY_ID.volt, 1, VIEW_W, FLOOR);
  assert.deepEqual(other.turrets, []);
  assert.equal(other.liquid, null);
});

test('phasing platforms never all vanish at once', () => {
  const a = Arena.makeArena(BOSS_BY_ID.blaze, 1, VIEW_W, FLOOR);
  for (let i = 0; i < 5000; i++) {
    Arena.stepArena(a);
    assert.ok(a.platforms.some((p) => p.on), `no shelter left at frame ${i}`);
  }
});

/**
 * Blaze Man's layer-3 flood removes the floor for 30 seconds, so the platforms
 * become the only footing in the room. If they are all phased out, all Hot, or
 * all occupied by the boss, the fight is unsurvivable through no fault of the
 * player. This walks the whole flood and checks the guarantee every frame.
 */
test('the layer-3 flood always leaves somewhere safe to stand', () => {
  const h = harness('blaze', 3);
  const { attack, hazard } = fightFor('blaze', 3);
  let floodFrames = 0, worst = null;

  for (let i = 0; i < 8000; i++) {
    attack.step(h.ctx);
    hazard.step(h.ctx);
    Arena.stepArena(h.arena);

    const q = h.arena.liquid;
    if (!q || q.h <= 0.5) continue;
    floodFrames++;

    const perch = h.boss.fs?.perch;
    const safe = h.arena.platforms.filter((pl) => {
      if (!pl.on || pl === perch) return false;
      if (pl.hot > 0) return false;
      // A platform with Hot terrain on it is not a refuge either.
      return !h.arena.patches.some((p) =>
        p.x < pl.x + pl.w && p.x + p.w > pl.x && Math.abs(p.y - (pl.y - 3)) < 6);
    });
    if (safe.length === 0) { worst = i; break; }
  }

  assert.ok(floodFrames > 600, `the flood barely happened (${floodFrames} frames)`);
  assert.equal(worst, null, `no safe platform at frame ${worst} of the flood`);
});

test('no rocks fall while the lava is up', () => {
  const h = harness('blaze', 3);
  const { attack, hazard } = fightFor('blaze', 3);
  let checked = 0;
  for (let i = 0; i < 8000; i++) {
    attack.step(h.ctx);
    hazard.step(h.ctx);
    Arena.stepArena(h.arena);
    if (h.arena.liquid.h > 0.5) {
      checked++;
      assert.equal(h.arena.hazards.length, 0,
        `a rock was airborne during the flood at frame ${i}`);
    }
  }
  assert.ok(checked > 600, 'the flood never ran, so this proved nothing');
});

test('Blaze Man layers 2 and 3 use the SAME arena hazard', () => {
  // The owner's correction: the room stops escalating at layer 2. Layer 3's
  // escalation is the boss's flood, not a bigger rockfall.
  const rocksIn = (layer) => {
    const h = harness('blaze', layer);
    const hz = FIGHTS.blaze.hazard[layer];
    let count = 0, seen = new Set();
    for (let i = 0; i < 4000; i++) {
      hz.step(h.ctx);
      Arena.stepArena(h.arena);
      for (const r of h.arena.hazards) {
        if (!seen.has(r)) { seen.add(r); count++; }
      }
      h.arena.hazards.length = 0;          // collect and clear, ignore landing
    }
    return { count, size: [...seen][0]?.w, fall: [...seen][0]?.vy };
  };
  const l1 = rocksIn(1), l2 = rocksIn(2), l3 = rocksIn(3);
  assert.equal(l2.size, l3.size, 'L2 and L3 rocks must be the same size');
  assert.equal(l2.fall, l3.fall, 'L2 and L3 rocks must fall at the same speed');
  assert.ok(l2.size > l1.size, 'L2 rocks should be slightly bigger than L1');
  assert.ok(l2.fall > l1.fall, 'L2 rocks should fall slightly faster than L1');
});

test('Blaze Man has no permanent lava pools', () => {
  // Removed with the owner's correction — the arena hazard is rocks only.
  const h = harness('blaze', 3);
  const { hazard } = fightFor('blaze', 3);
  for (let i = 0; i < 2000; i++) { hazard.step(h.ctx); Arena.stepArena(h.arena); }
  assert.equal(h.arena.patches.filter((p) => p.permanent).length, 0);
});

test('a status refreshes its duration instead of stacking', () => {
  const bag = Attr.makeStatus();
  Attr.applyStatus(bag, 'burn', 100);
  for (let i = 0; i < 50; i++) Attr.stepStatus(bag);
  assert.equal(bag.burn.t, 50);
  Attr.applyStatus(bag, 'burn', 100);
  assert.equal(bag.burn.t, 100, 'reapplying should reset, not add');
});

test('burn deals whole points of damage and then expires', () => {
  const bag = Attr.makeStatus();
  Attr.applyStatus(bag, 'burn', FEEL.burnFrames);
  let total = 0;
  for (let i = 0; i < FEEL.burnFrames + 10; i++) total += Attr.stepStatus(bag);
  assert.ok(Number.isInteger(total), 'damage must arrive in whole points');
  assert.ok(total > 0, 'burn should do something');
  assert.equal(Attr.hasStatus(bag, 'burn'), false, 'burn must expire');
});

test('an actor is immune to terrain attributes it created itself', () => {
  const list = [];
  const box = { x: 10, y: 10, w: 10, h: 10 };
  Attr.addPatch(list, Attr.makePatch('hot', 0, 0, 40, 40, 60, 'player'));
  assert.equal(Attr.patchAt(list, box, 'player'), null, 'own Hot must not burn you');
  assert.ok(Attr.patchAt(list, box, 'boss'), 'but it still burns the enemy');
});

test('substantial overlap refreshes in place; partial overlap is new ground', () => {
  // Merging on ANY overlap is what let a bouncing trail weld into one strip
  // whose clock never started. Only genuinely the same ground refreshes, and
  // the span never grows.
  const same = [];
  Attr.addPatch(same, Attr.makePatch('hot', 0, 0, 20, 4, 60));
  Attr.addPatch(same, Attr.makePatch('hot', 2, 0, 20, 4, 90));
  assert.equal(same.length, 1, '90% overlap is the same ground');
  assert.equal(same[0].t, 90, 'and takes the longer duration, not the sum');
  assert.equal(same[0].w, 20, 'the span must NOT grow');

  const apart = [];
  Attr.addPatch(apart, Attr.makePatch('hot', 0, 0, 20, 4, 60));
  Attr.addPatch(apart, Attr.makePatch('hot', 10, 0, 20, 4, 90));
  assert.equal(apart.length, 2, 'half-overlapping ground ages on its own clock');
});

test('a permanent pool never weakens or expires', () => {
  const list = [];
  const pool = Attr.addPatch(list, Object.assign(
    Attr.makePatch('hot', 0, 0, 20, 4, 1), { permanent: true }));
  for (let i = 0; i < 1000; i++) Attr.stepPatches(list);
  assert.equal(list.length, 1, 'a lava pool lasts the whole fight');
  assert.equal(Attr.patchFrac(pool), 1, 'and stays at full strength');
});

test('stun, constrict and freeze are one behaviour with three tints', () => {
  const tints = new Set();
  for (const id of ['stun', 'constrict', 'freeze']) {
    assert.equal(Attr.ATTR[id].held, true, `${id} should hold the target`);
    tints.add(Attr.ATTR[id].tint);
    assert.equal(Attr.isHeld(Attr.applyStatus(Attr.makeStatus(), id, 30)), true);
  }
  assert.equal(tints.size, 3, 'but each must read as a different element');
});

test('flinch and knockback are NOT modelled as attributes', () => {
  for (const bad of ['flinch', 'knockback']) {
    assert.equal(Attr.ATTR[bad], undefined,
      `${bad} is basic hitbox interaction, not a status — see CLAUDE.md`);
  }
});

/**
 * HOT MUST START COOLING WHEN IT IS APPLIED.
 *
 * The bug this guards: addPatch merged on ANY overlap, so a bouncing fireball
 * welded its whole trail into one patch and reset that strip's clock on every
 * bounce. Ground touched first stayed at full heat until the fireball expired,
 * and only then began to cool — Hot appeared to last far longer than its
 * duration, and the duration itself looked broken.
 */
test('a bouncing trail cools from the back forward, not all at once', () => {
  const list = [];
  const HOT = 180;
  const step = (n) => { for (let i = 0; i < n; i++) Attr.stepPatches(list); };

  const first = Attr.addPatch(list, Attr.makePatch('hot', 40, 180, 16, 4, HOT, 'boss'));
  step(45);
  assert.equal(first.t, 135, 'the first patch must be ageing immediately');

  // Subsequent bounces land on ADJACENT ground and must not refresh the first.
  for (let b = 1; b < 5; b++) {
    Attr.addPatch(list, Attr.makePatch('hot', 40 + b * 14, 180, 16, 4, HOT, 'boss'));
    assert.ok(first.t < HOT, `bounce ${b + 1} refreshed ground it did not touch`);
    step(45);
  }
  assert.ok(list.length > 1, 'a trail must be several patches, not one welded strip');
});

test('re-heating the same ground refreshes and never stacks', () => {
  // The tracker is explicit: Hot does not stack with itself but resets duration.
  const list = [];
  Attr.addPatch(list, Attr.makePatch('hot', 100, 180, 16, 4, 180, 'boss'));
  for (let i = 0; i < 150; i++) Attr.stepPatches(list);
  assert.equal(list[0].t, 30);
  Attr.addPatch(list, Attr.makePatch('hot', 102, 180, 16, 4, 180, 'boss'));
  assert.equal(list.length, 1, 'the same ground must not become two patches');
  assert.equal(list[0].t, 180, 're-application must reset the duration');
});

test('one patch of Hot lasts exactly its stated duration', () => {
  const list = [];
  Attr.addPatch(list, Attr.makePatch('hot', 0, 180, 16, 4, 180, 'boss'));
  let n = 0;
  while (list.length) { Attr.stepPatches(list); n++; }
  assert.equal(n, 180, '3 seconds at 60fps');
});

test('Blaze Man attack Hot is 3 seconds on every layer', () => {
  // The owner set this explicitly. A fireball trail and the layer-3 flood
  // residue are both ATTACK-sourced and must agree.
  for (const layer of [1, 2, 3]) {
    const h = harness('blaze', layer);
    const { attack } = fightFor('blaze', layer);
    let seen = 0;
    for (let i = 0; i < 4000 && seen === 0; i++) {
      attack.step(h.ctx);
      Arena.stepArena(h.arena);
      for (const s of h.shots) if (s.hot) { assert.equal(s.hot, 180, `L${layer} fireball Hot`); seen++; }
    }
    assert.ok(seen > 0, `L${layer} never fired a Hot-bearing shot`);
  }
});

test('a patch can never outlive its own duration however often the trail passes', () => {
  // The property that actually matters: no patch is ever older than its tMax,
  // and none survives longer than its duration after its LAST application.
  const list = [];
  for (let b = 0; b < 40; b++) {
    Attr.addPatch(list, Attr.makePatch('hot', b * 11, 180, 16, 4, 180, 'boss'));
    for (const p of list) assert.ok(p.t <= p.tMax, 'a patch exceeded its own lifetime');
    for (let i = 0; i < 20; i++) Attr.stepPatches(list);
  }
  let n = 0;
  while (list.length) { Attr.stepPatches(list); n++; }
  assert.ok(n <= 180, `Hot outlived its duration by ${n - 180} frames after the last application`);
});
