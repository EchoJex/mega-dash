/**
 * DRAKE BREATH'S RULES, from the owner's messages of 23 Oct 2026. Shapes, not
 * numbers: every length and time is read out of the ladder.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladderAt } from '../src/data/weapons.js';
import * as Wpn from '../src/systems/weaponry.js';

const ID = 'drake_breath', FLOOR = 184;

function rig(level) {
  const run = { frame: 0, dmgMult: 1, wstate: {}, allies: [], moveScale: 1, planted: false, wpLevels: { [ID]: level } };
  const player = { x: 100, y: FLOOR - 24, vx: 0, vy: 0, facing: 1, onGround: true };
  const mk = (x, y) => ({ x, y, w: 12, h: 12, hp: 999, vx: 0, vy: 0, kbVx: 0, status: {} });
  const hits = [];
  const ctx = {
    run, player, enemies: [], allies: run.allies, bullets: [], fx: Wpn.makeFx(), equipped: [ID],
    levelOf: () => level, sfx() {}, shake() {},
    hitEnemy: (e, dmg) => { hits.push({ e, at: run.frame }); e.hp -= dmg; },
  };
  const step = () => { run.frame++; run.moveScale = 1; run.planted = false; Wpn.stepWeapons(ctx, [ID]); };
  const hold = (n) => { for (let i = 1; i <= n; i++) { step(); Wpn.holdActive(ctx, ID, i); } };
  const release = (n) => { step(); Wpn.fireActive(ctx, ID, n); };
  return { ctx, run, player, mk, hits, step, hold, release, st: () => run.wstate[ID] };
}

test('Lv1: rooted from the press, breathes after the wind-up, the breath shrinks and recovers', () => {
  const L = ladderAt(ID, 1), h = rig(1);
  h.hold(1);
  assert.equal(h.run.moveScale, 0, 'cannot move while rearing back');
  h.hold(L.windup - 1);
  assert.ok(!h.st().breathing, 'no breath during the wind-up');
  h.hold(2);
  assert.ok(h.st().breathing);
  const long = Wpn.RUNTIME[ID].breathNow(h.st(), L);
  h.hold(60);
  assert.ok(Wpn.RUNTIME[ID].breathNow(h.st(), L) < long, 'the breath shrinks the longer it is held');
  h.release(80);
  const short = Wpn.RUNTIME[ID].breathNow(h.st(), L);
  for (let i = 0; i < 60; i++) h.step();
  assert.ok(Wpn.RUNTIME[ID].breathNow(h.st(), L) > short, 'and recovers when let go');
  assert.equal(h.run.moveScale, 1, 'free again after release');
});

test('Lv1: the breath hurts what is in front of the mouth', () => {
  const h = rig(1), e = h.mk(130, FLOOR - 20);
  h.ctx.enemies.push(e);
  h.hold(ladderAt(ID, 1).windup + 20);
  assert.ok(h.hits.some((x) => x.e === e));
});

test('Lv3: release throws an arc that reaches overhead but not far ahead', () => {
  const W = ladderAt(ID, 3).wave, h = rig(3);
  const above = h.mk(106, h.player.y + 10 - W.r + 4), far = h.mk(100 + 12 + W.r * 2, FLOOR - 20);
  h.ctx.enemies.push(above, far);
  h.hold(2); h.release(2);
  for (let i = 0; i < W.grow + 10; i++) h.step();
  assert.ok(h.hits.some((x) => x.e === above), 'overhead');
  assert.ok(!h.hits.some((x) => x.e === far), 'limited range');
});

test('Lv6: a charged release sends a blast on past where the wave ends', () => {
  const L = ladderAt(ID, 6), h = rig(6);
  const far = h.mk(100 + 12 + L.wave.r * 3, h.player.y + 4);
  h.ctx.enemies.push(far);
  h.hold(L.blast.charge); h.release(L.blast.charge);
  for (let i = 0; i < L.blast.life; i++) h.step();
  assert.ok(h.hits.some((x) => x.e === far));
});

test('Lv10: a full charge telegraphs, then a long beam hurts for its life and is gone', () => {
  const B = ladderAt(ID, 10).beam, h = rig(10);
  const far = h.mk(100 + 12 + B.len - 30, FLOOR - 14);
  h.ctx.enemies.push(far);
  h.hold(B.charge); h.release(B.charge);
  for (let i = 0; i < B.tele; i++) h.step();
  assert.ok(!h.hits.some((x) => x.e === far), 'the telegraph line does no harm');
  for (let i = 0; i < B.life; i++) h.step();
  assert.ok(h.hits.filter((x) => x.e === far).length > 3, 'the beam reaches nearly a screen and keeps hurting');
  h.step(); h.step();
  assert.ok(!h.st().fx.some((f) => f.kind === 'beam'), 'and dissipates');
});
