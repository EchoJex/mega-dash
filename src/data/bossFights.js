/**
 * BOSS FIGHTS — the two concurrent danger sources, per boss, per layer.
 *
 * Every boss runs TWO loops at once and they are ALWAYS layer-synced: a layer-2
 * boss uses layer-2 hazards *and* layer-2 attacks. See CLAUDE.md; this is not a
 * detail to collapse into one system.
 *
 *   attack[n]  the boss's own state machine — what it personally does to you
 *   hazard[n]  the ambient ARENA loop — runs on its own regardless of the boss
 *
 * Each layer is `{ step(ctx) }`, called EVERY frame rather than on a timer, so a
 * boss can patrol, telegraph, and fire in sequence. Per-boss state lives on
 * `boss.fs` (attack) and `boss.hs` (hazard).
 *
 * ctx = { boss, player, playerBox, layer, shoot, bounds, arena, shake, hurt,
 *         status, patch, floorY }
 *   bounds  the walkable span — the sealed arena's inner walls during a fight,
 *           the camera view otherwise. Never read the camera directly.
 *   arena   the sealed room and its furniture, or null outside one. A hazard
 *           that needs geometry must bail out when this is null.
 *   hurt    (sourceX, damage) -> applies a real hit: flinch, knockback, i-frames
 *   status  (id, frames) -> a character attribute on the player
 *   patch   (id, x, y, w, h, frames, opts) -> a terrain attribute on the arena
 *
 * SOURCE OF TRUTH: design/TRACKER.md. Build only from fields the owner has
 * marked `[ready]` — never from `[draft]` or `[wip]`. A `null` layer here means
 * the tracker has not defined that layer; inventing content would mean
 * designing blind.
 */

