/**
 * DRAKE BREATH'S RULES, from the owner's messages of 23 Oct 2026. Shapes, not
 * numbers: every length and time is read out of the ladder.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ladderAt } from '../src/data/weapons.js';
import * as Wpn from '../src/systems/weaponry.js';
import { readFileSync } from 'node:fs';
import { parse } from '../docs/sprite-fmt.js';

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
  const long = Wpn.RUNTIME[ID].breathK(h.st(), L);
  h.hold(60);
  assert.ok(Wpn.RUNTIME[ID].breathK(h.st(), L) < long, 'the breath shrinks the longer it is held');
  h.release(80);
  const short = Wpn.RUNTIME[ID].breathK(h.st(), L);
  for (let i = 0; i < 60; i++) h.step();
  assert.ok(Wpn.RUNTIME[ID].breathK(h.st(), L) > short, 'and recovers when let go');
  assert.equal(h.run.moveScale, 1, 'free again after release');
});

test('Lv1: puffs go diagonally down, then roll along the ground and hurt what they reach', () => {
  const h = rig(1), e = h.mk(150, FLOOR - 12);                   // standing on the floor, ahead
  h.ctx.enemies.push(e);
  h.hold(ladderAt(ID, 1).windup + 6);
  const puff = h.st().fx.find((f) => f.kind === 'puff');
  const y0 = puff.y;
  for (let i = 0; i < 4; i++) h.step();
  assert.ok(puff.y > y0, 'travels downward');
  for (let i = 0; i < 20; i++) h.step();
  assert.ok(puff.y + puff.r <= FLOOR + 0.01, 'never sinks through the floor');
  h.hold(30);
  assert.ok(h.hits.some((x) => x.e === e), 'reaches a grounded enemy ahead');
});

test('Lv3: release sends a wall forward from below his feet to over his head; nothing behind', () => {
  const W = ladderAt(ID, 3).wave, h = rig(3), p = h.player;
  const diag = h.mk(130, p.y - W.above);                          // overhead, a little ahead
  const behind = h.mk(70, FLOOR - 20);
  const far = h.mk(p.x + 24 + W.range + 40, FLOOR - 20);
  h.ctx.enemies.push(diag, behind, far);
  h.hold(2); h.release(2);
  for (let i = 0; i < 60; i++) h.step();
  assert.ok(h.hits.some((x) => x.e === diag), 'diagonally overhead');
  assert.ok(!h.hits.some((x) => x.e === behind), 'no cover behind');
  assert.ok(!h.hits.some((x) => x.e === far), 'limited range');
  assert.ok(!h.st().fx.length, 'and gone');
});

test('Lv6: a charged release sends a blast on past where the wave ends', () => {
  const L = ladderAt(ID, 6), h = rig(6);
  const far = h.mk(100 + 24 + L.wave.range + 40, h.player.y + 4);
  h.ctx.enemies.push(far);
  h.hold(L.blast.charge); h.release(L.blast.charge);
  for (let i = 0; i < L.blast.life; i++) h.step();
  assert.ok(h.hits.some((x) => x.e === far));
});

test("Lv10: telegraph, then a beam the wave's height that hurts, erases enemy shots, and is gone", () => {
  const L = ladderAt(ID, 10), B = L.beam, h = rig(10), p = h.player;
  const far = h.mk(100 + 12 + B.len - 30, FLOOR - 14);
  const over = h.mk(160, p.y - L.wave.above - 14);                // just above the wave's reach
  h.ctx.enemies.push(far, over);
  h.hold(B.charge); h.release(B.charge);
  for (let i = 0; i < B.tele; i++) h.step();
  assert.ok(!h.hits.some((x) => x.e === far), 'the telegraph line does no harm');
  const beam = h.st().fx.find((f) => f.kind === 'beam');
  assert.equal(beam.bot - beam.top, 24 + L.wave.above + L.wave.below, 'beam matches the wave');
  const shot = { enemy: true, x: 200, y: p.y + 10, life: 99 };
  h.ctx.bullets.push(shot);
  for (let i = 0; i < B.life; i++) h.step();
  assert.ok(shot.life <= 0, 'enemy shot erased');
  assert.ok(h.hits.filter((x) => x.e === far).length > 3, 'reaches nearly a screen and keeps hurting');
  assert.ok(!h.hits.some((x) => x.e === over), 'no taller than the wave');
  h.step(); h.step();
  assert.ok(!h.st().fx.some((f) => f.kind === 'beam'), 'and dissipates');
});

test('his stance shows while the cannon is busy, never at rest', () => {
  const h = rig(1), BODY = 'weapon:drake_breath:body';
  h.step();
  assert.equal(Wpn.bodyArt(h.ctx), null, 'at rest he is himself');
  h.hold(3);
  assert.equal(Wpn.bodyArt(h.ctx)?.id, BODY, 'winding up');
  h.hold(30);
  assert.equal(Wpn.bodyArt(h.ctx)?.id, BODY, 'breathing');
  h.release(33); h.step();   // the cannon keeps its pose for the step it is released on
  assert.equal(Wpn.bodyArt(h.ctx), null, 'himself again once released');
});

test('the cannon rides his hand: each drop is where the drawings put it', () => {
  const sheet = (n) => parse(readFileSync(new URL(`../design/sprites/${n}.sprite`, import.meta.url), 'utf8'));
  // His hand's row: the first from row 10 down with his accent colour in it.
  const hand = (f) => f.rows.findIndex((r, y) => y >= 10 && r.includes('9'));
  const idle = sheet('player').frames.filter((f) => f.action === 'idle'), base = hand(idle[0]);
  assert.deepEqual(idle.map((f) => hand(f) - base), Wpn.DRAKE_HAND_DROP.idle, 'his idle bob');
  for (const f of sheet('weapon-drake_breath-body').frames) {
    assert.equal(hand(f) - base, Wpn.DRAKE_HAND_DROP.stance, `the stance, ${f.action} ${f.index}`);
  }
});
