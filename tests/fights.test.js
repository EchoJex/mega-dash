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
import { FIGHTS, fightFor, hasFight } from '../src/data/bossFights.js';
import { BOSSES, BOSS_BY_ID, PLAYABLE_BOSSES, makeBossBag } from '../src/data/bosses.js';
import { hasLadder } from '../src/data/weapons.js';
import * as Attr from '../src/systems/attributes.js';
import * as Arena from '../src/systems/arena.js';
import { FEEL } from '../src/config/feel.js';

const VIEW_W = 400, FLOOR = 184;

/** A boss mid-fight in its own arena, with everything a behaviour may read. */
function harness(bossId, layer) {
  const def = BOSS_BY_ID[bossId];
  const arena = Arena.makeArena(def, layer, VIEW_W, FLOOR);
  const shots = [], shakes = [], hurts = [], shoves = [], blocks = [], bossHits = [];
  const bullets = [];
  const status = Attr.makeStatus();
  // Must match what GameScene.spawnBoss actually builds. `anim` in particular
  // is not optional: behaviours bob and pulse off it, and a harness without it
  // silently produced NaN positions — which then froze the state machine
  // before it reached the code the test was there to exercise. A harness that
  // is missing a field does not fail, it just stops testing.
  const boss = {
    ...def, layer, x: 200, y: FLOOR - 42, w: 32, h: 42,
    hp: 100, maxHp: 100, anim: 0, state: 'idle',
    isBoss: true, status: {}, fs: null, hs: null,
  };
  const player = { x: 80, y: FLOOR - 24, vx: 0, vy: 0, onGround: true };
  // A boss may summon, and a hazard may reach through what it summoned. The
  // harness has to own a real list for both — the same lesson as `anim`: a
  // missing field does not fail loudly, it just stops testing the code.
  const minions = [];
  return {
    arena, shots, shakes, hurts, shoves, blocks, status, boss, player, minions,
    ctx: {
      boss, player, layer, arena, floorY: FLOOR,
      minions,
      vaporise: (e) => { e.hp = 0; },
      // The room hitting its own boss — Strike Man's lifted training bag.
      hitBoss: (dmg) => { bossHits.push(dmg); },
      summon: (kind, x, y, cap = 99) => {
        if (minions.filter((m) => m.hp > 0 && m.kind === kind).length >= cap) return null;
        const m = { kind, x, y, w: 12, h: 12, hp: 10, vx: -0.5, vy: 0, status: {} };
        minions.push(m);
        return m;
      },
      playerBox: { x: 86, y: FLOOR - 22, w: 12, h: 22 },
      bounds: { x0: 16, x1: VIEW_W - 16 },
      // Arrived with Thorn Man's ground cover, which reacts to the player's own
      // shots and reads the Swarm Caller's allies off the run.
      bullets,
      run: { allies: [], coverSlow: 1 },
      shoot: (s) => shots.push(s),
      // EVERY KEY THE REAL CONTEXT HAS. A fake that is missing one does not
      // fail loudly, it fails as a TypeError deep inside a state machine that
      // then wedges before reaching the line under test — which is exactly how
      // a whole boss harness once ran green against a fight that died on a
      // real device. `sfx` arrived with Strike Man's thrown bag.
      sfx: () => {},
      shake: (mag, dur) => shakes.push({ mag, dur }),
      hurt: (x, d) => hurts.push({ x, d }),
      status: (id, f, o) => Attr.applyStatus(status, id, f, o),
      patch: (id, x, y, w, h, f, o = {}) =>
        Attr.addPatch(arena.patches, Object.assign(Attr.makePatch(id, x, y, w, h, f), o)),
      shove: (dx, dy) => { shoves.push({ dx, dy }); player.x += dx; player.y += dy; },
      blockAt: (x, y, r) => blocks.push({ x, y, r }),
      flash: (frames, at) => {
        arena.flash = Math.max(arena.flash, frames);
        if (at !== undefined) arena.boltX = at;
      },
    },
    bossHits,
    bullets,
  };
}