import { FEEL } from '../config/feel.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Unit vector from a source toward the player's centre. */
export function aimAt(sx, sy, px, py) {
  const dx = px - sx, dy = py - sy;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

// ── CORE MAN — Typeless ─────────────────────────────────────────────
// "Moves back and forth on the stage, occasionally stopping to fire..."
// L1  a 3-bullet spread with mild auto-aim
// L2  either that spread, OR a 5-bullet string with aim LOCKED to where the
//     player was when the first bullet left
// L3  either three spreads, OR a 5-10 bullet string that tracks continuously
const CORE = {
  speed: 0.55,
  windupFrames: 26,      // the stop-and-telegraph before firing
  spreadArc: 0.42,       // radians between the 3 spread bullets
  spreadSpeed: 1.9,
  stringSpeed: 2.6,
  stringGap: 7,          // frames between bullets in a string
  restFrames: [70, 130], // patrol time between attacks
  homing: 0.012,         // "mild" auto-aim
};

function coreShot(ctx, vx, vy, homing) {
  const b = ctx.boss;
  ctx.shoot({
    x: b.x + b.w / 2, y: b.y + b.h * 0.45,
    vx, vy, radius: 2.5, damage: 1,
    color: b.primary, shape: 'bolt', homing,
  });
}

function coreAttack(layer) {
  return (ctx) => {
    const b = ctx.boss, p = ctx.player;
    const fs = b.fs || (b.fs = { mode: 'patrol', t: rnd(...CORE.restFrames), dir: -1 });
    const pcx = p.x + 12, pcy = p.y + 12;

    switch (fs.mode) {
      case 'patrol': {
        b.x += fs.dir * CORE.speed;
        if (b.x <= ctx.bounds.x0) { b.x = ctx.bounds.x0; fs.dir = 1; }
        if (b.x + b.w >= ctx.bounds.x1) { b.x = ctx.bounds.x1 - b.w; fs.dir = -1; }
        if (--fs.t <= 0) {
          fs.mode = 'windup';
          fs.t = CORE.windupFrames;
          // L1 only ever spreads; L2/L3 choose between the two patterns.
          fs.pattern = layer === 1 || Math.random() < 0.5 ? 'spread' : 'string';
        }
        break;
      }

      case 'windup': {                       // stopped, telegraphing
        if (--fs.t > 0) break;
        if (fs.pattern === 'spread') {
          fs.mode = 'spread';
          fs.volleys = layer >= 3 ? 3 : 1;   // L3 fires a set of three
          fs.t = 0;
        } else {
          fs.mode = 'string';
          fs.shots = layer >= 3 ? Math.round(rnd(5, 10)) : 5;
          fs.t = 0;
          // L2 locks aim at the player's position as the first bullet leaves;
          // L3 keeps tracking, so it re-aims every shot.
          fs.lock = layer >= 3 ? null : aimAt(b.x + b.w / 2, b.y + b.h * 0.45, pcx, pcy);
        }
        break;
      }

      case 'spread': {
        if (--fs.t > 0) break;
        const a = aimAt(b.x + b.w / 2, b.y + b.h * 0.45, pcx, pcy);
        const base = Math.atan2(a.y, a.x);
        for (let i = -1; i <= 1; i++) {
          const th = base + i * CORE.spreadArc;
          coreShot(ctx, Math.cos(th) * CORE.spreadSpeed, Math.sin(th) * CORE.spreadSpeed,
            CORE.homing);
        }
        if (--fs.volleys > 0) { fs.t = 22; break; }   // L3 fires three of these
        fs.mode = 'patrol';
        fs.t = rnd(...CORE.restFrames);
        break;
      }

      case 'string': {
        if (--fs.t > 0) break;
        const a = fs.lock || aimAt(b.x + b.w / 2, b.y + b.h * 0.45, pcx, pcy);
        coreShot(ctx, a.x * CORE.stringSpeed, a.y * CORE.stringSpeed, 0); // no auto-aim
        fs.t = CORE.stringGap;
        if (--fs.shots <= 0) { fs.mode = 'patrol'; fs.t = rnd(...CORE.restFrames); }
        break;
      }
    }
  };
}

// ── CORE MAN hazard — ceiling turrets ───────────────────────────────
// "Turrets aim at player to nearest 45 deg, all firing simultaneous short
//  3-bullet bursts of slightly slow bullets; 15s cooldown."
// L2 aims to 22.5 deg with a slightly reduced cooldown, L3 to 11.25 deg with a
// further reduced one. Same number of turrets at every layer — the escalation
// is precision and frequency, not volume.
const CORE_HAZ = {
  snap: { 1: Math.PI / 4, 2: Math.PI / 8, 3: Math.PI / 16 },
  cooldown: { 1: 900, 2: 780, 3: 660 },   // 15s / 13s / 11s
  shots: 3,
  gap: 9,                                  // frames between bullets in a burst
  speed: 1.45,                             // "slightly slow"
};

/** Round an angle to the nearest multiple of `step`. This is the whole hazard. */
const snapAngle = (th, step) => Math.round(th / step) * step;

function coreHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a || !a.turrets.length) return;   // no ceiling to mount on outside an arena
    const hs = ctx.boss.hs || (ctx.boss.hs = { t: 150, left: 0, gap: 0, aim: [] });

    if (hs.left > 0) {
      if (--hs.gap > 0) return;
      hs.gap = CORE_HAZ.gap;
      hs.left--;
      a.turrets.forEach((t, i) => {
        const th = hs.aim[i];
        t.flash = 4;
        ctx.shoot({
          x: t.x + t.w / 2, y: t.y + t.h + 2,
          vx: Math.cos(th) * CORE_HAZ.speed, vy: Math.sin(th) * CORE_HAZ.speed,
          radius: 2, damage: 1, color: '#9AA4B4', shape: 'bolt',
        });
      });
      if (hs.left <= 0) hs.t = CORE_HAZ.cooldown[layer];
      return;
    }

    if (--hs.t > 0) return;
    // Every turret locks its angle at the same instant, so the burst reads as
    // one coordinated volley rather than a stagger.
    const p = ctx.player;
    hs.aim = a.turrets.map((t) => {
      const v = aimAt(t.x + t.w / 2, t.y + t.h, p.x + 12, p.y + 12);
      return snapAngle(Math.atan2(v.y, v.x), CORE_HAZ.snap[layer]);
    });
    hs.left = CORE_HAZ.shots;
    hs.gap = 1;
  };
}

