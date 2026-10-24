/**
 * THE QUAKE HAMMER'S RULES, from the owner's messages of 10 Oct 2026.
 *
 * These pin the SHAPE of the weapon, not its numbers: every press is a
 * charge from its first step, the swing lands after release, a swing charged
 * under half chains into jab 2 and the finisher, a cooldown after every move,
 * what each rung lets the player do
 * while swinging, the Lv3 dust cloud, the Lv10 spikes that hurt only while
 * growing and then block, and the sand they turn into. Frame counts, hit
 * areas and damage are read OUT of the hammer's frame data and ladder rather
 * than written here, because they are the owner's and the art's to change —
 * a redrawn sheet that moves a hit by two steps must still pass. What this
 * checks is that the hammer obeys whatever they say. tests/weapons.test.js
 * already runs the weapon for thousands of steps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ladderAt, damageAtLevel, weaponOf, DAMAGE_WORDS,
} from '../src/data/weapons.js';
import * as Wpn from '../src/systems/weaponry.js';
import { clipOf, cellAt, growStepsOf, areaAt, pointAt } from '../src/systems/frame-data.js';

const ID = 'quake_hammer';
const FLOOR = 184;

function rig({ level = 1, onGround = true, over = true } = {}) {
  const run = {
    frame: 0, dmgMult: 1, wstate: {}, allies: [], lastDamaged: null,
    meleeArmor: 0, rootFrames: 0, moveScale: 1, planted: false, glideFall: null, airControl: 1,
    aggroFire: 1, aggroPause: null, wpLevels: { [ID]: level },
  };
  const player = { x: 100, y: FLOOR - 24, vx: 0, vy: 0, facing: 1, onGround };
  const mk = (x, y, extra = {}) => ({
    x, y, w: 12, h: 12, hp: 999, vy: 0, vx: 0, kbVx: 0, status: {}, ...extra,
  });
  const enemy = mk(124, FLOOR - 12);
  const hits = [], bullets = [];
  const fx = Wpn.makeFx();
  const ctx = {
    run, player, bullets, allies: run.allies, enemies: [enemy],
    arena: { x0: 0, x1: 400, floorY: FLOOR, patches: [], platforms: [] },
    platforms: [], statusBag: {}, floorY: FLOOR, landVy: 0, equipped: [ID], fx,
    levelOf: () => level, heal() {},
    spawn: (s) => bullets.push(s),
    hitEnemy: (e, dmg, opts) => {
      hits.push({ e, dmg, opts, at: run.frame });
      e.hp -= dmg;
      if (opts?.knockback) e.kbVx = opts.knockback;
    },
    overGround: () => over,
    shake() {}, puff: (s) => Wpn.puff(fx, s), arc() {}, patch() {}, sfx() {},
  };
  /** One game step, in GameScene's order: grants cleared, weapons, effects. */
  const step = () => {
    run.frame++;
    run.moveScale = 1;
    run.planted = false;
    Wpn.stepWeapons(ctx, [ID]);
    Wpn.stepFx(fx);
  };
  const steps = (n) => { for (let i = 0; i < n; i++) step(); };
  /** Hold the button `n` steps, then let go — exactly what GameScene feeds it. */
  const press = (n) => {
    for (let i = 1; i <= n; i++) { step(); Wpn.holdActive(ctx, ID, i); }
    step();
    return Wpn.fireActive(ctx, ID, n);
  };
  const holdFor = (n) => { for (let i = 1; i <= n; i++) { step(); Wpn.holdActive(ctx, ID, i); } };
  const st = () => run.wstate[ID];
  return { ctx, run, player, enemy, mk, hits, bullets, fx, step, steps, press, holdFor, st };
}

const L1 = ladderAt(ID, 1);
const L10_HOLD = () => ladderAt(ID, 10).holdFrames;

/**
 * THE MOVES' TIMING, AS THE ART SAYS IT — the hammer's sheets, through
 * src/data/frame-data.json. Each jab carries the ladder's windows and words
 * plus the step its frame data hits on and the step it lets go.
 */