/**
 * Every written layer runs a long stretch without throwing AND does something.
 *
 * These were two tests running two near-identical simulations. A layer that
 * throws and a layer that silently does nothing are both "this fight is broken",
 * and one pass over each layer answers both — a boss that never acts is not
 * meaningfully different from one that crashes, from the player's side.
 */
test('every defined fight layer runs a long stretch, without throwing and without idling', () => {
  for (const [id, f] of Object.entries(FIGHTS)) {
    for (const kind of ['attack', 'hazard']) {
      for (const layer of [1, 2, 3]) {
        const beh = f[kind][layer];
        if (!beh) continue;
        const h = harness(id, layer);
        let pushed = false;
        assert.doesNotThrow(() => {
          // Long enough for every state machine to cycle several times,
          // including Blaze Man's layer-3 flood at ~900 frames.
          for (let i = 0; i < 3000; i++) {
            h.boss.anim++;                 // GameScene does this before stepping
            beh.step(h.ctx);
            Arena.stepArena(h.arena);
            // Sampled per frame, not read at the end: a force is rebuilt every
            // frame rather than accumulated, so by the last frame it may be
            // back at zero. Tempest Man's whole layer-1 hazard is push — rain
            // and the current toward the drain — and it spawns nothing at all,
            // so counting only spawned things scored a working hazard as idle.
            if (h.arena.push.x || h.arena.push.y) pushed = true;
          }
        }, `${id} ${kind} L${layer}`);
        // Shoves and bullet-blocking count as acting: Tempest Man's attack
        // layers fire nothing at all — the jetpack plume IS the attack — and
        // scoring that as idle would be measuring the wrong thing.
        //
        // So does DRAGGING THE PLAYER'S FEET. Thorn Man's layer-1 ground cover
        // spawns nothing, pushes nothing and hurts nobody — standing in it is
        // "a slightly noticeable movement speed drop" and that is the entire
        // layer. A hazard whose only effect is on the player's own movement is
        // still a hazard, and the list has to be able to see it or the next one
        // like it gets written off as idle.
        const slowed = (h.ctx.run.coverSlow ?? 1) < 1 ? 1 : 0;
        const acted = h.shots.length + h.shakes.length + h.hurts.length
          + h.arena.hazards.length + h.arena.patches.length + (pushed ? 1 : 0)
          + h.shoves.length + h.blocks.length + slowed;
        assert.ok(acted > 0, `${id} ${kind} L${layer} did nothing across 3000 frames`);

        // A NaN position is worse than a crash: the boss keeps "running", every
        // comparison against it is false, and the state machine wedges in
        // whatever mode it was in — so the fight looks alive and does nothing.
        // That is exactly how a real crash in Tempest Man's climb state stayed
        // hidden behind a green test.
        assert.ok(Number.isFinite(h.boss.x) && Number.isFinite(h.boss.y),
          `${id} ${kind} L${layer} left the boss at a non-finite position`);
      }
    }
  }
});

/**
 * A STATE MACHINE THAT WEDGES IS THE QUIET FAILURE MODE.
 *
 * It throws nothing, it keeps being called, and it keeps doing whatever its
 * current mode does forever — so "runs without throwing" and "does something"
 * are both satisfied while the fight is broken. Requiring the cycle to CLOSE
 * twice is what catches it: every attack loop is a loop, and one that never
 * comes back round to where it started is stuck.
 */