// ── BLAZE MAN — Fire ────────────────────────────────────────────────
// Attack: "Launches several bouncing fireballs toward the player that climb up
// walls and leave hot trails." L2 fires fewer but bounces higher and alternates
// its angles. L3 adds the arena flood, synchronised with the hazard.
const BLAZE = {
  count: { 1: 4, 2: 2, 3: 2 },
  bounce: { 1: 0.62, 2: 0.86, 3: 0.86 },
  windup: 34,
  rest: { 1: [90, 150], 2: [80, 130], 3: [80, 130] },
  speed: 2.1,
  gravity: 0.17,
  // 3 SECONDS on every attack layer, per the owner. The trail cools from the
  // moment each patch is laid down, not from when the fireball finally expires
  // — see MERGE_RATIO in systems/attributes.js for why that was not true before.
  hotFrames: 180,
  floodFrames: 1800,       // the flood recedes after 30 seconds
  floodDepth: 24,          // "about one default player height"
};

/**
 * THE FLOOD'S SAFETY CONTRACT — there is always somewhere to stand.
 *
 * While the lava is up the floor does not exist, so the platforms are the only
 * footing in the room and the fight stops being a fight the moment they are all
 * unusable. A platform is unusable if it has phased out, if it is Hot, or if the
 * boss is standing on it. So for the whole flood:
 *
 *   - nothing phases out
 *   - at least one platform that is NOT the boss's perch is guaranteed cool,
 *     including clearing any Hot a rock already left on it
 *
 * The hazard loop separately stops dropping rocks while the lava is up (see
 * blazeHazard), because a rock landing on the last cool platform would take the
 * guarantee away a second after it was given.
 */
function keepFootingDuringFlood(ctx, a, perch) {
  for (const pl of a.platforms) { pl.on = true; pl.t = Math.max(pl.t, 120); }

  const guests = a.platforms.filter((pl) => pl !== perch);
  if (!guests.length || guests.some((pl) => pl.hot === 0)) return;

  // Every guest platform is Hot — cool the first one, and clear the terrain
  // attribute sitting on it too, or it would still burn on contact.
  const safe = guests[0];
  safe.hot = 0;
  for (let i = a.patches.length - 1; i >= 0; i--) {
    const p = a.patches[i];
    const overX = p.x < safe.x + safe.w && p.x + p.w > safe.x;
    const overY = Math.abs(p.y - (safe.y - 3)) < 6;
    if (overX && overY) a.patches.splice(i, 1);
  }
}