const HELD = 'weapon:quake_hammer:held';
const held = (name) => clipOf(HELD, name);
const JAB = L1.jab.map((j, i) => {
  const c = held(['jabTwo', 'jabThree'][i]);
  return { ...j, hit: c.hits[0].step, total: c.total };
});
const SWING = (() => {
  const c = held('swing'), sw = L1.swing;
  return {
    hit: c.hits[0].step, hitFull: c.hits[0].step - sw.fullSooner,
    total: c.total - sw.weakShorter, totalFull: c.total - sw.fullSooner,
  };
})();
/** Spikes may each be timed differently: the first to stop growing, the last to fall. */
const SP = (() => {
  const cs = ['flat', 'low', 'high', 'steep'].map((n) => clipOf('weapon:quake_hammer:spike', n));
  return {
    grow: Math.max(...cs.map(growStepsOf)),
    endMin: Math.min(...cs.map((c) => c.total)),
    endMax: Math.max(...cs.map((c) => c.total)),
  };
})();
/** His hand, facing right, for a player whose box starts at `p`. */
const gripAt = (p) => ({ x: p.x + 17, y: p.y + 12 });
const isCloud = (d) => d.sheet === 'dust';
const isPuff = (d) => d.sheet === 'puff';
const base = (lv) => damageAtLevel(weaponOf(ID), lv);
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ── Every press is a charge; a weak swing chains into the jabs ──────

test('every press charges from its first step, so a tap is a swing with no charge', () => {
  const r = rig();
  r.step();
  Wpn.holdActive(r.ctx, ID, 1);
  assert.equal(r.st().charging, true, 'charging on the first step, with no minimum');
  r.step();
  Wpn.fireActive(r.ctx, ID, 1);
  const released = r.run.frame;
  assert.equal(r.st().act.move, 'swing');
  r.steps(80);
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].at - released, SWING.hit);
  // Pressed and released between two steps: the game reports 0 steps held.
  const r2 = rig();
  r2.step();
  Wpn.fireActive(r2.ctx, ID, 0);
  assert.equal(r2.st().act.move, 'swing', 'still a swing');
});

test('after a swing charged under half, a press during it is jab 2, and the finisher follows', () => {
  const r = rig();
  const [j2, j3] = JAB;
  r.press(1);                                // a swing with no charge
  const R = r.run.frame;
  r.press(1);                                // during it: kept until the swing lets go
  r.steps(SWING.total - 2);
  assert.equal(r.st().act.move, 'jab2', 'jab 2 starts the moment the swing lets go');
  r.press(1);                                // early in jab 2: kept until its window opens
  r.steps(80);
  assert.equal(r.hits.length, 3);
  assert.equal(r.hits[0].at - R, SWING.hit);
  assert.equal(r.hits[1].at - R, SWING.total + j2.hit);
  assert.equal(r.hits[2].at - R, SWING.total + j2.open + j3.hit, 'the finisher starts as jab 2 opens its window');
  assert.ok(near(r.hits[1].dmg, base(1) * DAMAGE_WORDS[j2.dmg]), 'a jab is its word');
  assert.ok(r.hits[2].dmg > r.hits[1].dmg, 'the finisher hits harder');
  assert.ok(r.hits[2].opts.launch > 0 && !r.hits[1].opts.launch, 'and it is the one that launches');
});

test('a press up to the grace after a weak swing is still jab 2; one later is not', () => {
  const { grace } = L1;
  for (const late of [0, grace, grace + 1]) {
    const r = rig();
    r.press(1);
    r.steps(SWING.total - 1 + late);         // the next step is `late` steps after it let go
    r.step();
    Wpn.holdActive(r.ctx, ID, 1);
    if (late <= grace) assert.equal(r.st().act?.move, 'jab2', `${late} steps after`);
    else assert.equal(r.st().act, null, `${late} steps after: no jab`);
  }
});

test('a swing charged half or more is never followed by a jab', () => {
  const half = Math.ceil(L1.holdFrames * L1.afterSwing.below);
  const r = rig();
  r.press(half);
  assert.ok(r.st().act.c >= L1.afterSwing.below);
  assert.equal(r.press(1), false, 'a press during it, let go while it is busy, does nothing');
  r.steps(80);
  assert.equal(r.st().act, null, 'no jab came out of it');
  assert.equal(r.hits.length, 1);
  r.steps(L1.cool.small);
  r.step();
  Wpn.holdActive(r.ctx, ID, 1);
  assert.equal(r.st().charging, true, 'a press once it has rested is a fresh charge');
});