test('every attack loop cycles back to its opening state, more than once', () => {
  for (const [id, f] of Object.entries(FIGHTS)) {
    for (const layer of [1, 2, 3]) {
      const beh = f.attack[layer];
      if (!beh) continue;
      const h = harness(id, layer);
      let opening = null, left = false, closes = 0;
      const seen = new Set();
      for (let i = 0; i < 6000; i++) {
        h.boss.anim++;
        beh.step(h.ctx);
        Arena.stepArena(h.arena);
        const mode = h.boss.fs?.mode;
        if (mode === undefined) continue;
        seen.add(mode);
        if (opening === null) { opening = mode; continue; }
        if (mode !== opening) { left = true; continue; }
        if (left) { closes++; left = false; }
      }
      assert.ok(seen.size > 1, `${id} attack L${layer} never left '${opening}'`);
      assert.ok(closes >= 2,
        `${id} attack L${layer} wedged in '${[...seen].pop()}' — `
        + `reached ${[...seen].join('/')} but closed the cycle ${closes} time(s)`);
    }
  }
});

/**
 * Stated as a PROPERTY rather than as an example.
 *
 * It used to name Strike Man, whose hazard was written to layer 1 only — and
 * then his layers 2 and 3 were built and the test failed for the best possible
 * reason. Every boss with a fight now has all three of both, so there is no
 * live example of a fallback left to point at, and picking a new one would
 * only book the same appointment again. The rule holds whatever the table
 * contains: a layer resolves to the hardest one WRITTEN at or below it.
 */
test('layer falls BACK to the hardest layer written, never forward', () => {
  for (const [id, entry] of Object.entries(FIGHTS)) {
    for (const kind of ['attack', 'hazard']) {
      for (const layer of [1, 2, 3]) {
        const got = fightFor(id, layer)[kind];
        let want = null;
        for (let l = layer; l >= 1 && !want; l--) want = entry[kind][l] || null;
        assert.equal(got, want, `${id} ${kind} L${layer}`);
      }
    }
  }
  // A boss with no entry at all degrades instead of throwing.
  assert.deepEqual(fightFor('nope', 2), { attack: null, hazard: null });
});

/**
 * A fight may only be as complete as its tracker fields. This is the guard
 * against filling a `null` in because it looked like a gap — the layers a boss
 * has must match the layers the owner has actually written.
 */
test('no boss has more built layers than the tracker defines', () => {
  const written = {
    core: { attack: 3, hazard: 3 },
    blaze: { attack: 3, hazard: 3 },
    torrent: { attack: 3, hazard: 3 },
    volt: { attack: 3, hazard: 3 },
    strike: { attack: 3, hazard: 3 },
    // A ROOM WITH NO FIGHT IN IT IS A LEGAL STATE, and Thorn Man is the first.
    // His ground cover is `[draft]` at L1 and L2; L3 and every attack layer are
    // still `[wip]`. `hasFight` asks about the ATTACK table, so he stays out of
    // a playtester's boss bag until his moveset lands — see PLAYABLE_BOSSES.
    thorn: { attack: 0, hazard: 2 },
  };
  assert.deepEqual(Object.keys(FIGHTS).sort(), Object.keys(written).sort(),
    'a boss gained or lost a fight entry — update the expected map with it');
  for (const [id, want] of Object.entries(written)) {
    for (const kind of ['attack', 'hazard']) {
      const built = [1, 2, 3].filter((l) => FIGHTS[id][kind][l]).length;
      assert.equal(built, want[kind], `${id} ${kind}`);
    }
  }
});

