/**
 * THE QUAKE HAMMER'S RULES, from the owner's brief of 10 Oct 2026.
 *
 * These pin the SHAPE of the weapon, not its numbers: a tap is quick and
 * chains three times, a hold is a charge, a release makes a dust cloud sized
 * by the charge, and only a FULL charge that meets the GROUND makes spikes
 * (which then turn to sand that falls and fades). tests/weapons.test.js already
 * runs the weapon for thousands of steps; this file checks it does the right
 * thing in the right order.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladderAt } from '../src/data/weapons.js';
import * as Wpn from '../src/systems/weaponry.js';

const ID = 'quake_hammer';
const FLOOR = 184;

function rig({ onGround = true, over = true } = {}) {
  const run = {
    frame: 0, dmgMult: 1, wstate: {}, allies: [], lastDamaged: null,
    meleeArmor: 0, rootFrames: 0, glideFall: null, airControl: 1,
    aggroFire: 1, aggroPause: null, wpLevels: { [ID]: 1 },
  };
  const player = { x: 100, y: FLOOR - 24, vx: 0, vy: 0, facing: 1, onGround };
  const enemy = { x: 124, y: FLOOR - 12, w: 12, h: 12, hp: 999, vy: 0, kbVx: 0, status: {} };
  const hits = [], bullets = [];
  const fx = Wpn.makeFx();
  const ctx = {
    run, player, bullets, allies: run.allies, enemies: [enemy],
    arena: { x0: 0, x1: 400, floorY: FLOOR, patches: [], platforms: [] },
    platforms: [], statusBag: {}, floorY: FLOOR, landVy: 0, equipped: [ID], fx,
    levelOf: () => 1, heal() {},
    spawn: (s) => bullets.push(s),
    hitEnemy: (e, dmg, opts) => { hits.push({ e, dmg, opts, at: run.frame }); e.hp -= dmg; },
    overGround: () => over,
    shake() {}, puff: (s) => Wpn.puff(fx, s), arc() {}, patch() {}, sfx() {},
  };
  const step = () => {
    run.frame++;
    Wpn.stepWeapons(ctx, [ID]);
    Wpn.stepFx(fx);
  };
  const steps = (n) => { for (let i = 0; i < n; i++) step(); };
  /** Hold the button for `n` steps and let go, the way GameScene feeds it. */
  const press = (n) => {
    for (let i = 1; i <= n; i++) { step(); Wpn.holdActive(ctx, ID, i); }
    step();
    return Wpn.fireActive(ctx, ID, n);
  };
  return { ctx, run, player, enemy, hits, bullets, fx, step, steps, press };
}

test('a tap swings quickly: the hit lands on the frame Smash\'s data gives, counted from the PRESS', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  const held = 4;
  r.press(held);
  const releasedAt = r.run.frame;
  while (!r.hits.length && r.run.frame < releasedAt + 60) r.step();
  assert.equal(r.hits.length, 1);
  // press + (held steps) + remaining start-up == jab 1's hit frame
  assert.equal(r.hits[0].at - releasedAt + held, L.jab[0].hit);
});

test('three presses chain into three different swings, and a fourth is ignored', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  r.press(2);
  r.steps(L.jab[0].hit);
  r.press(2);                       // pressed after the first hit: chains
  r.steps(L.jab[1].hit + 2);
  r.press(2);
  r.steps(L.jab[2].hit + 2);
  assert.equal(r.hits.length, 3, 'A-A-A is three hits');
  assert.ok(r.hits[2].dmg > r.hits[0].dmg, 'the third is the finisher');
  assert.equal(Wpn.fireActive(r.ctx, ID, 2), true);
  r.steps(120);
  assert.equal(r.hits.length, 3, 'there is no fourth swing');
});

test('a hold is a charge: no tap swing comes out of it', () => {
  const r = rig();
  r.enemy.x = 500;
  r.press(30);
  const L = ladderAt(ID, 1);
  assert.equal(r.run.wstate[ID].act.kind, 'smash');
  assert.equal(r.hits.length, 0, 'nothing is hit before the swing lands');
  r.steps(L.smashHit + 1);
  assert.equal(r.fx.dust.length >= 1, true, 'a dust cloud');
});

test('the dust cloud is small, medium or large by how long it was held', () => {
  const L = ladderAt(ID, 1);
  const radiusAfter = (heldSteps) => {
    const r = rig();
    r.enemy.x = 500;
    r.press(heldSteps);
    r.steps(L.smashHit + 1);
    return r.fx.dust.find((d) => !d.mote).r;
  };
  const small = radiusAfter(L.tapFrames + 5);
  const medium = radiusAfter(L.tapFrames + Math.round((L.holdFrames - L.tapFrames) * 0.5));
  const large = radiusAfter(L.holdFrames);
  assert.ok(small < medium && medium < large, `${small} < ${medium} < ${large}`);
});