test('the chain ends at the finisher: a press during it does not jab again', () => {
  const r = rig();
  r.press(1); r.press(1);
  r.steps(SWING.total - 2);
  r.press(1);
  r.steps(JAB[0].open);
  assert.equal(r.st().act.move, 'jab3');
  assert.equal(r.press(1), false, 'a press during the finisher, let go while it is busy, does nothing');
  r.steps(80);
  assert.equal(r.hits.length, 3);
  assert.equal(r.st().act, null);
});

test('a press up to the grace after jab 2 ends is the finisher; one later is not', () => {
  const { grace } = L1;
  for (const late of [1, grace, grace + 1]) {
    const r = rig();
    r.press(1); r.press(1);
    r.steps(SWING.total - 2);
    assert.equal(r.st().act.move, 'jab2');
    while (r.st().act) r.step();             // jab 2 lets go on this step
    r.steps(late - 1);
    r.step();
    Wpn.holdActive(r.ctx, ID, 1);
    if (late <= grace) assert.equal(r.st().act?.move, 'jab3', `${late} steps after`);
    else assert.equal(r.st().act, null, `${late} steps after: no finisher`);
  }
});

test('the hammer stays in his hand, on the frame it let go on, until the combo window closes', () => {
  const r = rig();
  const drawn = () => {
    let cell = null;
    const layer = { drawCell: (s) => { if (s.id === HELD) cell = s.cell; } };
    Wpn.drawWeaponArt({ held: layer, heldBack: layer, effects: { drawCell() {} } }, (x) => x, (y) => y, r.ctx);
    return cell;
  };
  const rest = cellAt(held('rest'), 0);
  for (const chain of ['after a weak swing', 'after jab 2']) {
    r.press(1);
    if (chain === 'after jab 2') { r.press(1); r.steps(SWING.total - 2); }
    while (r.st().act) r.step();
    const last = drawn();
    assert.notEqual(last, rest, `${chain}: not put away the moment it lets go`);
    r.steps(L1.grace);
    assert.equal(drawn(), last, `${chain}: held there through the window`);
    r.step();
    assert.equal(drawn(), rest, `${chain}: put away once the window closes`);
    r.steps(L1.cool.big);
  }
});

test('a cooldown follows every move, long after the finisher or a full charge, short after the rest', () => {
  const finisher = (r) => { r.press(1); r.press(1); r.steps(SWING.total - 2); r.press(1); };
  const cases = [
    ['a full charge', (r) => r.press(L1.holdFrames), L1.cool.big],
    ['the finisher', finisher, L1.cool.big],
    ['a weak swing', (r) => r.press(1), L1.cool.small],
    ['a half charge', (r) => r.press(Math.ceil(L1.holdFrames * L1.afterSwing.below)), L1.cool.small],
    ['jab 2', (r) => { r.press(1); r.press(1); r.steps(SWING.total - 2); }, L1.cool.small],
  ];
  assert.ok(L1.cool.small > L1.grace, 'the combo window closes before the cooldown ends');
  for (const [name, move, cool] of cases) {
    for (const late of [cool - 1, cool]) {
      const r = rig();
      move(r);
      while (r.st().act) r.step();           // the move lets go on this step
      r.steps(late - 1);
      r.step();
      Wpn.holdActive(r.ctx, ID, 1);
      assert.equal(r.st().charging, late >= cool, `${name}: a press ${late} steps after it lets go`);
    }
  }
});

test('from Lv3 the finisher always throws up the medium cloud where the hammer meets the floor', () => {
  for (const lv of [1, 3]) {
    const r = rig({ level: lv });
    r.press(1); r.press(1); r.steps(SWING.total - 2); r.press(1);
    while (!(r.st().act?.move === 'jab3' && r.st().act.done)) r.step();
    const medium = r.fx.dust.filter((d) => isCloud(d) && d.clip === 'medium');
    if (lv < 3) { assert.equal(medium.length, 0, 'Lv1: no dust'); continue; }
    assert.equal(medium.length, 1, 'Lv3: one medium cloud');
    assert.equal(medium[0].y, FLOOR, 'on the floor');
    assert.ok(medium[0].x > r.player.x + 12, 'in front of him');
  }
});