test('every furnished boss gets the geometry its hazards need', () => {
  const core = Arena.makeArena(BOSS_BY_ID.core, 1, VIEW_W, FLOOR);
  assert.ok(core.turrets.length > 0, 'Proto Mk0 needs ceiling turrets');

  const blaze = Arena.makeArena(BOSS_BY_ID.blaze, 1, VIEW_W, FLOOR);
  assert.ok(blaze.platforms.length > 0, 'Blaze Man needs phasing platforms');
  assert.equal(blaze.liquid.kind, 'lava');

  const torrent = Arena.makeArena(BOSS_BY_ID.torrent, 2, VIEW_W, FLOOR);
  assert.ok(torrent.drain, 'Tempest Man needs a drain');
  assert.equal(torrent.liquid.kind, 'water');
  assert.equal(torrent.drain.grateHurts, true, 'the grate hurts from layer 2');
  assert.equal(torrent.pipes.length, 2, 'barrels and spike balls come out of the pipes');

  const volt = Arena.makeArena(BOSS_BY_ID.volt, 2, VIEW_W, FLOOR);
  assert.ok(volt.panels.length > 1, 'Volt Man needs floor panels to sweep');
  assert.ok(volt.conductors.length > 0, 'and conductors overhead');
  // The sweep has to be able to reach anywhere the player can stand: a gap in
  // the tiling would be a permanent safe square that makes it optional.
  const span = volt.panels.reduce((s, p) => s + p.w, 0);
  assert.ok(span >= volt.x1 - volt.x0 - volt.panels.length,
    'the panels must tile the whole floor, leaving no free square');

  const strike = Arena.makeArena(BOSS_BY_ID.strike, 1, VIEW_W, FLOOR);
  assert.ok(strike.rails.length > 0, 'Strike Man needs ceiling rails');

  // A boss with no furniture entry still gets a valid, empty room.
  const other = Arena.makeArena(BOSS_BY_ID.thorn, 1, VIEW_W, FLOOR);
  assert.deepEqual(other.turrets, []);
  assert.equal(other.liquid, null);
});

/**
 * THE LAMP IS THE HAZARD. A floor panel that energised without warning would be
 * a tax rather than something to read, and every layer escalates the speed and
 * the coverage — never the warning. This is the one Volt Man invariant worth
 * pinning, because losing it would not fail any other test.
 */
test('a Volt Man floor panel is never live without having been telegraphed', () => {
  for (const layer of [1, 2, 3]) {
    const h = harness('volt', layer);
    const hz = FIGHTS.volt.hazard[layer];
    const warned = new Set();
    for (let i = 0; i < 3000; i++) {
      hz.step(h.ctx);
      Arena.stepArena(h.arena);
      h.arena.panels.forEach((p, k) => {
        if (p.tell > 0 || p.pending > 0) warned.add(k);
        if (p.live > 0) {
          assert.ok(warned.has(k),
            `panel ${k} energised with no lamp warning at L${layer} frame ${i}`);
        }
      });
    }
    assert.ok(warned.size > 0, `the L${layer} sweep never ran`);
  }
});

/**
 * Tempest Man's pipes deliver different things per layer, and the difference is
 * the whole shape of the room: at layer 1 they hand you footing, at layer 3
 * they hand you spikes. Asserted as WHICH KINDS appear, not how many — the
 * cadence is a placeholder.
 */
test('Tempest Man stops sending barrels by layer 3', () => {
  const kindsAt = (layer) => {
    const h = harness('torrent', layer);
    const hz = FIGHTS.torrent.hazard[layer];
    const kinds = new Set();
    for (let i = 0; i < 6000; i++) {
      hz.step(h.ctx);
      Arena.stepArena(h.arena);
      for (const o of h.arena.hazards) kinds.add(o.kind);
      h.arena.hazards.length = 0;      // collect and clear; drift is not the point
    }
    return kinds;
  };
  assert.deepEqual([...kindsAt(1)], ['barrel'], 'layer 1 is barrels only');
  assert.ok(kindsAt(2).has('spikeball'), 'layer 2 adds spike balls');
  assert.deepEqual([...kindsAt(3)], ['spikeball'], 'layer 3 is spike balls only');
});