function blazeAttack(layer) {
  return (ctx) => {
    const b = ctx.boss, p = ctx.player, a = ctx.arena;
    const fs = b.fs || (b.fs = { mode: 'patrol', t: rnd(...BLAZE.rest[layer]), dir: -1, alt: 1 });

    // LAYER 3 ONLY — the flood. The boss claims a platform for itself a few
    // seconds before the shake, so the tell is "he got out of the way", which is
    // the fairest possible warning for a floor-covering attack.
    const midFlood = fs.mode === 'flood' || fs.mode === 'flooded';
    if (layer >= 3 && a && !midFlood && fs.flood == null) fs.flood = 900;
    if (layer >= 3 && a && !midFlood && --fs.flood <= 0) {
      const perch = a.platforms.find((pl) => pl.on) || a.platforms[0];
      if (perch) {
        perch.on = true; perch.t = 1200;             // his perch does not phase out
        fs.mode = 'flood'; fs.t = 150; fs.perch = perch;
      } else { fs.flood = 300; }
    }

    switch (fs.mode) {
      case 'flood': {
        // Ride up to the perch, then trigger the room.
        const tx = fs.perch.x + fs.perch.w / 2 - b.w / 2;
        b.x += (tx - b.x) * 0.12;
        b.y += (fs.perch.y - b.h - b.y) * 0.12;
        if (--fs.t === 60) ctx.shake(3, 90);          // the tell
        if (fs.t <= 0) {
          a.liquid.target = BLAZE.floodDepth;
          a.liquid.hold = BLAZE.floodFrames;
          keepFootingDuringFlood(ctx, a, fs.perch);
          fs.mode = 'flooded';
        }
        break;
      }
      case 'flooded': {
        b.y += (fs.perch.y - b.h - b.y) * 0.12;
        // Re-asserted every frame: the floor is gone, so the guarantee that one
        // platform stays solid and cool has to hold for the whole 30 seconds,
        // not just at the moment the lava arrives.
        keepFootingDuringFlood(ctx, a, fs.perch);
        if (a.liquid.hold === 0 && a.liquid.h <= 0.6) {
          // "leaving Hot on the ground" once the lava drops away
          // The flood is an ATTACK, so its residue uses the attack's 3s Hot
          // rather than the arena hazard's longer linger.
          ctx.patch('hot', a.x0, a.floorY - 3, a.x1 - a.x0, 4, BLAZE.hotFrames);
          fs.mode = 'patrol'; fs.t = rnd(...BLAZE.rest[layer]); fs.flood = 1200;
        }
        break;
      }

      case 'patrol': {
        b.x += fs.dir * 0.7;
        b.y += ((ctx.floorY - b.h) - b.y) * 0.15;     // settle back to the floor
        if (b.x <= ctx.bounds.x0) { b.x = ctx.bounds.x0; fs.dir = 1; }
        if (b.x + b.w >= ctx.bounds.x1) { b.x = ctx.bounds.x1 - b.w; fs.dir = -1; }
        if (--fs.t <= 0) { fs.mode = 'windup'; fs.t = BLAZE.windup; }
        break;
      }

      case 'windup': {
        if (--fs.t > 0) break;
        const n = BLAZE.count[layer];
        for (let i = 0; i < n; i++) {
          // L1 fans toward the player; L2/L3 alternate high and low launch
          // angles between volleys, which is what makes the bounce read.
          const toP = aimAt(b.x + b.w / 2, b.y + b.h * 0.5, p.x + 12, p.y + 12);
          const base = Math.atan2(toP.y, toP.x);
          const lift = layer >= 2 ? (fs.alt > 0 ? -0.85 : -0.35) : -0.3 - i * 0.16;
          const th = base + lift;
          ctx.shoot({
            x: b.x + b.w / 2, y: b.y + b.h * 0.5,
            vx: Math.cos(th) * BLAZE.speed, vy: Math.sin(th) * BLAZE.speed,
            radius: 3, damage: 1, color: b.primary, shape: 'wheel',
            gravity: BLAZE.gravity, bounce: BLAZE.bounce[layer],
            climbs: true, hot: BLAZE.hotFrames, burn: FEEL.burnFrames,
          });
        }
        fs.alt = -fs.alt;
        fs.mode = 'patrol';
        fs.t = rnd(...BLAZE.rest[layer]);
        break;
      }
    }
  };
}

/**
 * Hazard: falling flaming rocks that leave Hot where they land. The screen shake
 * is the telegraph.
 *
 * L2 is "slightly more, slightly bigger, slightly faster" than L1, and L3 IS L2 —
 * the arena hazard stops escalating there. The escalation at layer 3 lives in the
 * boss's own attack (the flood), not in the room. There are no lava pits: that
 * was an earlier reading of the design and the owner has since corrected it.
 */