/**
 * THE LADDER AND THE ART HAVE TO AGREE. The chain's windows are the ladder's
 * (input rules, not animation), the moves' timing is the art's — so a redrawn
 * jab must still hit before its window opens and last until it closes, or the
 * chain would carry on from a jab that is already over.
 */
test('each jab still fits its chain window, and the swing its charge rules', () => {
  JAB.forEach((j, i) => {
    if (j.open === undefined) return;
    assert.ok(j.hit < j.open, `jab ${i + 1} hits on ${j.hit}, after the next move may start (${j.open})`);
    assert.ok(j.open < j.total, `jab ${i + 1} lets go on ${j.total}, before the next move may start (${j.open})`);
  });
  const c = held('swing');
  assert.ok(L1.swing.fullSooner < c.hits[0].step, 'a full charge cannot start past the swing\'s hit');
  assert.ok(c.hits[0].step < c.total - L1.swing.weakShorter, 'a weak swing must not let go before it lands');
});

/**
 * THE ONE RULE A REDRAWN HIT AREA HAS TO KEEP. The art may move any hit area
 * (the owner's call: a handoff's changes go in when the checks pass), but
 * every blow has to connect with the smallest thing that walks up to him — a
 * minion standing against his front, on either side. A hit area drawn
 * entirely over its head is a hammer that whiffs on the weather.
 */
test('every jab and the swing reach a minion standing right against him, either way he faces', () => {
  const p = { x: 100, y: FLOOR - 24 };
  for (const facing of [1, -1]) {
    const g = { x: p.x + 12 + facing * 5, y: p.y + 12 };
    // His collision box is the middle 12 of his 24; the minion touches it.
    const minion = { x: facing > 0 ? p.x + 18 : p.x - 6, y: FLOOR - 12, w: 12, h: 12 };
    for (const name of ['jabTwo', 'jabThree', 'swing']) {
      const b = areaAt(held(name).hits[0], g.x, g.y, facing);
      const meets = b.x < minion.x + minion.w && b.x + b.w > minion.x
        && b.y < minion.y + minion.h && b.y + b.h > minion.y;
      assert.ok(meets, `${name} facing ${facing > 0 ? 'right' : 'left'}: its hit area `
        + `(${b.x - g.x}, ${b.y - g.y}, ${b.w}x${b.h} from his hand) misses a minion against his front`);
    }
  }
});

// ── Charge and swing ────────────────────────────────────────────────

test('a hold charges, and the swing lands after release', () => {
  const r = rig();
  r.holdFor(30);
  assert.equal(r.st().charging, true);
  assert.equal(r.hits.length, 0, 'nothing swings while charging');
  r.step();
  Wpn.fireActive(r.ctx, ID, 30);
  const released = r.run.frame;
  assert.equal(r.st().act.move, 'swing');
  r.steps(80);
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].at - released, SWING.hit);
});

test('a full charge lands sooner and is the heaviest blow; damage follows the words', () => {
  const r = rig();
  r.holdFor(L1.holdFrames);
  assert.equal(r.st().full, true);
  r.step();
  Wpn.fireActive(r.ctx, ID, L1.holdFrames);
  const released = r.run.frame;
  r.steps(80);
  assert.equal(r.hits[0].at - released, SWING.hitFull);
  assert.ok(near(r.hits[0].dmg, base(1) * DAMAGE_WORDS[L1.swingDmgFull]), 'full charge is the heavy word');

  const half = rig();
  half.press(Math.round(L1.holdFrames / 2));
  half.steps(80);
  const none = rig();
  none.press(1); none.steps(80);
  assert.ok(none.hits[0].dmg >= base(1) * DAMAGE_WORDS[L1.swingDmg] - 1e-9, 'no charge is the swing\'s own word');
  assert.ok(r.hits[0].dmg > half.hits[0].dmg && half.hits[0].dmg > none.hits[0].dmg,
    'full > half charge > none');
  assert.ok(DAMAGE_WORDS.heavy > DAMAGE_WORDS.medium && DAMAGE_WORDS.medium > DAMAGE_WORDS.lowMedium);
});

