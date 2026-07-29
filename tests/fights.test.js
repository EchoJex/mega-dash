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

test('overlapping same-source patches merge instead of piling up', () => {
  const list = [];
  Attr.addPatch(list, Attr.makePatch('hot', 0, 0, 20, 4, 60));
  Attr.addPatch(list, Attr.makePatch('hot', 10, 0, 20, 4, 90));
  assert.equal(list.length, 1);
  assert.equal(list[0].w, 30, 'the merged patch should span both');
  assert.equal(list[0].t, 90, 'and take the longer duration, not the sum');
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