const BLAZE_HAZ = {
  shake: { 1: [1, 30], 2: [2, 40], 3: [2, 40] },
  cycle: { 1: 1200, 2: 900, 3: 900 },      // "every 20 seconds or so"
  rocks: { 1: 3, 2: 5, 3: 5 },
  drop: { 1: 26, 2: 18, 3: 18 },           // frames between rocks
  fall: { 1: 0.9, 2: 1.15, 3: 1.15 },
  size: { 1: 12, 2: 15, 3: 15 },           // slightly bigger
};

function blazeHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a) return;
    const hs = ctx.boss.hs || (ctx.boss.hs = { t: 180, left: 0, gap: 0 });

    // NOT WHILE THE LAVA IS UP. During the flood the platforms are the only
    // footing left, and a rock landing on one would make it Hot — taking away
    // the last safe place to stand. The cycle resumes once the lava recedes.
    //
    // Keyed on `target`, not on the visible height: the lava takes ~2s to rise,
    // and a rock released during that climb would still be in the air when the
    // floor vanished underneath it.
    if (a.liquid && (a.liquid.target > 0.5 || a.liquid.h > 0.5)) {
      a.hazards.length = 0;                // anything already falling is cancelled
      hs.left = 0;
      hs.t = Math.max(hs.t, 90);           // a beat to breathe before it restarts
      return;
    }

    if (hs.left > 0) {
      if (--hs.gap > 0) return;
      hs.gap = BLAZE_HAZ.drop[layer];
      hs.left--;
      const s = BLAZE_HAZ.size[layer];
      a.hazards.push({
        kind: 'rock',
        x: rnd(a.x0 + 8, a.x1 - 8 - s), y: a.ceilY - s,
        w: s, h: s, vy: BLAZE_HAZ.fall[layer],
      });
      return;
    }

    if (--hs.t > 0) return;
    const [mag, dur] = BLAZE_HAZ.shake[layer];
    ctx.shake(mag, dur);
    hs.left = BLAZE_HAZ.rocks[layer];
    hs.gap = 24;                              // the shake lands before the rocks
    hs.t = BLAZE_HAZ.cycle[layer];
  };
}

// ── TEMPEST MAN — Water ─────────────────────────────────────────────
// Attack: "Slow-moving high-pressure water cannons fire water in discrete
// angled arcs at random times; no damage on contact, but pushes the player in
// the direction of the water's travel and blocks player bullets."
const TEMPEST = {
  rest: [110, 190],
  windup: 26,
  speed: 1.5,
  push: 0.55,
};

function tempestAttack(layer) {
  return (ctx) => {
    const b = ctx.boss, p = ctx.player;
    const fs = b.fs || (b.fs = { mode: 'patrol', t: rnd(...TEMPEST.rest), dir: -1 });

    switch (fs.mode) {
      case 'patrol':
        b.x += fs.dir * 0.4;                    // "slow-moving"
        if (b.x <= ctx.bounds.x0) { b.x = ctx.bounds.x0; fs.dir = 1; }
        if (b.x + b.w >= ctx.bounds.x1) { b.x = ctx.bounds.x1 - b.w; fs.dir = -1; }
        if (--fs.t <= 0) { fs.mode = 'windup'; fs.t = TEMPEST.windup; }
        break;

      case 'windup': {
        if (--fs.t > 0) break;
        // A discrete arc, not a stream: one shot per volley, angled at the
        // player, that keeps travelling along the floor once it lands.
        const v = aimAt(b.x + b.w / 2, b.y + b.h * 0.4, p.x + 12, p.y + 12);
        const th = Math.atan2(v.y, v.x) - 0.5;
        ctx.shoot({
          x: b.x + b.w / 2, y: b.y + b.h * 0.4,
          vx: Math.cos(th) * TEMPEST.speed, vy: Math.sin(th) * TEMPEST.speed,
          radius: 4, damage: 0, color: '#5CADD5', shape: 'stream',
          gravity: 0.06, push: TEMPEST.push, blocks: true, crawls: true, life: 460,
        });
        fs.mode = 'patrol';
        fs.t = rnd(...TEMPEST.rest);
        break;
      }
    }
  };
}