test('the charge is held as long as the player likes', () => {
  const r = rig();
  r.holdFor(L1.holdFrames * 4);
  assert.equal(r.st().charging, true);
  assert.equal(r.hits.length, 0);
});

test('letting go any way but a release drops the charge', () => {
  const r = rig();
  r.holdFor(L1.holdFrames);
  r.steps(2);                                // no hold arrives: a beam, a pause, a weapon swap
  assert.equal(r.st().charging, false);
  assert.equal(Wpn.fireActive(r.ctx, ID, 500), false, 'a late release swings nothing');
});

test('a press made during a strong swing charges only once the hammer is free and rested', () => {
  const r = rig();
  r.press(L1.holdFrames);                    // a full charge: nothing chains after it
  r.holdFor(SWING.totalFull + L1.cool.big + 5);   // held from inside the swing
  assert.equal(r.st().charging, true);
  assert.ok(r.st().chargeF <= 6, 'the charge began only once the hammer was free and rested');
});

test('a press that became a jab never charges, however long it is held', () => {
  const r = rig();
  r.press(1);
  r.holdFor(SWING.total + JAB[0].total + 30);   // pressed during the weak swing and never let go
  assert.equal(r.hits.length, 2, 'the swing and jab 2');
  assert.equal(r.st().charging, false);
});

// ── Movement, rung by rung ──────────────────────────────────────────

test('what each rung lets the player do while hammering', () => {
  const at = (lv) => ladderAt(ID, lv);
  // Lv1: "player can not walk while charging or swinging (neither charge nor jab)".
  assert.equal(at(1).jabMove, 0);
  assert.equal(at(1).chargeMove, 0);
  // Lv3: "player can jab while moving but movement is scaled down to walking speeds".
  assert.ok(at(3).jabMove > 0 && at(3).jabMove < 1);
  // Lv6: "regular speed movement while jabbing ... still reduced movement while charging".
  assert.equal(at(6).jabMove, 1);
  assert.ok(at(6).chargeMove > 0 && at(6).chargeMove < 1);
  for (const lv of [1, 3, 6, 10]) assert.equal(at(lv).swingMove, 0, `Lv${lv}: the big swing roots`);
});

test('the runtime asserts that movement every step, and lets go after', () => {
  for (const lv of [1, 3, 6]) {
    const L = ladderAt(ID, lv);
    const r = rig({ level: lv });
    r.holdFor(3);
    assert.equal(r.run.moveScale, L.chargeMove, `Lv${lv} charging`);
    r.step();
    Wpn.fireActive(r.ctx, ID, 3);
    assert.equal(r.run.moveScale, L.swingMove, `Lv${lv} swinging`);
    r.press(1);                              // jab 2, once the weak swing lets go
    r.steps(SWING.total);
    assert.equal(r.st().act.move, 'jab2');
    assert.equal(r.run.moveScale, L.jabMove, `Lv${lv} jabbing`);
    r.steps(JAB[0].total);
    assert.equal(r.run.moveScale, 1, `Lv${lv} free again`);
  }
});

test('the swing plants the player: no walking, turning or jumping until it is over', () => {
  const j = rig();
  j.press(1); j.press(1);
  j.steps(SWING.total);
  assert.equal(j.st().act.move, 'jab2');
  assert.ok(!j.run.planted, 'a jab only roots');
  const r = rig();
  r.holdFor(30);
  assert.ok(!r.run.planted, 'a charge only roots');
  r.player.jumpBuffer = 5;                   // a jump pressed just before letting go
  r.step();
  Wpn.fireActive(r.ctx, ID, 30);
  assert.equal(r.run.planted, true);
  assert.equal(r.run.moveScale, 0);
  assert.equal(r.player.jumpBuffer, 0, 'the early jump is thrown away, not saved for mid-swing');
  r.steps(SWING.total - 2);
  assert.equal(r.run.planted, true, 'all the way through the swing');
  r.steps(SWING.totalFull);
  assert.equal(r.run.planted, false, 'and free again after');
});

// ── The air dive ────────────────────────────────────────────────────

