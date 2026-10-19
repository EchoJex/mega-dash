/**
 * SIMON'S WHIP'S RULES, from the owner's choices of 19 Oct 2026: Simon's three
 * poses at this game's pace (option B), the overhead swing hurting lightly,
 * the crack's tip as its main hit, a 90-step cooldown, rooted while standing,
 * still sliding in a slide and standing up if the slide ends first.
 *
 * Every step and area is read OUT of the whip's frame data, never written
 * here: a redrawn sheet that moves a hit must still pass. What this checks is
 * that the whip obeys whatever the drawing says.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ladderAt, damageAtLevel, weaponOf } from '../src/data/weapons.js';
import * as Wpn from '../src/systems/weaponry.js';
import { clipOf } from '../src/systems/frame-data.js';
import { WHIP_CLIPS } from '../src/data/weapon-art.js';
import { parse } from '../docs/sprite-fmt.js';

const ID = 'simons_whip';
const HELD = 'weapon:simons_whip:held', BODY = 'weapon:simons_whip:body';
const FLOOR = 184;

function rig({ level = 1, sliding = false } = {}) {
  const run = {
    frame: 0, dmgMult: 1, wstate: {}, allies: [], lastDamaged: null,
    meleeArmor: 0, rootFrames: 0, moveScale: 1, planted: false, wpLevels: { [ID]: level },
  };
  const player = { x: 100, y: FLOOR - 24, vx: 0, vy: 0, facing: 1, onGround: true, sliding };
  const mk = (x, y) => ({ x, y, w: 12, h: 12, hp: 999, vy: 0, vx: 0, kbVx: 0, status: {} });
  const hits = [];
  const ctx = {
    run, player, bullets: [], allies: run.allies, enemies: [],
    arena: { x0: 0, x1: 400, floorY: FLOOR, ceilY: 0, patches: [], platforms: [] },
    platforms: [], statusBag: {}, floorY: FLOOR, equipped: [ID], fx: Wpn.makeFx(),
    levelOf: () => level, heal() {}, spawn() {},
    hitEnemy: (e, dmg) => { hits.push({ e, dmg, at: run.frame }); },
    overGround: () => true, shake() {}, puff() {}, arc() {}, patch() {}, sfx() {},
  };
  /** One game step in GameScene's order: grants cleared, cooldowns, weapons. */
  const step = () => {
    run.frame++;
    run.rootFrames = 0;
    Wpn.coolWeapons(run.wstate);
    Wpn.stepWeapons(ctx, [ID]);
  };
  const steps = (n) => { for (let i = 0; i < n; i++) step(); };
  /** Press fire: the game reads the button just before the weapons step, in the same step. */
  const press = () => { const ok = Wpn.fireActive(ctx, ID, 1); step(); return ok; };
  return { ctx, run, player, mk, hits, step, steps, press, st: () => run.wstate[ID] };
}

const base = (lv) => damageAtLevel(weaponOf(ID), lv);

test('every crack has the overhead swing first, then the crack, and the tip reaches further with level', () => {
  for (const name of WHIP_CLIPS) {
    const c = clipOf(HELD, name);
    assert.equal(c.hits.length, 2, name);
    assert.ok(c.hits[0].step < c.hits[1].step, `${name}: the swing comes before the crack`);
    assert.ok(c.hits[1].step + c.hits[1].len <= c.total, name);
  }
  const reach = (lv) => Wpn.RUNTIME[ID].reach(lv);
  assert.ok(reach(1) < reach(3) && reach(3) < reach(6));
});

test('the body sheet is the whip\'s twin: same clips, frames and holds, in the player\'s own colours', () => {
  for (const name of WHIP_CLIPS) assert.deepEqual(clipOf(BODY, name).holds, clipOf(HELD, name).holds, name);
  const pal = (f) => parse(readFileSync(new URL(`../design/sprites/${f}.sprite`, import.meta.url), 'utf8'))
    .palette.map((p) => p.hex).sort();
  const own = new Set(pal('player'));
  for (const hex of pal('weapon-simons_whip-body')) assert.ok(own.has(hex), `${hex} is not one of his colours`);
});