// Hazard: rain pushing the player, portholes pouring down both walls, and a
// current across the floor dragging toward the central drain.
const TEMPEST_HAZ = {
  rainPush: 0.055,
  currentGround: 0.09,
  currentAir: 0.03,
  cycle: 300,        // L2 changes rain direction on this beat
  dirs: [[0, 1], [-0.6, 1], [0.6, 1]],
};

function tempestHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a || !a.drain) return;
    const hs = ctx.boss.hs || (ctx.boss.hs = { t: TEMPEST_HAZ.cycle, dir: 0 });

    // L1 rain is straight down. L2 cycles through three directions.
    if (layer >= 2 && --hs.t <= 0) {
      hs.t = TEMPEST_HAZ.cycle;
      hs.dir = (hs.dir + 1 + Math.floor(Math.random() * 2)) % TEMPEST_HAZ.dirs.length;
    }
    const [rx] = TEMPEST_HAZ.dirs[layer >= 2 ? hs.dir : 0];
    a.rainDir = rx;

    // The push is rebuilt every frame rather than accumulated, so it is a steady
    // force you lean against, not something that winds up over time.
    const p = ctx.player;
    const pcx = p.x + 12;
    const toDrain = Math.sign((a.drain.x + a.drain.w / 2) - pcx);
    const cur = p.onGround ? TEMPEST_HAZ.currentGround : TEMPEST_HAZ.currentAir;
    a.push.x = rx * TEMPEST_HAZ.rainPush + toDrain * cur;
    a.push.y = 0;

    // The spike ball on the grate, and (L2+) the grate itself.
    const ball = a.drain.ball;
    const box = ctx.playerBox;
    const hitBall = box.x < ball.x + ball.r && box.x + box.w > ball.x - ball.r
      && box.y < ball.y + ball.r && box.y + box.h > ball.y - ball.r;
    const onGrate = a.drain.grateHurts
      && box.y + box.h >= a.drain.y - 1
      && box.x + box.w > a.drain.x && box.x < a.drain.x + a.drain.w;
    if (hitBall || onGrate) ctx.hurt(ball.x, 2);
  };
}

export const FIGHTS = {
  core: {
    attack: { 1: { step: coreAttack(1) }, 2: { step: coreAttack(2) }, 3: { step: coreAttack(3) } },
    hazard: { 1: { step: coreHazard(1) }, 2: { step: coreHazard(2) }, 3: { step: coreHazard(3) } },
  },

  blaze: {
    attack: { 1: { step: blazeAttack(1) }, 2: { step: blazeAttack(2) }, 3: { step: blazeAttack(3) } },
    hazard: { 1: { step: blazeHazard(1) }, 2: { step: blazeHazard(2) }, 3: { step: blazeHazard(3) } },
  },

  // TEMPEST MAN — the tracker defines attack L1 and hazards L1/L2 only. Attack
  // L2/L3 and hazard L3 are still blank there, so they stay null and the
  // layer-fallback in fightFor() reuses the hardest layer actually written.
  torrent: {
    attack: { 1: { step: tempestAttack(1) }, 2: null, 3: null },
    hazard: { 1: { step: tempestHazard(1) }, 2: { step: tempestHazard(2) }, 3: null },
  },
};

/** The behaviour for a boss at a layer, or null if that layer is undesigned. */
export const fightFor = (bossId, layer) => {
  const f = FIGHTS[bossId];
  if (!f) return { attack: null, hazard: null };
  // Layers fall BACK, never forward: a layer-3 boss with no layer-3 content
  // fights at the hardest layer actually written rather than standing idle.
  const pick = (table) => {
    for (let l = layer; l >= 1; l--) if (table[l]) return table[l];
    return null;
  };
  return { attack: pick(f.attack), hazard: pick(f.hazard) };
};