test('a charge let go in the air dives, and the swing lands where the player does', () => {
  const L = ladderAt(ID, 3);
  const r = rig({ level: 3, onGround: false });
  r.enemy.x = 500;
  r.holdFor(30);
  r.step();
  Wpn.fireActive(r.ctx, ID, 30);
  assert.ok(r.st().diving, 'diving');
  assert.equal(r.st().act, null, 'no swing in mid-air');
  const vys = [];
  for (let i = 0; i < 4; i++) { r.step(); vys.push(r.player.vy); }
  assert.ok(vys[3] > vys[0], 'driven down, faster each step');
  assert.equal(r.run.planted, true, 'no control on the way down');
  assert.equal(r.fx.dust.length, 0, 'nothing lands before he does');
  r.player.onGround = true;
  r.step();
  assert.equal(r.st().diving, null);
  assert.equal(r.st().act.move, 'swing', 'the swing plays out from its hit');
  const cloud = r.fx.dust.find(isCloud);
  assert.ok(cloud, 'it lands with a cloud');
  assert.equal(cloud.y, r.player.y + 24, 'on the ground');
  assert.ok(L.airDive);
});

test('a full charge dropped from a jump still makes its spikes', () => {
  const r = rig({ level: 10, onGround: false });
  r.enemy.x = 500;
  r.holdFor(L10_HOLD());
  r.step();
  Wpn.fireActive(r.ctx, ID, L10_HOLD());
  r.steps(3);
  r.player.onGround = true;
  r.step();
  assert.equal(r.fx.spikes.length, ladderAt(ID, 10).spikes.angles.length);
});

test('a dive that ends in a pit lands nothing', () => {
  const r = rig({ level: 3, onGround: false });
  r.holdFor(30);
  r.step();
  Wpn.fireActive(r.ctx, ID, 30);
  r.steps(2);
  r.player.beam = true;                      // fell in: the game lifts him out
  r.step();
  assert.equal(r.st().diving, null, 'the dive is over');
  r.player.beam = false;
  r.player.onGround = true;
  r.steps(20);
  assert.equal(r.fx.dust.length, 0, 'no swing where he was set down');
  assert.equal(r.run.planted, false);
});

// ── Lv3: the dust cloud and the full-charge tell ────────────────────

const swingAndLook = (lv, heldSteps, opts = {}) => {
  const r = rig({ level: lv, ...opts });
  r.enemy.x = 500;
  r.press(heldSteps);
  r.steps(20);
  return r;
};

test('below Lv3 a swing makes no dust cloud and a full charge shows nothing', () => {
  const r = rig({ level: 2 });
  r.holdFor(ladderAt(ID, 2).holdFrames + 30);
  assert.equal(r.fx.dust.length, 0, 'no tell');
  r.step();
  Wpn.fireActive(r.ctx, ID, 999);
  r.steps(20);
  assert.equal(r.fx.dust.length, 0, 'no cloud');
});

test('from Lv3 a full charge puffs dust round the hammer head, and not before', () => {
  const L = ladderAt(ID, 3);
  const r = rig({ level: 3 });
  r.holdFor(L.holdFrames - 5);
  assert.equal(r.fx.dust.length, 0);
  r.holdFor(20);
  assert.ok(r.fx.dust.filter(isPuff).length >= 4, 'an obvious burst');
});

test('from Lv3 the cloud is small, medium or large by how long it was held', () => {
  const L = ladderAt(ID, 3);
  const span = L.holdFrames;
  const size = (n) => swingAndLook(3, n).fx.dust.find(isCloud).clip;
  const small = size(Math.round(span * 0.25));
  const medium = size(Math.round(span * 0.75));
  const large = size(L.holdFrames);
  assert.deepEqual([small, medium, large], ['small', 'medium', 'large']);
  // Each lasts as long as its own clip.
  for (const c of [small, medium, large]) {
    const d = swingAndLook(3, c === 'small' ? 5 : c === 'medium'
      ? Math.round(span * 0.75) : L.holdFrames).fx.dust.find(isCloud);
    assert.equal(d.life, clipOf('weapon:quake_hammer:dust', c).total);
  }
});

