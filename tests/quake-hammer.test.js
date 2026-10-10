/**
 * THE QUAKE HAMMER'S RULES, from the owner's messages of 10 Oct 2026.
 *
 * These pin the SHAPE of the weapon, not its numbers: a tap is a jab timed
 * from the press, three of them chain inside Smash's windows, a hold is a
 * charge, the swing lands after release, what each rung lets the player do
 * while swinging, the Lv3 dust cloud, the Lv10 spikes that hurt only while
 * growing and then block, and the sand they turn into. Frame counts and damage
 * are read OUT of the ladder rather than written here, because they are the
 * owner's to tune — what this checks is that the hammer obeys whatever they
 * say. tests/weapons.test.js already runs the weapon for thousands of steps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ladderAt, damageAtLevel, weaponOf, DAMAGE_WORDS,
} from '../src/data/weapons.js';
import * as Wpn from '../src/systems/weaponry.js';

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
const base = (lv) => damageAtLevel(weaponOf(ID), lv);
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ── Jabs ─────────────────────────────────────────────────────────────

test('a tap is jab 1, landing on its hit frame counted from the PRESS', () => {
  for (const held of [1, 4, L1.tapFrames]) {
    const r = rig();
    const pressedAt = r.run.frame + 1;
    r.press(held);
    r.steps(30);
    assert.equal(r.hits.length, 1, `held ${held}`);
    assert.equal(r.hits[0].at - pressedAt, L1.jab[0].hit, `held ${held}: the wait to know it was a tap is not added`);
  }
  // Pressed and released between two steps: the game reports 0 steps held.
  const r = rig();
  r.step();
  const at = r.run.frame;
  Wpn.fireActive(r.ctx, ID, 0);
  r.steps(30);
  assert.equal(r.hits[0].at - at, L1.jab[0].hit);
});

test('three taps chain jab, jab, finisher inside the windows', () => {
  const r = rig();
  const [j1, j2, j3] = L1.jab;
  const P = r.run.frame + 1;
  r.press(2);                       // jab 1
  r.press(2);                       // pressed early: kept until jab 1's window opens
  r.steps(j1.open - 6 + 3);         // jab 2 is now under way
  assert.equal(r.st().act.move, 'jab2');
  r.press(2);                       // during jab 2: kept until its window opens
  r.steps(60);
  assert.equal(r.hits.length, 3);
  assert.equal(r.hits[0].at - P, j1.hit);
  assert.equal(r.hits[1].at - P, j1.open + j2.hit, 'jab 2 starts as jab 1 opens its window');
  assert.equal(r.hits[2].at - P, j1.open + j2.open + j3.hit, 'jab 3 starts as jab 2 opens its window');
  assert.ok(r.hits[2].dmg > r.hits[0].dmg, 'the finisher hits harder');
  assert.ok(r.hits[2].opts.launch > 0 && !r.hits[0].opts.launch, 'and it is the one that launches');
});

test('there is no rapid jab and no fourth jab', () => {
  const r = rig();
  for (let i = 0; i < 12; i++) r.press(2);   // mashing
  r.steps(120);
  const moves = r.hits.length;
  assert.ok(moves <= 4, `mashing makes the chain (${moves} hits), not a rapid jab`);
  // Whatever the mash did, the chain itself never goes past jab 3.
  const r2 = rig();
  r2.press(2); r2.press(2); r2.steps(15); r2.press(2);
  assert.equal(r2.st().act.move, 'jab2');
  r2.steps(L1.jab[1].open);
  assert.equal(r2.st().act.move, 'jab3');
  r2.press(2);                               // early in the finisher: too early to buffer
  r2.steps(80);
  assert.equal(r2.hits.length, 3);
  assert.equal(r2.st().act, null);
});

test('a press after the window closes starts jab 1 over, not jab 2', () => {
  const r = rig();
  const j1 = L1.jab[0];
  const P = r.run.frame + 1;
  r.press(1);
  r.steps(j1.close - 1);                     // pressed just after the window shuts
  const pressAt = r.run.frame + 1;
  assert.ok(pressAt - P > j1.close);
  r.press(1);
  r.steps(40);
  assert.equal(r.hits.length, 2);
  assert.equal(r.hits[1].at - P, j1.total + j1.hit, 'a fresh jab 1, the moment the hammer is free');
  assert.equal(r.hits[1].opts.knockback, j1.knock, 'jab 1, not jab 2');
});

// ── Charge and swing ────────────────────────────────────────────────

test('a hold charges instead of jabbing, and the swing lands after release', () => {
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
  assert.equal(r.hits[0].at - released, L1.swing.hit);
});

test('a full charge lands sooner and is the heaviest blow; damage follows the words', () => {
  const r = rig();
  r.holdFor(L1.holdFrames);
  assert.equal(r.st().full, true);
  r.step();
  Wpn.fireActive(r.ctx, ID, L1.holdFrames);
  const released = r.run.frame;
  r.steps(80);
  assert.equal(r.hits[0].at - released, L1.swing.hitFull);
  assert.ok(near(r.hits[0].dmg, base(1) * DAMAGE_WORDS[L1.swingDmgFull]), 'full charge is the heavy word');

  const half = rig();
  half.press(Math.round(L1.holdFrames / 2));
  half.steps(80);
  const jab = rig();
  jab.press(1); jab.steps(30);
  assert.ok(near(jab.hits[0].dmg, base(1) * DAMAGE_WORDS[L1.jab[0].dmg]), 'a jab is its word');
  assert.ok(r.hits[0].dmg > half.hits[0].dmg && half.hits[0].dmg > jab.hits[0].dmg,
    'full > half charge > jab');
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

test('holding through a jab does not count toward the charge', () => {
  const r = rig();
  r.press(1);                                // jab 1 under way
  r.holdFor(L1.jab[0].total + 5);            // held from inside the jab
  assert.equal(r.st().charging, true);
  assert.ok(r.st().chargeF < L1.jab[0].total, 'the charge began only once the hammer was free');
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
    r.press(1);
    assert.equal(r.run.moveScale, L.jabMove, `Lv${lv} jab`);
    r.steps(5);
    assert.equal(r.run.moveScale, L.jabMove, `Lv${lv} still jabbing`);
    r.steps(L.jab[0].total);
    assert.equal(r.run.moveScale, 1, `Lv${lv} free again`);
    r.holdFor(L.tapFrames + 3);
    assert.equal(r.run.moveScale, L.chargeMove, `Lv${lv} charging`);
    r.step();
    Wpn.fireActive(r.ctx, ID, L.tapFrames + 3);
    assert.equal(r.run.moveScale, L.swingMove, `Lv${lv} swinging`);
  }
});

test('the swing plants the player: no walking, turning or jumping until it is over', () => {
  const r = rig();
  r.press(1);
  assert.ok(!r.run.planted, 'a jab only roots');
  r.steps(40);
  r.holdFor(30);
  assert.ok(!r.run.planted, 'a charge only roots');
  r.player.jumpBuffer = 5;                   // a jump pressed just before letting go
  r.step();
  Wpn.fireActive(r.ctx, ID, 30);
  assert.equal(r.run.planted, true);
  assert.equal(r.run.moveScale, 0);
  assert.equal(r.player.jumpBuffer, 0, 'the early jump is thrown away, not saved for mid-swing');
  r.steps(L1.swing.total - 2);
  assert.equal(r.run.planted, true, 'all the way through the swing');
  r.steps(L1.swing.totalFull);
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
  const cloud = r.fx.dust.find((d) => !d.puff);
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
  assert.ok(r.fx.dust.filter((d) => d.puff).length >= 4, 'an obvious burst');
});

test('from Lv3 the cloud is small, medium or large by how long it was held', () => {
  const L = ladderAt(ID, 3);
  const span = L.holdFrames - L.tapFrames;
  const radius = (n) => swingAndLook(3, n).fx.dust.find((d) => !d.puff).r;
  const small = radius(L.tapFrames + Math.round(span * 0.25));
  const medium = radius(L.tapFrames + Math.round(span * 0.75));
  const large = radius(L.holdFrames);
  assert.deepEqual([small, medium, large], L.cloud.radius);
});

test('the cloud hurts what is caught in it, but not the enemy the hammer hit', () => {
  const L = ladderAt(ID, 3);
  const r = rig({ level: 3 });
  const other = r.mk(r.player.x + 12 + L.reach + 8, FLOOR - 12);
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
  const cloud = r.fx.dust.find((d) => !d.puff);
  assert.ok(cloud, 'a cloud');
  assert.ok(Math.abs(cloud.x - (r.enemy.x + 6)) < 4 && Math.abs(cloud.y - (r.enemy.y + 6)) < 4,
    'at the enemy, not over the pit');
});

test('nothing the hammer does stuns', () => {
  const r = rig({ level: 10 });
  const other = r.mk(150, FLOOR - 12);
  r.ctx.enemies.push(other);
  r.press(1); r.press(1); r.steps(15); r.press(1); r.steps(70);
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
  r.steps(L10.swing.hitFull);
  return r;
};

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
  r.enemy.x = r.player.x + 12 + L10.reach + 16;
  r.enemy.y = FLOOR - 16;
  r.press(L10.holdFrames);
  r.steps(L10.swing.hitFull + S.grow + 2);
  const spiked = r.hits.filter((h) => h.opts.launch === S.launch);
  assert.equal(spiked.length, 1, 'struck once while growing');
  // Walk a fresh enemy into a standing spike: it is blocked, never hurt.
  const late = r.mk(r.player.x + 70, FLOOR - 12, { def: { kind: 'ground' }, vx: -0.5 });
  r.ctx.enemies.push(late);
  const before = r.hits.length;
  for (let i = 0; i < S.stand - 4; i++) { r.step(); late.x += late.vx; }
  assert.equal(r.hits.length, before, 'a standing spike deals no damage');
});

test('standing spikes stop enemy shots, but not the player\'s', () => {
  const r = spikeRig();
  r.steps(L10.spikes.grow + 1);
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
  r.steps(L10.spikes.grow + 1);
  // A few pixels in front of where the lowest spike crosses its head height.
  const low = r.fx.spikes.reduce((a, s) => (s.deg < a.deg ? s : a));
  const top = FLOOR - 12;
  const crossAt = low.x + (low.y - top) / Math.tan((low.deg * Math.PI) / 180);
  const walker = r.mk(crossAt + 4, top, { def: { kind: 'ground' }, vx: -0.6 });
  r.ctx.enemies.push(walker);
  let furthest = Infinity;
  for (let i = 0; i < L10.spikes.stand - 4; i++) {
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
  r.steps(S.grow + 1);
  assert.equal(r.hits.filter((h) => h.e === boss && h.opts.launch === S.launch).length, 1,
    'hurt once while the spikes grew');
  assert.ok(r.fx.spikes.length < S.angles.length, 'the spikes he touches are gone');
  assert.ok(r.fx.sand.length > 0, 'straight to sand, long before half a second');
  assert.equal(boss.x, bossX, 'a boss is never moved by the player\'s weapons');
});

test('after half a second standing, the spikes fall as sand that vanishes within 3s', () => {
  const r = spikeRig();
  const S = L10.spikes;
  r.steps(S.grow + S.stand - 2);
  assert.equal(r.fx.spikes.length, S.angles.length, 'still standing');
  r.steps(2);
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