test('a Tempest Man barrel is standable and shootable; a spike ball is neither', () => {
  const h = harness('torrent', 2);
  const hz = FIGHTS.torrent.hazard[2];
  const seen = {};
  for (let i = 0; i < 6000 && Object.keys(seen).length < 2; i++) {
    hz.step(h.ctx);
    Arena.stepArena(h.arena);
    for (const o of h.arena.hazards) seen[o.kind] = o;
  }
  assert.equal(seen.barrel.solid, true, 'a barrel is footing');
  assert.ok(seen.barrel.hp > 0, 'and can be shot away');
  assert.equal(seen.barrel.damage, undefined, 'standing on one must not hurt');
  assert.ok(seen.spikeball.damage > 0);
  assert.notEqual(seen.spikeball.solid, true, 'you cannot stand on a spike ball');
  // Both are popped by the central ball; nothing despawns on a timer, or the
  // drain would be decorative.
  assert.equal(seen.barrel.popsOnBall, true);
  assert.equal(seen.spikeball.popsOnBall, true);
  assert.equal(seen.barrel.ttl, undefined);
});

/**
 * Tempest Man's attack is a body and an exhaust plume — he fires nothing. This
 * guards that reading of the field, because the previous one gave him a water
 * cannon and the two are not compatible.
 */