test('the cloud hurts what is caught in it, but not the enemy the hammer hit', () => {
  const L = ladderAt(ID, 3);
  const r = rig({ level: 3 });
  // Somewhere the full charge's cloud reaches and the hammer's own hit area
  // does not, worked out from the art's own areas.
  const g = gripAt(r.player), sh = held('swing').hits[0];
  const swingBox = areaAt(sh, g.x, g.y, 1);
  const sp = held('swing').spawns[0];
  const land = pointAt(sp, g.x, g.y, 1);
  const cloudBox = areaAt(clipOf('weapon:quake_hammer:dust', 'large').hits[0], land.x, FLOOR, 1);
  const x = swingBox.x + swingBox.w;
  assert.ok(x < cloudBox.x + cloudBox.w, 'the full cloud reaches past the hammer');
  const other = r.mk(x, FLOOR - 12);
  r.ctx.enemies.push(other);
  r.press(L.holdFrames);
  r.steps(20);
  const onMain = r.hits.filter((h) => h.e === r.enemy);
  const onOther = r.hits.filter((h) => h.e === other);
  assert.equal(onMain.length, 1, 'the hammer once, no cloud on top');
  assert.equal(onOther.length, 1, 'the cloud once');
  assert.ok(near(onOther[0].dmg, base(3) * DAMAGE_WORDS[L.cloud.dmg]));
});

test('with no ground under the hammer, the cloud forms on the enemy it hit', () => {
  const r = rig({ level: 3, over: false });  // standing at the lip of a pit
  r.press(30);
  r.steps(20);
  const cloud = r.fx.dust.find(isCloud);
  assert.ok(cloud, 'a cloud');
  assert.ok(Math.abs(cloud.x - (r.enemy.x + 6)) < 1 && Math.abs(cloud.y - (r.enemy.y + 12)) < 1,
    'billowing up from under the enemy, not over the pit');
});

test('nothing the hammer does stuns', () => {
  const r = rig({ level: 10 });
  const other = r.mk(150, FLOOR - 12);
  r.ctx.enemies.push(other);
  r.press(1); r.press(1); r.steps(SWING.total); r.press(1); r.steps(70);
  r.press(ladderAt(ID, 10).holdFrames);
  r.steps(60);
  for (const e of r.ctx.enemies) assert.deepEqual(e.status, {}, 'no status at all');
});

// ── Lv10: the spikes ────────────────────────────────────────────────

const L10 = ladderAt(ID, 10);
const spikeRig = (opts = {}) => {
  const r = rig({ level: 10, ...opts });
  r.enemy.x = 500;
  r.press(L10.holdFrames);
  r.steps(SWING.hitFull);
  return r;
};
/** Where the swing meets the floor: the spikes' foot, for a player at `p`. */
const footAt = (p) => pointAt(held('swing').spawns[0], gripAt(p).x, gripAt(p).y, 1);

test('spikes come only at Lv10, only from a full charge, only where it met the ground', () => {
  const count = (lv, held, over = true) => swingAndLook(lv, held, { over }).fx.spikes.length;
  assert.equal(count(6, ladderAt(ID, 6).holdFrames), 0, 'not before Lv10');
  assert.equal(count(10, L10.holdFrames - 5), 0, 'not short of full');
  assert.equal(count(10, L10.holdFrames, false), 0, 'not over a pit');
  assert.equal(spikeRig().fx.spikes.length, L10.spikes.angles.length);
  assert.ok(spikeRig().fx.spikes.every((s) => s.dir === 1 && s.deg > 0 && s.deg < 90),
    'diagonally forward');
});

test('a spike hurts only while it grows, once per enemy', () => {
  const r = rig({ level: 10 });
  const S = L10.spikes;
  // In the path of the lowest spike, a little way out from where it starts.
  r.enemy.x = footAt(r.player).x + 19;
  r.enemy.y = FLOOR - 16;
  r.press(L10.holdFrames);
  r.steps(SWING.hitFull + SP.grow + 2);
  const spiked = r.hits.filter((h) => h.opts.launch === S.launch);
  assert.equal(spiked.length, 1, 'struck once while growing');
  // Walk a fresh enemy into a standing spike: it is blocked, never hurt.
  const late = r.mk(r.player.x + 70, FLOOR - 12, { def: { kind: 'ground' }, vx: -0.5 });
  r.ctx.enemies.push(late);
  const before = r.hits.length;
  for (let i = 0; i < SP.endMin - SP.grow - 4; i++) { r.step(); late.x += late.vx; }
  assert.equal(r.hits.length, before, 'a standing spike deals no damage');
});