test('a cloud forms on an ENEMY hit too, even in the air', () => {
  const r = rig({ onGround: false });
  r.player.vy = 0;
  r.enemy.y = r.player.y + 4;
  r.press(30);
  // In the air the release is a dive; land and it resolves.
  r.player.onGround = false;
  r.steps(3);
  r.player.onGround = true;
  r.steps(4);
  assert.ok(r.fx.dust.some((d) => !d.mote), 'the landing makes a cloud');
});

test('only a FULL charge on the GROUND makes spikes', () => {
  const L = ladderAt(ID, 1);
  const spikesAfter = (heldSteps, opts) => {
    const r = rig(opts);
    r.enemy.x = 500;
    r.press(heldSteps);
    r.steps(L.smashHit + 1);
    return r.fx.spikes.length;
  };
  assert.equal(spikesAfter(L.holdFrames - 10, {}), 0, 'nearly full is not full');
  assert.equal(spikesAfter(L.holdFrames, {}), L.spikeAngles.length);
  assert.equal(spikesAfter(L.holdFrames, { over: false }), 0, 'a swing over a pit hits no ground');
});

test('a full charge cues itself with dust on the hammer head before it is released', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  for (let i = 1; i <= L.holdFrames + 20; i++) { r.step(); Wpn.holdActive(r.ctx, ID, i); }
  assert.ok(r.fx.dust.some((d) => d.mote), 'tiny dust clouds');
  const r2 = rig();
  for (let i = 1; i <= L.holdFrames - 20; i++) { r2.step(); Wpn.holdActive(r2.ctx, ID, i); }
  assert.ok(!r2.fx.dust.some((d) => d.mote), 'none before it is full');
});

test('spikes stab forward, stay half a second, then become sand that falls and fades', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  r.enemy.x = 500;
  r.press(L.holdFrames);
  r.steps(L.smashHit + 1);
  const spikes = r.fx.spikes.slice();
  assert.ok(spikes.every((s) => s.dir === 1 && s.deg > 0 && s.deg < 90), 'diagonally forward');
  assert.equal(L.spikeStab + L.spikeStay, 35);
  assert.ok(L.spikeStay === 30, 'half a second of standing at 60 steps a second');
  r.steps(L.spikeStab + L.spikeStay);
  assert.equal(r.fx.spikes.length, 0, 'the spikes are gone');
  assert.ok(r.fx.sand.length > 20, 'and sand is left');
  const startY = Math.min(...r.fx.sand.map((g) => g.y));
  r.steps(60);
  assert.ok(r.fx.sand.every((g) => g.y <= g.gy), 'sand never sinks through the floor');
  assert.ok(Math.max(...r.fx.sand.map((g) => g.y)) > startY, 'it was pulled down');
  r.steps(L.sandFrames - 60 - 10);
  assert.ok(r.fx.sand.length > 0 && r.fx.sand.every((g) => g.life > g.fade || g.life > 0));
  r.steps(L.sandFade + 30);
  assert.equal(r.fx.sand.length, 0, 'three seconds, then it fades away');
});

test('a spike hurts an enemy in its path once, and not one behind the player', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  r.enemy.x = r.player.x + 12 + L.reach + 14;       // just in front of the contact point
  r.enemy.y = FLOOR - 24;
  r.press(L.holdFrames);
  r.steps(L.smashHit + L.spikeStab + 2);
  const spiked = r.hits.filter((h) => h.opts.launch);
  assert.equal(spiked.length, 1, 'struck once');
  const behind = rig();
  behind.enemy.x = behind.player.x - 60;
  behind.press(L.holdFrames);
  behind.steps(L.smashHit + L.spikeStab + 2);
  assert.equal(behind.hits.filter((h) => h.opts.launch).length, 0);
});

test('letting go any way but a release drops the charge', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  for (let i = 1; i <= L.holdFrames; i++) { r.step(); Wpn.holdActive(r.ctx, ID, i); }
  assert.equal(r.run.wstate[ID].full, true);
  r.steps(2);                                    // no hold arrives: a beam, a pause, a weapon swap
  assert.equal(r.run.wstate[ID].charging, false);
  assert.equal(Wpn.fireActive(r.ctx, ID, 200), false, 'a late release swings nothing');
});

test('the dust and sand outlast the weapon being benched', () => {
  const r = rig();
  const L = ladderAt(ID, 1);
  r.press(L.holdFrames);
  r.steps(L.smashHit + 1);
  Wpn.pruneStates(r.run.wstate, []);              // benched
  assert.ok(r.fx.spikes.length > 0);
  for (let i = 0; i < 400; i++) Wpn.stepFx(r.fx);
  assert.equal(r.fx.sand.length + r.fx.spikes.length + r.fx.dust.length, 0);
});