test('the swing hurts lightly behind him on its frame, and the crack hurts in front on its frame', () => {
  const c = clipOf(HELD, 'crack'), L = ladderAt(ID, 1);
  const r = rig();
  // One minion in the swing's area behind him, one against his front.
  const arc = c.hits[0];
  const hand = { x: r.player.x + 17, y: r.player.y + 12 };
  const behind = r.mk(hand.x + arc.x + arc.w / 2 - 6, hand.y + arc.y + arc.h / 2 - 6);
  const front = r.mk(hand.x + 1, FLOOR - 12);
  r.ctx.enemies.push(behind, front);
  const pressed = r.run.frame + 1;
  assert.ok(r.press());
  r.steps(c.total + 2);
  const b = r.hits.find((h) => h.e === behind), f = r.hits.find((h) => h.e === front);
  assert.ok(b && f, 'both are hit');
  assert.equal(b.at - pressed, arc.step, 'the swing lands on its own frame, counted from the press');
  assert.equal(f.at - pressed, c.hits[1].step, 'the crack lands on its frame');
  assert.ok(Math.abs(b.dmg - base(1) * L.arcDmgMult) < 1e-9, 'the swing is the light hit');
});

test('every crack reaches a minion standing against his front, standing or sliding, at every length', () => {
  for (const [lv, sliding] of [[1, false], [3, false], [6, false], [1, true], [6, true]]) {
    const r = rig({ level: lv, sliding });
    const e = r.mk(r.player.x + 18, FLOOR - 12);
    r.ctx.enemies.push(e);
    r.press();
    r.steps(25);
    assert.equal(r.hits.filter((h) => h.e === e).length, 1, `Lv${lv}${sliding ? ' sliding' : ''}: paid once`);
  }
});

test('the tip is worth more than the shaft, and only the tip catches', () => {
  const c = clipOf(HELD, 'crack'), tip = c.hits[1];
  const r = rig();
  const hand = { x: r.player.x + 17, y: r.player.y + 12 };
  const e = r.mk(hand.x + tip.x + tip.w / 2 - 6, hand.y + tip.y + tip.h / 2 - 6);
  r.ctx.enemies.push(e);
  r.press();
  r.steps(tip.step + 1);
  assert.equal(r.hits.length, 1);
  assert.ok(Math.abs(r.hits[0].dmg - base(1) * ladderAt(ID, 1).dmgMult) < 1e-9, 'tip damage');
  assert.equal(r.st().lash.grabbed, e, 'the tip catches it');
});

test('standing, he is rooted for the whole crack; sliding, he is not', () => {
  const total = clipOf(HELD, 'crack').total;
  const r = rig();
  r.press();
  for (let i = 1; i < total; i++) { assert.equal(r.run.rootFrames, 1, `step ${i}`); r.step(); }
  assert.equal(r.run.rootFrames, 1, 'the last step');
  r.step();
  assert.equal(r.run.rootFrames, 0, 'free once it is over');
  const s = rig({ sliding: true });
  s.press();
  s.steps(3);
  assert.equal(s.run.rootFrames, 0);
  assert.equal(s.st().lash.clip, 'lowCrack');
});

test('a slide that ends mid-crack finishes it standing, at the same step', () => {
  const r = rig({ level: 3, sliding: true });
  r.press();
  r.steps(7);
  const t = r.st().lash.t;
  r.player.sliding = false;
  r.step();
  assert.equal(r.st().lash.clip, 'crackLong');
  assert.equal(r.st().lash.t, t + 1, 'the clock carries on');
  assert.equal(r.run.rootFrames, 1, 'and now he is rooted');
});

test('the whip waits its cooldown before it cracks again', () => {
  const r = rig();
  assert.ok(r.press());
  const cd = ladderAt(ID, 1).cooldown;
  r.steps(cd - 3);
  assert.equal(r.press(), false, 'too soon');
  r.steps(3);
  assert.ok(r.press(), 'ready again');
});

test('Lv3 cracks up-forward when up-forward is held; Lv1 does not', () => {
  for (const [lv, want] of [[1, 'crack'], [3, 'crackUpLong'], [6, 'crackUpLonger']]) {
    const r = rig({ level: lv });
    r.player.diagInput = 'ur';
    r.press();
    assert.equal(r.st().lash.clip, want);
  }
});

test('mid-crack the game draws the body sheet in his place, and his own picture otherwise', () => {
  const r = rig();
  assert.equal(Wpn.bodyArt(r.ctx), null);
  r.press();
  r.steps(2);
  const b = Wpn.bodyArt(r.ctx);
  assert.equal(b.id, BODY);
  assert.ok(b.cell >= 0);
  r.steps(30);
  assert.equal(Wpn.bodyArt(r.ctx), null);
});