test('standing spikes stop enemy shots, but not the player\'s', () => {
  const r = spikeRig();
  r.steps(SP.grow + 1);
  const s = r.fx.spikes[0];
  const rad = (s.deg * Math.PI) / 180;
  const onSpike = { x: s.x + Math.cos(rad) * 20, y: s.y - Math.sin(rad) * 20 };
  const theirs = { ...onSpike, vx: -1, vy: 0, radius: 3, enemy: true, life: 100 };
  const mine = { ...onSpike, vx: 1, vy: 0, radius: 3, enemy: false, life: 100 };
  r.bullets.push(theirs, mine);
  r.step();
  assert.equal(theirs.life, -1, 'an enemy shot is stopped');
  assert.equal(mine.life, 100, 'the player\'s own shot is not');
});

test('a standing spike turns a walking minion round', () => {
  const r = spikeRig();
  r.steps(SP.grow + 1);
  // A few pixels in front of where the lowest spike crosses its head height.
  const low = r.fx.spikes.reduce((a, s) => (s.deg < a.deg ? s : a));
  const top = FLOOR - 12;
  const crossAt = low.x + (low.y - top) / Math.tan((low.deg * Math.PI) / 180);
  const walker = r.mk(crossAt + 4, top, { def: { kind: 'ground' }, vx: -0.6 });
  r.ctx.enemies.push(walker);
  let furthest = Infinity;
  for (let i = 0; i < SP.endMin - SP.grow - 4; i++) {
    r.step();
    walker.x += walker.vx;                   // the minion's own walk, after the weapons
    furthest = Math.min(furthest, walker.x);
  }
  assert.ok(walker.vx > 0, 'it turned round');
  assert.ok(furthest >= crossAt - 1, 'it never got into the spike');
});

test('a boss is hurt by a growing spike, then walks through it and it goes to sand at once', () => {
  const S = L10.spikes;
  const r = spikeRig();                      // the spikes have just started growing
  const low = r.fx.spikes.reduce((a, s) => (s.deg < a.deg ? s : a));
  const boss = r.mk(low.x + 20, FLOOR - 30, { isBoss: true, w: 20, h: 30 });
  r.ctx.enemies.push(boss);
  const bossX = boss.x;
  r.steps(SP.grow + 1);
  assert.equal(r.hits.filter((h) => h.e === boss && h.opts.launch === S.launch).length, 1,
    'hurt once while the spikes grew');
  assert.ok(r.fx.spikes.length < S.angles.length, 'the spikes he touches are gone');
  assert.ok(r.fx.sand.length > 0, 'straight to sand, long before half a second');
  assert.equal(boss.x, bossX, 'a boss is never moved by the player\'s weapons');
});

test('after half a second standing, the spikes fall as sand that vanishes within 3s', () => {
  const r = spikeRig();
  const S = L10.spikes;
  r.steps(SP.endMin - 2);
  assert.equal(r.fx.spikes.length, S.angles.length, 'still standing');
  r.steps(SP.endMax - SP.endMin + 2);
  assert.equal(r.fx.spikes.length, 0, 'crumbled');
  const grains = r.fx.sand.slice();
  assert.ok(grains.length > 20, 'a shower of sand');
  assert.ok(grains.every((g) => g.life >= 1 && g.life <= S.sandMax), 'each with its own timer');
  const top = Math.min(...grains.map((g) => g.y));
  r.steps(30);
  assert.ok(r.fx.sand.every((g) => g.y <= g.gy), 'it never sinks through the floor');
  assert.ok(Math.min(...r.fx.sand.map((g) => g.y)) > top, 'it falls');
  assert.ok(r.fx.sand.length < grains.length, 'it thins out as it goes');
  r.steps(S.sandMax);
  assert.equal(r.fx.sand.length, 0, 'gone within three seconds');
});

test('the dust and sand outlast the weapon being benched', () => {
  const r = spikeRig();
  Wpn.pruneStates(r.run.wstate, []);         // benched
  assert.ok(r.fx.spikes.length > 0);
  for (let i = 0; i < 400; i++) Wpn.stepFx(r.fx);
  assert.equal(r.fx.sand.length + r.fx.spikes.length + r.fx.dust.length, 0);
});