test('Tempest Man attacks with his jetpack, never with a projectile', () => {
  for (const layer of [1, 2, 3]) {
    const h = harness('torrent', layer);
    const atk = FIGHTS.torrent.attack[layer];
    for (let i = 0; i < 2000; i++) atk.step(h.ctx);
    assert.equal(h.shots.length, 0, `L${layer} should fire nothing`);
    assert.ok(h.blocks.length > 0, `L${layer} plume should eat player fire`);
    assert.ok(h.boss.jet, 'the plume must be published for the renderer');
    assert.equal(h.boss.contactDamage > 1, true, 'touching him is the damage');
  }
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

/**
 * ROCKS KEEP FALLING DURING THE FLOOD, BUT NEVER ONTO A PLATFORM.
 *
 * The tracker is explicit: "Rocks shall fall, but not from right above the
 * platforms while the lava is up." While the floor is gone the platforms are
 * the only footing in the room, so a rock landing on one would make it Hot and
 * take away the last safe place to stand — but stopping the shower entirely
 * (which an earlier reading did) turned the flood into a rest.
 *
 * This guards the SAFETY property, not the rock count: a column is checked
 * against every platform's span at the moment the rock is released.
 */
test('rocks keep falling during the flood but never above a platform', () => {
  const h = harness('blaze', 3);
  const { attack, hazard } = fightFor('blaze', 3);
  let flooded = 0, rocksDuringFlood = 0;
  const seen = new Set();

  for (let i = 0; i < 8000; i++) {
    attack.step(h.ctx);
    hazard.step(h.ctx);
    Arena.stepArena(h.arena);
    if (h.arena.liquid.h <= 0.5) continue;
    flooded++;
    for (const r of h.arena.hazards) {
      if (seen.has(r)) continue;
      seen.add(r);
      rocksDuringFlood++;
      for (const pl of h.arena.platforms) {
        const over = r.x + r.w > pl.x && r.x < pl.x + pl.w;
        assert.ok(!over,
          `a rock was released above a platform during the flood at frame ${i}`);
      }
    }
  }
  assert.ok(flooded > 600, 'the flood never ran, so this proved nothing');
  assert.ok(rocksDuringFlood > 0, 'the shower stopped entirely during the flood');
});

/**
 * THE BOSS'S LIFT IS HIS ALONE, and it must not be counted as shelter. It is
 * always solid, so if the "never leave the player with nowhere to stand" rule
 * saw it, that rule would be satisfied at every moment by a platform the player
 * cannot use while he is standing on it.
 */
test('Blaze Man layer 3 gives the boss his own lift and still leaves shelter', () => {
  const h = harness('blaze', 3);
  const { attack, hazard } = fightFor('blaze', 3);
  assert.ok(h.arena.lift, 'layer 3 must build the lift');
  assert.ok(h.arena.platforms.includes(h.arena.lift));

  for (let i = 0; i < 6000; i++) {
    attack.step(h.ctx);
    hazard.step(h.ctx);
    Arena.stepArena(h.arena);
    const shelter = h.arena.platforms.filter((p) => !p.lift);
    assert.ok(shelter.some((p) => p.on),
      `every player platform was gone at frame ${i}`);
  }
});

test('Blaze Man layers 1 and 2 have no lift — it is a layer-3 tell', () => {
  for (const layer of [1, 2]) {
    assert.equal(harness('blaze', layer).arena.lift, undefined);
  }
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

/**
 * THE THREE SLOWS ARE ONE MECHANIC IN THREE COLOURS.
 *
 * This test used to assert the opposite — that constrict and freeze HOLD the
 * target — because that is what they did. The tracker now says both are
 * "functionally the same as stun", differing only by "elementally correct color
 * hue", so the contract inverted. What is guarded is the SHAPE: all three
 * stack, none of them hold, and each reads as a different element.
 */
test('stun, constrict and freeze are one behaviour with three tints', () => {
  const tints = new Set();
  for (const id of ['stun', 'constrict', 'freeze']) {
    assert.notEqual(Attr.ATTR[id].held, true, `${id} must not hold the target`);
    assert.equal(Attr.ATTR[id].stacks, true, `${id} must stack like stun`);
    tints.add(Attr.ATTR[id].tint);

    const bag = Attr.applyStatus(Attr.makeStatus(), id, 30, { step: 0.7 });
    assert.equal(Attr.isHeld(bag), false, `${id} must not read as held`);
    assert.ok(Attr.speedMult(bag) < 1, `${id} must slow the target`);
  }
  assert.equal(tints.size, 3, 'but each must read as a different element');

  // The Astral Cloak's aggro pause is NOT elemental and is still a real hold —
  // it is the only thing left that stops an actor outright.
  assert.equal(Attr.ATTR.cloakHold.held, true);
});

/**
 * STUN IS A SLOW, NOT A HOLD, and it is the only attribute that stacks.
 *
 * Constrict and freeze have since joined it rather than opposing it — see the
 * test above. What this guards is the arithmetic: a multiplicative cut that
 * resets its own duration on every re-application, and a ceiling so a stack
 * cannot reach the softlock it once did.
 */
test('stun slows multiplicatively and stacks instead of holding', () => {
  assert.notEqual(Attr.ATTR.stun.held, true, 'stun must not hold the target');

  const bag = Attr.makeStatus();
  Attr.applyStatus(bag, 'stun', 300, { step: 0.7 });
  assert.equal(Attr.isHeld(bag), false, 'a stunned actor can still act');
  assert.ok(Math.abs(Attr.speedMult(bag) - 0.7) < 1e-9);

  // Each stack takes its cut of what is LEFT, so two stacks is 0.49, not 0.4.
  Attr.applyStatus(bag, 'stun', 300, { step: 0.7 });
  assert.ok(Math.abs(Attr.speedMult(bag) - 0.49) < 1e-9);
  assert.equal(bag.stun.stacks, 2);
  assert.equal(bag.stun.t, 300, 're-application resets the full duration');

  // ...and it never reaches zero, which is why no cap is needed.
  for (let i = 0; i < 40; i++) Attr.applyStatus(bag, 'stun', 300, { step: 0.7 });
  assert.ok(Attr.speedMult(bag) > 0);
});

test('an expired stun drops its stacks rather than resuming from them', () => {
  const bag = Attr.makeStatus();
  Attr.applyStatus(bag, 'stun', 2, { step: 0.7 });
  Attr.applyStatus(bag, 'stun', 2, { step: 0.7 });
  assert.equal(bag.stun.stacks, 2);
  for (let i = 0; i < 4; i++) Attr.stepStatus(bag);
  Attr.applyStatus(bag, 'stun', 300, { step: 0.7 });
  assert.equal(bag.stun.stacks, 1, 'a fresh stun starts over at one stack');
});

test('other statuses still refuse to stack with themselves', () => {
  const bag = Attr.makeStatus();
  Attr.applyStatus(bag, 'burn', 120);
  Attr.applyStatus(bag, 'burn', 120);
  assert.equal(bag.burn.t, 120, 'a second burn refreshes, never adds');
  assert.equal(bag.burn.stacks, undefined);
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

test('Blaze Man attack Hot is 1.5 seconds on every layer, and shorter than the hazard', () => {
  // The owner set this explicitly after playtesting 3s. A fireball trail and the
  // layer-3 flood residue are both ATTACK-sourced and must agree. The ARENA
  // hazard's Hot is deliberately longer — a rock scorches, a fireball brushes.
  for (const layer of [1, 2, 3]) {
    const h = harness('blaze', layer);
    const { attack } = fightFor('blaze', layer);
    let seen = 0;
    for (let i = 0; i < 4000 && seen === 0; i++) {
      attack.step(h.ctx);
      Arena.stepArena(h.arena);
      for (const s of h.shots) if (s.hot) { assert.equal(s.hot, 90, `L${layer} fireball Hot`); seen++; }
    }
    assert.ok(seen > 0, `L${layer} never fired a Hot-bearing shot`);
  }
  assert.ok(FEEL.hotLingerFrames > 90, 'a rock must scorch for longer than a fireball brushes');
});

/**
 * THE MARK IS THE SIZE OF THE THING THAT MADE IT.
 *
 * Both hot-laying call sites go through surfacePatch precisely so this cannot
 * drift apart again — a radius-3 fireball stamping a 16px patch is an invisible
 * hitbox, and the owner spotted it as "the patches feel too big for the size of
 * the things that were applying the attribute".
 */
test('a surface patch is exactly as wide as its source', () => {
  const rock = Attr.surfacePatch('hot', 100, 15, 184, 300);      // a 15px rock
  assert.equal(rock.w, 15);
  assert.equal(rock.x, 100);

  const radius = 3;                                              // a Blaze fireball
  const ball = Attr.surfacePatch('hot', 50 - radius, radius * 2, 184, 90);
  assert.equal(ball.w, 6, 'a 6px fireball leaves a 6px mark');
  assert.equal(ball.x + ball.w / 2, 50, 'centred on the source');

  // Both sit ON the surface rather than floating above or sinking below it.
  for (const p of [rock, ball]) {
    assert.ok(p.y < 184 && p.y + p.h > 184 - 4, 'the patch must sit in the surface');
  }
  // Degenerate sources still produce something you can see and collide with.
  assert.ok(Attr.surfacePatch('hot', 0, 0, 100, 60).w >= 2);
});

/**
 * The rockfall's readability contract, both halves of it.
 *
 * The shake IS the telegraph, so it has to be long enough to read as a warning
 * and it has to arrive well before the first rock. And however many rocks a
 * cycle throws, only three may be in the air at once — the cap is what keeps a
 * gap to stand in, and it is why the count could be raised at all.
 */
test('the rockfall telegraphs long before it lands, and never exceeds three in the air', () => {
  for (const layer of [1, 2, 3]) {
    const h = harness('blaze', layer);
    const hz = FIGHTS.blaze.hazard[layer];
    let shakeAt = null, firstRockAt = null, peak = 0, total = 0;
    const seen = new Set();

    for (let i = 0; i < 4000; i++) {
      hz.step(h.ctx);
      Arena.stepArena(h.arena);
      // Rocks are not stepped here (that lives in GameScene), so retire them on
      // a fixed flight time — otherwise the cap could never be exercised.
      for (const r of h.arena.hazards) {
        if (seen.has(r)) continue;
        seen.add(r); total++;
        if (firstRockAt === null) firstRockAt = i;
      }
      if (h.shakes.length && shakeAt === null) shakeAt = i;
      peak = Math.max(peak, h.arena.hazards.length);
      if (h.arena.hazards.length && i % 40 === 39) h.arena.hazards.shift();
    }

    // The CONTRACT, not the tuning. "Three in the air" is a number the owner
    // stated, so it is asserted exactly. The shake's length and lead are feel
    // values that will be tuned again, so this only asserts the ORDER that has
    // to hold — the room shakes first, and the shake is still running when the
    // first rock arrives. Pinning the frame counts here would fail the build the
    // next time the telegraph is deliberately retimed.
    assert.ok(peak <= 3, `L${layer} had ${peak} rocks airborne at once`);
    assert.ok(total > 3, `L${layer} only ever produced ${total} rocks`);
    assert.ok(shakeAt !== null && firstRockAt !== null, `L${layer} never ran a cycle`);
    assert.ok(firstRockAt > shakeAt,
      `L${layer} dropped a rock before the shake that is supposed to announce it`);
    assert.ok(h.shakes[0].dur > firstRockAt - shakeAt,
      `L${layer} finished shaking before the first rock landed — the tell and the `
      + `threat never overlap`);
  }
});

test('more rocks per cycle at layer 2 than layer 1, and layer 3 matches layer 2', () => {
  // The owner's correction stands: the ROOM stops escalating at layer 2.
  const per = (layer) => {
    const h = harness('blaze', layer);
    const hz = FIGHTS.blaze.hazard[layer];
    let n = 0;
    const seen = new Set();
    for (let i = 0; i < 1400; i++) {
      hz.step(h.ctx);
      Arena.stepArena(h.arena);
      for (const r of h.arena.hazards) if (!seen.has(r)) { seen.add(r); n++; }
      h.arena.hazards.length = 0;
    }
    return n;
  };
  const l1 = per(1), l2 = per(2), l3 = per(3);
  assert.ok(l2 > l1, `L2 (${l2}) should throw more rocks than L1 (${l1})`);
  assert.equal(l2, l3, 'L3 uses the same rockfall as L2');
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

/**
 * A PLAYTESTER MEETS ONLY DEVELOPED CONTENT.
 *
 * Both halves of that rule are DERIVED — the boss roster from the fight table,
 * the grantable weapons from the ladder table — so neither can go stale. What
 * these guard is that the derivation is still wired to the thing it claims to
 * read, which a refactor can quietly break with every list still looking right.
 */
test('the shipped boss roster is exactly the bosses that fight', () => {
  const roster = PLAYABLE_BOSSES().map((b) => b.id);
  assert.ok(roster.length > 0, 'a playtester would have no bosses at all');
  for (const b of BOSSES) {
    assert.equal(
      roster.includes(b.id), hasFight(b.id),
      `${b.id}: in the shipped roster? ${roster.includes(b.id)}, but has a fight? ${hasFight(b.id)}`,
    );
  }
  // ...and every one of them fights at every layer, since fightFor falls back.
  for (const id of roster) {
    for (const layer of [1, 2, 3]) {
      assert.ok(fightFor(id, layer).attack, `${id} L${layer} has no attack loop`);
    }
  }
});

test('the shuffle bag never leaves its pool, and an empty pool falls back', () => {
  const pool = PLAYABLE_BOSSES();
  const next = makeBossBag(pool);
  const ids = new Set(pool.map((b) => b.id));
  for (let i = 0; i < 200; i++) {
    assert.ok(ids.has(next().id), 'the bag handed out a boss from outside its pool');
  }
  // A run with no doors is a worse failure than a run with an unfinished boss.
  const fallback = makeBossBag([]);
  assert.ok(fallback(), 'an empty pool produced no boss at all');
});

test('every boss a shipped run can reach drops a weapon with a real ladder', () => {
  // This is why the weapon DROP needs no filter of its own: the boss gate
  // already implies it. If a future boss breaks the implication, say so here
  // rather than shipping a placeholder weapon as a reward.
  for (const b of PLAYABLE_BOSSES()) {
    assert.ok(hasLadder(b.dropWeapon), `${b.id} drops ${b.dropWeapon}, which has no ladder`);
  }
});
