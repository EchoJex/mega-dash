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
 *   hurt    (sourceX, damage) -> applies a real hit: flinch, knockback, i-frames
 *   shove   (dx, dy) -> moves the player with no hit and no i-frames
 *   blockAt (x, y, r) -> destroys player shots in a radius
 *   flash   (frames, at) -> a whole-room light flash, `at` 0-1 across the width
 *
 * SOURCE OF TRUTH: design/TRACKER.md. Build only from fields the owner has
 * marked `[draft]` — never from `[wip]`. A `null` layer here means the tracker
 * has not defined that layer; inventing content would mean designing blind.
 */

import { FEEL } from '../config/feel.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/** Unit vector from a source toward the player's centre. */
export function aimAt(sx, sy, px, py) {
  const dx = px - sx, dy = py - sy;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

// ── PROTO MK0 (id `core`) — Typeless ────────────────────────────────
// "Moves back and forth on the stage, occasionally stopping to fire..."
// L1  a 3-bullet spread with mild auto-aim
// L2  either that spread, OR a 5-bullet string with aim LOCKED to where the
//     player was when the first bullet left
// L3  either a SET OF TWO spreads, OR a 5-bullet string that tracks
//     continuously instead of locking
//
// The string is five bullets at every layer and the layer-3 set is two, not
// three: an earlier reading had 3 volleys and a random 5-10 string, which was
// harder than the tracker asks for and made layer 3 a different attack rather
// than a sharper one.
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
          fs.volleys = layer >= 3 ? 2 : 1;   // L3 fires "a set of 2"
          fs.t = 0;
        } else {
          fs.mode = 'string';
          fs.shots = 5;                      // "a string of 5 bullets" at every layer
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
        if (--fs.volleys > 0) { fs.t = 22; break; }   // L3 fires two of these
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
// Attack L1: "Launches a 1 very bouncy fireball toward the player that climb up
// walls and leave hot trails everywhere it contacts."
// Attack L2: "2 fireballs, much higher bounce heights ; boss has multiple stem
// angle to choose from."
// Attack L3 (unchanged): "Same as Layer 2", plus the flood.
//
// THE COUNT WENT DOWN AND THE BOUNCE WENT UP, twice over. An earlier revision
// read "a couple" at L1 and this file inferred 2 and 3; the fields now say one
// and two outright. Fewer, bouncier fireballs is a different attack from more,
// flatter ones — one ball ricocheting around the room for a long time is a
// thing you track and move around, three flat ones are a thing you hide from.
//
// L3 shares L2's numbers because its field says "same as Layer 2". Everything
// layer 3 adds is the flood, below.
const BLAZE = {
  count: { 1: 1, 2: 2, 3: 2 },
  // "Very bouncy" at L1, "much higher bounce heights" at L2. Restitution, so
  // 0.95 keeps almost all of the impact speed — that ball is in the room for a
  // long time, which is the point of it.
  bounce: { 1: 0.80, 2: 0.95, 3: 0.95 },
  /**
   * THE STEM ANGLES — the lift added to the aim-at-the-player vector.
   *
   * L1 has ONE, so the single fireball always arrives on the same arc and can
   * be learned. From L2 "the boss has multiple stem angle to choose from" and
   * picks one per volley at random, which is what stops a bounce pattern from
   * being memorised once and answered forever.
   *
   * This replaced a strict high/low alternation. Alternating is still a pattern
   * — the second volley is knowable from the first — and the field asks for a
   * choice, not a cycle.
   */
  stems: {
    1: [-0.30],
    2: [-1.05, -0.80, -0.55, -0.28],
    3: [-1.05, -0.80, -0.55, -0.28],
  },
  // How far apart two balls in one volley sit around the chosen stem.
  fan: 0.22,
  windup: 34,
  rest: { 1: [90, 150], 2: [80, 130], 3: [80, 130] },
  speed: 2.1,
  gravity: 0.17,
  // 1.5 SECONDS on every attack layer, per the owner after playtesting 3s: the
  // trail should read as a rapidly decaying TAIL behind the fireball, obviously
  // temporary, still long enough to see. The arena hazard's Hot is deliberately
  // much longer (FEEL.hotLingerFrames) — a rock scorches the ground, a fireball
  // only brushes it.
  //
  // The trail cools from the moment each patch is laid down, not from when the
  // fireball finally expires — see MERGE_RATIO in systems/attributes.js.
  hotFrames: 90,
  floodFrames: 1200,       // "the lava recedes after 20 seconds"
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
 * The boss rides his OWN lift during the flood (arena furniture, layer 3 only),
 * so he no longer takes one of the player's three platforms with him — which is
 * what the tracker means by "a small platform that moves up and down just for
 * himself". `perch` is still excluded here in case the lift is missing.
 *
 * The hazard loop keeps dropping rocks through the flood but never above a
 * platform (see blazeHazard), so shelter cannot be taken away a second after it
 * was given while the sky stays a threat.
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
    const fs = b.fs || (b.fs = { mode: 'patrol', t: rnd(...BLAZE.rest[layer]), dir: -1 });

    // LAYER 3 ONLY — the flood. The boss claims a platform for itself a few
    // seconds before the shake, so the tell is "he got out of the way", which is
    // the fairest possible warning for a floor-covering attack.
    const midFlood = fs.mode === 'flood' || fs.mode === 'flooded';
    if (layer >= 3 && a && !midFlood && fs.flood == null) fs.flood = 900;
    if (layer >= 3 && a && !midFlood && --fs.flood <= 0) {
      // His own lift, if the room has one. Falling back to a shared platform
      // keeps the layer playable in a room built before the lift existed.
      const perch = a.lift || a.platforms.find((pl) => pl.on) || a.platforms[0];
      if (perch) {
        perch.on = true; perch.t = 1200;             // his perch does not phase out
        fs.mode = 'flood'; fs.t = 210; fs.perch = perch;
      } else { fs.flood = 300; }
    }
    // The glow decays back to nothing whenever a flood is not building, so the
    // ebb only ever means "this is about to happen".
    if (a && !midFlood) a.ebb *= 0.9;

    switch (fs.mode) {
      case 'flood': {
        // Ride up to the perch, then trigger the room.
        const tx = fs.perch.x + fs.perch.w / 2 - b.w / 2;
        b.x += (tx - b.x) * 0.12;
        b.y += (fs.perch.y - b.h - b.y) * 0.12;
        // THE TELL, IN THREE BEATS. He climbs clear of the floor; "the red
        // pixels of the background ebb rapidly"; then the room shakes for a
        // full 2.5 seconds before any lava appears. This attack deletes the
        // floor for twenty seconds, so the warning is proportional to that
        // rather than to a normal volley.
        a.ebb = Math.min(1, (210 - fs.t) / 160) * (0.55 + 0.45 * Math.sin(fs.t * 0.55));
        if (--fs.t === 150) ctx.shake(3, 170);
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
        b.x += (fs.perch.x + fs.perch.w / 2 - b.w / 2 - b.x) * 0.12;  // ride the lift
        a.ebb = 0.4 + 0.12 * Math.sin(b.anim * 0.16);
        // Re-asserted every frame: the floor is gone, so the guarantee that one
        // platform stays solid and cool has to hold for the whole twenty
        // seconds, not just at the moment the lava arrives.
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
        // ONE STEM PER VOLLEY, chosen at random from the layer's set, and the
        // balls fan around it. Choosing per volley rather than per ball keeps
        // a volley reading as one action off one arm.
        const stems = BLAZE.stems[layer];
        const stem = stems[(Math.random() * stems.length) | 0];
        for (let i = 0; i < n; i++) {
          const toP = aimAt(b.x + b.w / 2, b.y + b.h * 0.5, p.x + 12, p.y + 12);
          const base = Math.atan2(toP.y, toP.x);
          const spread = n > 1 ? (i - (n - 1) / 2) * BLAZE.fan : 0;
          const th = base + stem + spread;
          ctx.shoot({
            x: b.x + b.w / 2, y: b.y + b.h * 0.5,
            vx: Math.cos(th) * BLAZE.speed, vy: Math.sin(th) * BLAZE.speed,
            radius: 3, damage: 1, color: b.primary, shape: 'wheel',
            gravity: BLAZE.gravity, bounce: BLAZE.bounce[layer],
            climbs: true, hot: BLAZE.hotFrames, burn: FEEL.burnFrames,
          });
        }
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
  // THE TELEGRAPH IS THE SHAKE, so it has to last long enough to be read as a
  // warning rather than a glitch. Half a second of rumble before rocks start
  // falling is not a warning, it is a surprise with a sound effect attached.
  // ~2 seconds of building quake, with the first rock arriving at `lead`, gives
  // time to look up, pick a spot and commit to it.
  shake: { 1: [1, 130], 2: [2, 150], 3: [2, 150] },
  lead: 96,                                // frames of shake before the first rock
  cycle: { 1: 1200, 2: 900, 3: 900 },      // "every 20 seconds or so"
  rocks: { 1: 6, 2: 9, 3: 9 },             // per cycle — more overall
  // ...but never more than this many in the air at once. The cap, not the count,
  // is what keeps the shower readable: a fourth rock waits for a slot instead of
  // filling the sky, so there is always a gap you can see through and stand in.
  airborne: 3,
  // Spacing between rocks, tuned to ROUGHLY a third of a rock's flight time, so
  // the cap above is reached just as the first rock lands and the shower reads as
  // a steady staggered stream. Dropping them faster than that only clumps three
  // together and then stalls for a second and a half waiting for a slot.
  drop: { 1: 64, 2: 50, 3: 50 },
  fall: { 1: 0.9, 2: 1.15, 3: 1.15 },
  size: { 1: 12, 2: 15, 3: 15 },           // slightly bigger
};

/**
 * Where the next rock falls.
 *
 * Anywhere across the room normally. While the lava is up it must not be above
 * a platform, because those are the only footing left — so the column is
 * re-rolled a few times and the drop is skipped for a frame if the sky over
 * open lava is genuinely full.
 */
function rockDropX(a, size, flooding) {
  const lo = a.x0 + 8, hi = a.x1 - 8 - size;
  if (!flooding) return rnd(lo, hi);
  for (let tries = 0; tries < 12; tries++) {
    const x = rnd(lo, hi);
    const clear = !a.platforms.some((pl) => x + size > pl.x - 4 && x < pl.x + pl.w + 4);
    if (clear) return x;
  }
  return null;
}

function blazeHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a) return;
    const hs = ctx.boss.hs || (ctx.boss.hs = { t: 180, left: 0, gap: 0 });

    // "Rocks shall fall, but not from right above the platforms while the lava
    // is up." During the flood the platforms are the only footing left, so a
    // rock landing on one would make it Hot and take away the last safe place
    // to stand — but stopping the shower outright made the flood a rest.
    //
    // Keyed on `target`, not on the visible height: the lava takes ~2s to rise,
    // and a rock released during that climb would still be in the air when the
    // floor vanished underneath it.
    const flooding = !!(a.liquid && (a.liquid.target > 0.5 || a.liquid.h > 0.5));

    // A flood can begin with rocks already in the air. One of those landing on
    // a platform would take away the only footing in the room a second after
    // the floor vanished, so they are culled at the moment the lava starts
    // rising rather than allowed to finish a fall that was fair when it began.
    if (flooding && !hs.wasFlooding) {
      for (let i = a.hazards.length - 1; i >= 0; i--) {
        const r = a.hazards[i];
        if (a.platforms.some((pl) => r.x + r.w > pl.x - 4 && r.x < pl.x + pl.w + 4)) {
          a.hazards.splice(i, 1);
        }
      }
    }
    hs.wasFlooding = flooding;

    // `cycle` is the WHOLE period, so this runs during the shower too. Ticking
    // it only between showers meant the real interval was cycle + however long
    // the rocks took to clear, which stretched the tracker's "every 20 seconds
    // or so" to nearer 27 once the rock count went up.
    if (hs.t > 0) hs.t--;

    if (hs.left > 0) {
      if (--hs.gap > 0) return;
      // Hold the next rock back until one already falling has landed. Retried
      // every frame rather than skipped, so the cycle still delivers all of its
      // rocks — it just paces them by what is on screen instead of by a timer.
      if (a.hazards.length >= BLAZE_HAZ.airborne) { hs.gap = 1; return; }
      const s = BLAZE_HAZ.size[layer];
      const x = rockDropX(a, s, flooding);
      // While flooded, a cycle can run out of clear sky. Waiting a frame and
      // retrying is right — the shower should thin out over the platforms, not
      // lose its rocks.
      if (x === null) { hs.gap = 1; return; }
      hs.gap = BLAZE_HAZ.drop[layer];
      hs.left--;
      a.hazards.push({
        kind: 'rock',
        x, y: a.ceilY - s,
        w: s, h: s, vy: BLAZE_HAZ.fall[layer],
        crumbles: true, leaves: 'hot',
        damage: FEEL.hazardDamage, burn: FEEL.burnFrames, diesOnHit: true,
      });
      // Never let the next telegraph start while the last rocks are still up.
      if (hs.left === 0) hs.t = Math.max(hs.t, 150);
      return;
    }

    if (hs.t > 0) return;
    const [mag, dur] = BLAZE_HAZ.shake[layer];
    ctx.shake(mag, dur);
    hs.left = BLAZE_HAZ.rocks[layer];
    hs.gap = BLAZE_HAZ.lead;                  // the shake lands well before the rocks
    hs.t = BLAZE_HAZ.cycle[layer];
  };
}

// ── TEMPEST MAN (id `torrent`) — Water ──────────────────────────────
/**
 * "Boss flies around the stage just like the attack pattern of Queen B from
 *  DKC at full health / damaged / critical health. Player takes moderate damage
 *  from contact with boss. Jetpack pushes the player in the direction of the
 *  water's travel and blocks player bullets."
 *
 * THE QUEEN B PATTERN, as three layers. He is not a shooter — he is a moving
 * obstacle with an exhaust plume, and the fight is about reading where he is
 * going. He cruises at altitude, picks a moment, dives across the room at the
 * player's height, and climbs back. Layer by layer the cruise gets faster, the
 * gap between dives shorter, and the number of dives per pass goes up.
 *
 * THE JETPACK IS THE WEAPON. It fires opposite his travel, which means the
 * exhaust always sweeps the ground he just left — so the safe place is behind
 * him, not beside him. It shoves the player along its own direction and eats
 * player fire, so shooting him through the plume does not work and the answer
 * is to get around it.
 *
 * This replaces an earlier water-cannon reading of the field. The tracker's
 * attack layers describe a flight pattern with no projectile at all, and the
 * cannon was a leftover from a previous draft of the same line.
 */
const TEMPEST = {
  cruiseY: { 1: 0.30, 2: 0.30, 3: 0.26 },   // fraction of the floor height
  drift: { 1: 0.55, 2: 0.9, 3: 1.3 },
  rest: { 1: [140, 210], 2: [100, 160], 3: [65, 110] },
  dives: { 1: 1, 2: 2, 3: 3 },
  diveSpeed: { 1: 2.1, 2: 2.8, 3: 3.5 },
  tell: 30,
  contact: 2,        // "moderate damage from contact with boss"
  jetLen: 30,
  jetPush: 0.9,
  jetR: 8,
};

/**
 * The exhaust plume: a short ray out of the boss, pointing opposite his travel.
 *
 * Sampled at a few points rather than modelled as a shape, because the only two
 * questions it ever answers are "is the player in it" and "is a bullet in it",
 * and both are cheap point tests. `b.jet` is left on the boss for the renderer
 * so the nozzles always point where the force actually is.
 */
function tempestJet(ctx, b, fs) {
  const vx = b.x - (fs.px ?? b.x), vy = b.y - (fs.py ?? b.y);
  fs.px = b.x; fs.py = b.y;
  const m = Math.hypot(vx, vy);
  // Hovering: the nozzles hang straight down, which is also what holds him up.
  const jx = m < 0.08 ? 0 : -vx / m;
  const jy = m < 0.08 ? 1 : -vy / m;
  b.jet = { dx: jx, dy: jy, len: TEMPEST.jetLen };

  const ox = b.x + b.w / 2, oy = b.y + b.h * 0.75;
  const box = ctx.playerBox;
  for (let d = 4; d <= TEMPEST.jetLen; d += 6) {
    const px = ox + jx * d, py = oy + jy * d;
    ctx.blockAt(px, py, TEMPEST.jetR);
    const near = px > box.x - TEMPEST.jetR && px < box.x + box.w + TEMPEST.jetR
      && py > box.y - TEMPEST.jetR && py < box.y + box.h + TEMPEST.jetR;
    // Weaker further down the plume, so being clipped by its tip is a nudge
    // and standing in its mouth is a problem.
    if (near) {
      const falloff = 1 - d / (TEMPEST.jetLen + 8);
      ctx.shove(jx * TEMPEST.jetPush * falloff, jy * TEMPEST.jetPush * falloff * 0.6);
    }
  }
}

function tempestAttack(layer) {
  return (ctx) => {
    const b = ctx.boss, p = ctx.player;
    let fs = b.fs;
    if (!fs) {
      fs = b.fs = { mode: 'cruise', t: rnd(...TEMPEST.rest[layer]), dir: -1, left: 0 };
      // He hurts more to touch than the default body-check, because touching
      // him is most of what the fight can do to you.
      b.contactDamage = TEMPEST.contact;
    }
    const cruiseY = ctx.floorY * TEMPEST.cruiseY[layer];

    switch (fs.mode) {
      case 'cruise': {
        b.x += fs.dir * TEMPEST.drift[layer];
        b.y += (cruiseY - b.y) * 0.06 + Math.sin(b.anim * 0.05) * 0.35;
        if (b.x <= ctx.bounds.x0) { b.x = ctx.bounds.x0; fs.dir = 1; }
        if (b.x + b.w >= ctx.bounds.x1) { b.x = ctx.bounds.x1 - b.w; fs.dir = -1; }
        if (--fs.t <= 0) {
          fs.mode = 'tell';
          fs.t = TEMPEST.tell;
          fs.left = TEMPEST.dives[layer];
        }
        break;
      }

      case 'tell': {
        // He stops dead and sinks a little. Standing still is the whole
        // telegraph — with no projectile to watch for, the only warning the
        // player gets is that he has stopped drifting.
        b.y += 0.35;
        if (--fs.t > 0) break;
        fs.mode = 'dive';
        // Committed at launch: he goes for the height the player was at, and
        // crosses the room. Dodging is a matter of not being on that line by
        // the time he arrives.
        fs.targetY = Math.max(16, Math.min(ctx.floorY - b.h - 2, p.y));
        fs.dir = p.x + 12 > b.x + b.w / 2 ? 1 : -1;
        break;
      }

      case 'dive': {
        b.x += fs.dir * TEMPEST.diveSpeed[layer];
        b.y += Math.sign(fs.targetY - b.y) * Math.min(2.2, Math.abs(fs.targetY - b.y) * 0.2);
        const atEdge = fs.dir < 0
          ? b.x <= ctx.bounds.x0
          : b.x + b.w >= ctx.bounds.x1;
        if (atEdge) {
          b.x = fs.dir < 0 ? ctx.bounds.x0 : ctx.bounds.x1 - b.w;
          if (--fs.left > 0) { fs.mode = 'tell'; fs.t = Math.round(TEMPEST.tell * 0.6); }
          else { fs.mode = 'climb'; }
        }
        break;
      }

      case 'climb': {
        b.y += (cruiseY - b.y) * 0.1;
        if (Math.abs(b.y - cruiseY) < 2) {
          fs.mode = 'cruise';
          fs.t = rnd(...TEMPEST.rest[layer]);
          fs.dir = -fs.dir;
        }
        break;
      }
    }

    tempestJet(ctx, b, fs);
  };
}

/**
 * TEMPEST MAN's hazard — the room itself, running all three layers.
 *
 * Constant at every layer: heavy rain pushing you along its own direction,
 * steel pipes in the upper corners pouring a cascade down the walls, knee-deep
 * floor water with a current dragging inward, and a grate-covered central drain
 * with a spike ball sitting on it. The wading penalty on jumps lives in
 * GameScene, because it is a property of the water rather than of this loop.
 *
 * What each layer adds:
 *   L1  rain straight down; occasional barrels float out of the pipes. They are
 *       footing and they are shootable, so they are the one thing in the room
 *       that is on your side — until they reach the ball and break open.
 *   L2  rain cycles between three directions on a fixed beat, each change
 *       telegraphed by a lightning bolt and a screen flash; spike balls join
 *       the barrels coming out of the pipes.
 *   L3  the direction changes hold for a random stretch of at least three
 *       seconds with only a brief die-down between them, and it is spike balls
 *       only — the barrels stop coming, so the floor stops offering shelter.
 */
const TEMPEST_HAZ = {
  rainPush: 0.055,
  currentGround: 0.09,
  currentAir: 0.03,
  cycle: 300,                 // L2's fixed beat between direction changes
  l3Hold: [200, 460],         // L3: random, and never under three seconds
  l3Lull: 40,                 // the "limited die down" between L3 changes
  dirs: [[0, 1], [-0.6, 1], [0.6, 1]],
  spawn: { 1: 330, 2: 260, 3: 190 },
  // What floats out of the pipes. Weighted by repetition, which keeps the mix
  // in one readable line: L2 is mostly barrels with the occasional ball.
  drops: {
    1: ['barrel'],
    2: ['barrel', 'barrel', 'spikeball'],
    3: ['spikeball'],
  },
  floatSpeed: 1.3,
  driftSpeed: 0.5,
  // L3's flash bang. Long enough to be a real blind — about half a second of
  // recovery — and bright enough that the room is gone while it burns.
  bangFrames: 30,
  bangHard: 0.92,
};

function tempestHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a || !a.drain) return;
    const hs = ctx.boss.hs || (ctx.boss.hs = {
      t: TEMPEST_HAZ.cycle, dir: 0, lull: 0, spawn: 120, pipe: 0,
    });

    // L1 rain is straight down and never changes. L2 cycles on a fixed beat;
    // L3 holds each direction for a random stretch with a brief lull between,
    // so the pattern cannot be counted out.
    if (layer >= 2 && --hs.t <= 0) {
      hs.t = layer >= 3 ? rnd(...TEMPEST_HAZ.l3Hold) : TEMPEST_HAZ.cycle;
      hs.dir = (hs.dir + 1 + Math.floor(Math.random() * 2)) % TEMPEST_HAZ.dirs.length;
      hs.lull = layer >= 3 ? TEMPEST_HAZ.l3Lull : 0;
      /**
       * THE FLASH IS THE TELEGRAPH, so it fires on the change rather than as
       * decoration — and at layer 3 it becomes the hazard itself. "Lightning
       * bolts in the background are now bright enough to wash out the screen
       * like a flash bang": the direction change still gets announced, but you
       * cannot see the room while it lands.
       */
      const at = hs.dir === 1 ? 0.25 : hs.dir === 2 ? 0.75 : 0.5;
      if (layer >= 3) ctx.flash(TEMPEST_HAZ.bangFrames, at, TEMPEST_HAZ.bangHard);
      else ctx.flash(10, at);
    }
    if (hs.lull > 0) hs.lull--;

    const [rx] = TEMPEST_HAZ.dirs[layer >= 2 ? hs.dir : 0];
    a.rainDir = rx;

    // The push is rebuilt every frame rather than accumulated, so it is a steady
    // force you lean against, not something that winds up over time. During an
    // L3 lull the rain slackens rather than stopping — "limited die down".
    const p = ctx.player;
    const pcx = p.x + 12;
    const slack = hs.lull > 0 ? 0.25 : 1;
    const toDrain = Math.sign((a.drain.x + a.drain.w / 2) - pcx);
    const cur = p.onGround ? TEMPEST_HAZ.currentGround : TEMPEST_HAZ.currentAir;
    a.push.x = rx * TEMPEST_HAZ.rainPush * slack + toDrain * cur;
    a.push.y = 0;

    tempestFloaters(ctx, a, hs, layer);

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

/**
 * Barrels and spike balls: out of a pipe, down the cascade, then along the
 * waterline to the drain, where the central spike ball pops them.
 *
 * The two alternate between the pipes rather than picking randomly, so both
 * corners stay live and the room never spends twenty seconds threatening one
 * side. Popping on the ball is what caps the population — there is no despawn
 * timer, and there should not be one: an object that vanished on its own would
 * make the drain decorative.
 */
function tempestFloaters(ctx, a, hs, layer) {
  const drainCx = a.drain.x + a.drain.w / 2;
  const waterTop = a.floorY - (a.liquid?.h || 0);

  for (const h of a.hazards) {
    if (h.kind !== 'barrel' && h.kind !== 'spikeball') continue;
    if (h.y + h.h < waterTop - 1) {
      h.y += TEMPEST_HAZ.floatSpeed;          // still falling down the cascade
    } else {
      h.y = waterTop - h.h + 2;               // riding the surface
      h.x += Math.sign(drainCx - (h.x + h.w / 2)) * TEMPEST_HAZ.driftSpeed;
    }
    if (h.kind === 'spikeball') h.spin = (h.spin || 0) + 0.09;
  }

  if (--hs.spawn > 0) return;
  hs.spawn = TEMPEST_HAZ.spawn[layer];
  const pipes = a.pipes || [];
  if (!pipes.length) return;
  const pipe = pipes[hs.pipe % pipes.length];
  hs.pipe++;

  const table = TEMPEST_HAZ.drops[layer];
  const kind = table[Math.floor(Math.random() * table.length)];
  const x = pipe.dir > 0 ? pipe.x + pipe.w - 6 : pipe.x - 6;
  if (kind === 'barrel') {
    a.hazards.push({
      kind: 'barrel', x, y: pipe.y + pipe.h, w: 14, h: 12,
      // Standable AND shootable: the one friendly object in the room, and the
      // only reason to want the pipes doing anything.
      solid: true, hp: 6, popsOnBall: true,
    });
  } else {
    a.hazards.push({
      kind: 'spikeball', x, y: pipe.y + pipe.h, w: 12, h: 12,
      damage: 2, popsOnBall: true, spin: 0,
    });
  }
}

// ── VOLT MAN — Electric ─────────────────────────────────────────────
/**
 * L1 "Infrequently fires up to 2 sequential zigzag lightning bolts that bounce
 *     and arc on contact with surfaces or the player. Damage and size and stun
 *     duration decrease with TOTAL TRAVEL DISTANCE."
 * L2 "2 sets of bolts with a longer bounce life, fired as a primary volley and
 *     a secondary volley which is shot on a slightly shallower angle causing
 *     the two paths to eventually intersect."
 * L3 "Bolts no longer lose size on bounce, only reduce in damage delt.
 *     Occasionally the boss jumps and slams into the floor, briefly energising
 *     every panel destroying any ground minions that are on those panels."
 *
 * FALLOFF IS BY DISTANCE, NOT BY BOUNCE, and that is a rewrite rather than a
 * tune. Per-bounce decay meant a bolt crossing an open room stayed lethal
 * forever while one fired into a corner died in a second — backwards, since the
 * dangerous bolt is the one that has just been fired at you. Distance makes
 * RANGE the thing the player reads. Stun now fades with it too, which it never
 * did. See the fadeDist block in GameScene.stepBullets.
 *
 * BOUNCES ARE STILL A BUDGET, and that is what "longer bounce life" buys at L2:
 * how many surfaces a bolt may spend before it expires, independent of how far
 * it has flown.
 *
 * "2 SETS OF BOLTS" IS THE COUNT AT L2, not three. The previous field said
 * "bolts increase to 3"; this one does not, and what it names instead is the
 * second SET. So both layers fire two per volley and L2 fires two volleys, on
 * angles shallow enough that the paths cross rather than run parallel.
 */
const VOLT = {
  // "up to 2" at L1; L2 keeps two per volley and adds a second volley.
  bolts: { 1: 2, 2: 2, 3: 2 },
  bounces: { 1: 3, 2: 6, 3: 6 },
  gap: 12,                   // frames between bolts in a volley
  speed: 2.3,
  windup: 30,
  rest: { 1: [110, 170], 2: [90, 140], 3: [80, 125] },
  /**
   * THE FALLOFF CURVE. `fadeK` is what a bolt keeps after travelling `fadeDist`
   * pixels, so 0.55 over 220px means a bolt that has crossed the room twice is
   * doing about a sixth of its opening damage. Applied to damage, radius and
   * stun together — the field lists all three.
   */
  fadeDist: 220,
  fadeK: 0.55,
  // Layer 3 keeps its SIZE all the way out; only the damage falls.
  fadeSize: { 1: true, 2: true, 3: false },
  zig: 9,                    // frames between kinks
  secondVolley: 34,          // L2+: the overlapping volley, fired before the first ends
  // L3's floor slam: how long every panel stays live afterwards. Brief, per
  // "briefly energising every panel" — the whole floor at once is the harshest
  // thing in the fight and the platforms are the only answer to it.
  slamLive: 44,
  slamRise: -6.2,
  slamGravity: 0.55,
};

function voltBolt(ctx, layer, th, shallow) {
  const b = ctx.boss;
  ctx.shoot({
    x: b.x + b.w / 2, y: b.y + b.h * 0.45,
    vx: Math.cos(th) * VOLT.speed, vy: Math.sin(th) * VOLT.speed,
    radius: 3, damage: 2, color: b.primary, shape: 'spark',
    zigzag: VOLT.zig, zigAngle: shallow ? 0.5 : 0.75,
    ricochet: VOLT.bounces[layer],
    // A corner costs ONE bounce, which is what his reach has always been tuned
    // against. Only the Alloy Blade's Lv1 rung spends a corner twice.
    cornerSafe: true,
    // NO per-bounce loss: the falloff is distance now, and letting both run
    // would decay a cornered bolt twice for the same journey.
    bounceDmg: 1,
    bounceShrink: 1,
    bouncesOffPlayer: true,
    stun: 45,
    // The originals the distance falloff reads back from every frame.
    dmg0: 2, rad0: 3, stun0: 45,
    fadeDist: VOLT.fadeDist, fadeK: VOLT.fadeK, fadeSize: VOLT.fadeSize[layer],
    life: 900,
  });
}

function voltAttack(layer) {
  return (ctx) => {
    const b = ctx.boss, p = ctx.player;
    const fs = b.fs || (b.fs = { mode: 'patrol', t: rnd(...VOLT.rest[layer]), dir: -1 });

    switch (fs.mode) {
      case 'patrol': {
        b.x += fs.dir * 0.6;
        if (b.x <= ctx.bounds.x0) { b.x = ctx.bounds.x0; fs.dir = 1; }
        if (b.x + b.w >= ctx.bounds.x1) { b.x = ctx.bounds.x1 - b.w; fs.dir = -1; }
        if (--fs.t <= 0) { fs.mode = 'windup'; fs.t = VOLT.windup; }
        break;
      }

      case 'windup': {
        if (--fs.t > 0) break;
        fs.mode = 'volley';
        fs.left = VOLT.bolts[layer];
        fs.second = layer >= 2 ? VOLT.secondVolley : -1;
        fs.t = 0;
        const v = aimAt(b.x + b.w / 2, b.y + b.h * 0.45, p.x + 12, p.y + 12);
        fs.base = Math.atan2(v.y, v.x);
        break;
      }

      case 'volley': {
        // The second volley starts BEFORE the first has finished, which is what
        // makes two zigzag paths overlap rather than arrive in sequence.
        if (fs.second > 0 && --fs.second === 0) {
          fs.left += VOLT.bolts[layer];
          fs.shallow = true;
        }
        if (--fs.t > 0) break;
        fs.t = VOLT.gap;
        voltBolt(ctx, layer, fs.base + (Math.random() - 0.5) * 0.5, fs.shallow);
        if (--fs.left > 0) break;
        fs.shallow = false;
        /**
         * LAYER 3 SLAMS, and only OCCASIONALLY. It used to earth itself after
         * every single volley and light only the panels a bolt had touched;
         * the field now says he "jumps and slams into the floor, briefly
         * energising EVERY panel". Every panel is the whole floor, so it
         * cannot be the punctuation on every volley — a third of the time
         * leaves it a thing that happens to you rather than a metronome.
         */
        const slam = layer >= 3 && Math.random() < 0.34;
        fs.mode = slam ? 'leap' : 'patrol';
        if (slam) { fs.vy = VOLT.slamRise; fs.y0 = b.y; ctx.sfx('jump', { pitch: 0.6 }); }
        else fs.t = rnd(...VOLT.rest[layer]);
        break;
      }

      /**
       * THE JUMP IS THE TELEGRAPH. He leaves the floor, which is the one place
       * the attack is about to cover, and the arc gives the player the better
       * part of a second to get onto a platform. A floor-wide hazard with no
       * warning would be unreadable; a floor-wide hazard announced by the boss
       * physically vacating the floor explains itself.
       */
      case 'leap': {
        fs.vy += VOLT.slamGravity;
        b.y += fs.vy;
        const rest = fs.y0;
        if (b.y < rest) break;
        b.y = rest;

        const a = ctx.arena;
        if (a) {
          // SOMEWHERE TO STAND, guaranteed. The whole floor going live at once
          // is only survivable because the platforms are not part of the floor,
          // so at least one has to be up when it lands.
          const shelter = a.platforms.filter((pl) => !pl.lift);
          if (shelter.length && !shelter.some((pl) => pl.on)) {
            shelter[0].on = true; shelter[0].t = 180;
          }
          /**
           * THE SLAM RE-ENERGISES FROM SCRATCH rather than topping a panel up.
           * `liveMax` and `discharge` are what the two damage tiers and the
           * renderer both read, so a panel left mid-linger by the sweep has to
           * be restamped or the slam would land on it as a mild tick — the
           * whole floor going up would then be the gentlest thing in the fight.
           * Every panel discharges together and the current it leaves is brief,
           * per "BRIEFLY energising every panel".
           */
          for (const pn of a.panels) {
            pn.live = VOLT.slamLive;
            pn.liveMax = VOLT.slamLive;
            pn.discharge = VOLT_HAZ.discharge;
            pn.tick = 0;
          }
          ctx.flash(10);
          // "Destroying any ground minions that are on those panels" — every
          // panel is live, so every grounded minion is on one. Vaporised
          // rather than damaged: the floor did it, not the player.
          for (const m of ctx.minions) {
            if (m.hp <= 0) continue;
            if (m.y + m.h >= a.floorY - 6) ctx.vaporise(m);
          }
        }
        ctx.shake(3, 34);
        fs.mode = 'patrol';
        fs.t = rnd(...VOLT.rest[layer]);
        break;
      }
    }
  };
}

/**
 * VOLT MAN's hazard — the floor sweep, and the conductors above it.
 *
 * L1 "Floor panels electrify in a VERY SLOW left-to-right sweep, one panel at a
 *     time, telegraphed by a lamp on the panel a moment before it energises.
 *     Contact deals moderate damage and a short Stun."
 * L2 "SAME SWEEP, plus overhead conductors that drop a vertical St Elmo's fire
 *     looking bolt at fixed positions on a regular beat. The conductors are
 *     inert between arcs and can be stood under safely."
 * L3 "The sweep runs in both directions at once, meeting in the middle. Arcs
 *     now chain through nearby minions and into the player if the player is
 *     close to them, DESTROYING THE MINIONS and damaging the player and
 *     applying stun."
 *
 * THE LAMP IS THE WHOLE HAZARD. A panel you cannot avoid is not a hazard, it is
 * a tax; the tell arriving a beat before the current is what turns a floor that
 * kills you into a floor you read. What the layers add is COVERAGE, never speed
 * and never a shorter warning — "same sweep" and "very slow" are both the
 * owner's words, and an earlier build quietly ran L2 and L3 half again as fast.
 *
 * THE LAYER-3 CHAIN NEEDS SOMETHING TO CHAIN THROUGH, so Volt Man summons.
 * A sealed arena has no ambient minions by design, which left the first half of
 * that sentence with nothing to travel along — so he now calls up to one
 * airborne and one ground minion every thirty seconds, on every layer.
 *
 * ON EVERY LAYER, not only layer 3, and that is the owner's call: the summons
 * are how the room gets tested, and having them appear only at the layer that
 * consumes them would mean the other two fights never show what a minion does
 * in a boss room. A chained minion is DESTROYED outright rather than damaged,
 * because the arc is what kills it.
 */
const VOLT_HAZ = {
  step: { 1: 40, 2: 40, 3: 40 },   // frames between panels — "same sweep"
  tell: 28,
  // "Visually discharging before immediately going inert" — the discharge is a
  // MOMENT at the head of the live window, not the whole of it.
  discharge: 10,
  /**
   * "LINGERING ELECTRIFICATION OF THE PANEL LASTS 3S." Three seconds is 180
   * fixed steps, and it is the field's number rather than a tuned one.
   *
   * It is much longer than it sounds. The sweep steps every 40 frames across
   * eight panels, so a 180-frame linger leaves between four and five of them
   * hot at any moment — more than half the floor. That is the point: the
   * discharge is the thing you dodge and the current behind it is the thing you
   * plan around, and a linger short enough to simply wait out would collapse
   * the two back into one hazard.
   */
  linger: 180,
  live: 190,                       // discharge + linger, and drawn as one window
  // "Moderate damage" for the discharge itself...
  damage: 3,
  // ...and "mild damage" for the current it leaves behind, on its own tick so
  // crossing a spent panel is a cost rather than a wall.
  mildDamage: 1,
  mildTick: 24,
  stun: 90,
  // L3 does not restate the conductor beat, so it inherits L2's.
  arcBeat: { 1: 0, 2: 210, 3: 210 },
  arcTell: 34,
  arcLive: 24,
  chainRange: 34,                  // L3 only
  // "Up to 1 airborne and 1 ground minion every 30 seconds." The cap is per
  // plane and counts what is already alive, so a fight where nothing dies
  // stays at two rather than accumulating one pair per cycle.
  summonEvery: 1800,
  summonCap: 1,
};

function voltHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a || !a.panels.length) return;
    const hs = ctx.boss.hs || (ctx.boss.hs = {
      t: 90, i: 0, arc: VOLT_HAZ.arcBeat[layer] || 0,
      // First pair arrives early rather than half a minute in, so the room has
      // something in it from the start of a playtest.
      summon: 120,
    });
    const n = a.panels.length;

    // THE SUMMONS. Placed inside the room rather than at its edge: an arena has
    // walls where the stream has open sides, and the ambient spawner's "just off
    // the right of the screen" is a wall here.
    if (--hs.summon <= 0) {
      hs.summon = VOLT_HAZ.summonEvery;
      const mid = (a.x0 + a.x1) / 2;
      ctx.summon('air', mid + 40, a.ceilY + 40, VOLT_HAZ.summonCap);
      ctx.summon('ground', mid + 60, a.floorY - 16, VOLT_HAZ.summonCap);
    }

    // THE SWEEP. One panel at a time, and at layer 3 a second head runs the
    // other way so the two meet in the middle.
    if (--hs.t <= 0) {
      hs.t = VOLT_HAZ.step[layer];
      const heads = layer >= 3 ? [hs.i, n - 1 - hs.i] : [hs.i];
      for (const k of heads) {
        const pn = a.panels[((k % n) + n) % n];
        pn.tell = VOLT_HAZ.tell;
        pn.pending = VOLT_HAZ.tell;
      }
      hs.i = (hs.i + 1) % n;
    }

    for (const pn of a.panels) {
      // The lamp burns down, THEN the current arrives. Two counters rather than
      // one so the warning cannot be shortened by a fast sweep.
      if (pn.pending > 0 && --pn.pending === 0) {
        pn.live = VOLT_HAZ.live;
        // Both stamped ONTO the panel rather than imported by the renderer:
        // arena.js does not import this file and must not start, so the panel
        // carries everything anyone needs to know about its own state.
        pn.liveMax = VOLT_HAZ.live;
        pn.discharge = VOLT_HAZ.discharge;
        pn.tick = 0;
      }
      if (pn.live <= 0) continue;
      const box = ctx.playerBox;
      if (!(box.x + box.w > pn.x && box.x < pn.x + pn.w && box.y + box.h >= pn.y - 1)) continue;

      /**
       * TWO TIERS, and the difference is the whole point of the rung.
       *
       * "Discharge animation causes flinch and moderate damage and but not
       * stun. Lingering electrified panel deals mild damage and a short Stun."
       * So the panel firing is the dangerous instant and the current left
       * behind is a tax — being caught mid-sweep costs you a hit, walking
       * across a spent panel costs you a little.
       *
       * ONLY THE LINGER STUNS, and that reversal matters. Stunning on the
       * discharge stacked a slow on top of the flinch and the knockback at the
       * exact moment the sweep was arriving at the next panel, so one mistimed
       * step could hand you the rest of the row. The linger is the tier you can
       * choose to cross, so a slow there is a price you agreed to pay.
       *
       * `hurt` supplies the flinch and the knockback for free; the mild tier
       * asks for neither, which is why it goes through `status` and a direct
       * damage tick rather than through the hit path.
       */
      const discharging = pn.live > pn.liveMax - pn.discharge;
      if (discharging) {
        ctx.hurt(pn.x + pn.w / 2, VOLT_HAZ.damage);
      } else {
        if (--pn.tick <= 0) {
          pn.tick = VOLT_HAZ.mildTick;
          ctx.hurt(pn.x + pn.w / 2, VOLT_HAZ.mildDamage);
        }
        ctx.status('stun', VOLT_HAZ.stun, { step: FEEL.stunPlayerStep });
      }
    }

    // OVERHEAD CONDUCTORS, layer 2 and up. Inert between arcs, so standing
    // under one is only a mistake on the beat.
    const beat = VOLT_HAZ.arcBeat[layer];
    if (!beat || !a.conductors.length) return;
    if (--hs.arc <= 0) {
      hs.arc = beat;
      for (const c of a.conductors) c.tell = VOLT_HAZ.arcTell;
    }
    for (const c of a.conductors) {
      if (c.tell > 0) { if (c.tell === 1) c.arc = VOLT_HAZ.arcLive; continue; }
      if (c.arc <= 0) continue;
      const cxp = c.x + c.w / 2;
      const box = ctx.playerBox;
      let reach = box.x + box.w > cxp - 3 && box.x < cxp + 3;
      // LAYER 3 CHAINS. The arc travels through any minion standing under it,
      // destroying it, and carries on into the player if the player is near
      // that minion — so a minion is not cover, it is a conductor. Standing
      // clear of the strike is only safe if you are also clear of whatever the
      // strike is about to earth itself through.
      if (layer >= 3 && c.arc === VOLT_HAZ.arcLive) {
        const pcx = box.x + box.w / 2;
        for (const m of ctx.minions) {
          if (m.hp <= 0) continue;
          const mcx = m.x + m.w / 2;
          if (Math.abs(mcx - cxp) > VOLT_HAZ.chainRange) continue;
          ctx.vaporise(m);
          if (Math.abs(pcx - mcx) < VOLT_HAZ.chainRange) reach = true;
        }
        // ...and the arc itself reaches a little wider than the bolt it draws.
        if (!reach) reach = Math.abs(pcx - cxp) < VOLT_HAZ.chainRange;
      }
      if (reach && c.arc === VOLT_HAZ.arcLive) {
        ctx.flash(6);
        ctx.hurt(cxp, VOLT_HAZ.damage);
        ctx.status('stun', VOLT_HAZ.stun, { step: FEEL.stunPlayerStep });
      }
    }
  };
}

// ── STRIKE MAN — Fighting ───────────────────────────────────────────
/**
 * "Weighted training bags swing across the room on ceiling rails at a steady
 *  pace, dealing knockback and light damage. Their path is fixed and
 *  learnable."
 *
 * FIXED IS THE DESIGN. The bag starts at a known place, travels at a constant
 * speed and turns at the walls — no randomness anywhere, so the room is a
 * rhythm to step into rather than a thing to react to. Resist the urge to
 * "improve" it with a varied speed; the tracker calls the predictability out
 * by name.
 *
 * ALL THREE HAZARD LAYERS ARE BUILT. Layer 1 is one bag. Layers 2 and 3 add a
 * second bag and turn the furniture into something the BOSS uses — see
 * strikeHazard below.
 */
/**
 * THE BAG HAS TO HANG INTO THE PLAYER'S LANE OR IT IS SCENERY.
 *
 * The room is 224px tall with the floor at 184, so a bag hanging a few pixels
 * below a ceiling rail is nowhere near anything and the hazard does nothing.
 * These numbers put its bottom edge at 168: a standing player (box 162-184) is
 * clipped, and a sliding one (173-184) passes underneath.
 *
 * That is the whole hazard, and it is why the slide matters here — walk into
 * the bag and you are knocked back, time a slide and you are through.
 */
const STRIKE_HAZ = {
  speed: 1.1,
  w: 14,
  h: 40,
  drop: 106,        // how far the bag's TOP hangs below its rail
  /**
   * TWO BAGS FROM LAYER 2, ON CROSSING PATHS. They start at opposite ends of
   * different rails and run at slightly different speeds, so where they cross
   * drifts down the room instead of being one fixed spot to memorise. One bag
   * is a rhythm; two is a rhythm you cannot stand still inside.
   */
  bags: { 1: 1, 2: 2, 3: 2 },
  /**
   * The chance he yanks a bag down to block, rolled on each RANGED hit.
   *
   * "Moderate" — a third. High enough that chipping him from across the room
   * stops being free, low enough that it never feels like the answer to ranged
   * damage is "there is no ranged damage". His layer-2 guard stance already
   * punishes chip; this punishes the shots that get through it.
   */
  grabChance: { 1: 0, 2: 0.34, 3: 0.34 },
  holdFrames: 84,     // how long the bag stays up
  grabCooldown: 200,  // before he can reach for one again
  // L3 ONLY: the bag comes back at you afterwards.
  throwSpeed: 3.1,
  throwGravity: 0.16,
  throwDamage: 3,     // heavy, against the swinging bag's 1
  returnFrames: 150,  // before a thrown bag is winched back onto its rail
};

/**
 * STRIKE MAN'S ARENA HAZARD — the bags, and from layer 2 what he does with them.
 *
 * L1 "A heavy training bag swings across the room on a ceiling rail." One bag,
 *    one speed, forever. Walk into it and you are knocked back; time a slide
 *    and you pass underneath. That predictability is the design.
 * L2 "Two bags on crossing paths, boss has a moderate chance of pulling one
 *    down as a shield whenever taking ranged damage."
 * L3 "Same as hazard l2 only now the boss will throw the bag at player for
 *    heavy damage after using as a shield."
 *
 * THIS IS THE LAYER WHERE THE FURNITURE STOPS BEING FURNITURE. Layers 2 and 3
 * do not make the bags hit harder or swing faster — they hand them to the boss.
 * The room is the same room; what changed is that he is now allowed to use it,
 * which is the same shape every other boss's layers take.
 *
 * THE SHIELD REUSES `boss.guard`, the stance mechanic the bullet loop already
 * understands (see stepBullets). It is re-asserted every frame it is held,
 * because the bullet loop zeroes it on each shot it eats — so the stance blocks
 * ONE shot and the bag blocks everything for as long as he holds it up. The
 * hazard loop runs after the attack loop, so this wins the frame it is set.
 */
function strikeHazard(layer) {
  return (ctx) => {
    const a = ctx.arena;
    if (!a || !a.rails?.length) return;
    const b = ctx.boss;
    const hs = b.hs || (b.hs = { spawned: false, held: null, hold: 0, cool: 0 });

    if (!hs.spawned) {
      hs.spawned = true;
      const n = STRIKE_HAZ.bags[layer] || 1;
      for (let i = 0; i < n; i++) {
        const rail = a.rails[i + 1] || a.rails[0];
        a.hazards.push({
          kind: 'bag',
          // Opposite ends, so the two paths cross rather than trail.
          x: i === 0 ? a.x0 + 24 : a.x1 - 24 - STRIKE_HAZ.w,
          y: rail.y + STRIKE_HAZ.drop,
          w: STRIKE_HAZ.w, h: STRIKE_HAZ.h,
          railY: rail.y,
          // A shade apart so the crossing point moves down the room.
          vx: i === 0 ? STRIKE_HAZ.speed : -STRIKE_HAZ.speed * 1.18,
          damage: 1,          // "light damage"; hurt() supplies the knockback
          mode: 'swing',
        });
      }
    }

    if (hs.cool > 0) hs.cool--;

    /**
     * RANGED DAMAGE IS THE TRIGGER, and `rangedHits` is the only way to know.
     * A hit from the Strike Gauntlet or the Volt Spark calls hitEnemy directly
     * and never becomes a projectile, so counting damage alone would have him
     * grabbing a shield against a weapon that is already inside his guard.
     */
    const took = b.rangedHits || 0;
    b.rangedHits = 0;
    if (took && !hs.held && hs.cool === 0 && Math.random() < (STRIKE_HAZ.grabChance[layer] || 0)) {
      // The nearest swinging bag — he reaches for the one he can actually
      // reach, not for whichever happens to be first in the list.
      const bags = a.hazards.filter((h) => h.kind === 'bag' && h.mode === 'swing');
      let best = null, bestD = Infinity;
      for (const h of bags) {
        const d = Math.abs((h.x + h.w / 2) - (b.x + b.w / 2));
        if (d < bestD) { bestD = d; best = h; }
      }
      if (best) {
        best.mode = 'shield';
        hs.held = best;
        hs.hold = STRIKE_HAZ.holdFrames;
      }
    }

    for (let i = a.hazards.length - 1; i >= 0; i--) {
      const h = a.hazards[i];
      if (h.kind !== 'bag') continue;

      if (h.mode === 'shield') {
        // Pinned to the front of him, at the height it hung at. The player can
        // still walk into it, so a shield is also a wall.
        const face = ctx.player.x < b.x ? -1 : 1;
        h.x = face < 0 ? b.x - h.w - 2 : b.x + b.w + 2;
        h.y = b.y + b.h - h.h;
        b.guard = Math.max(b.guard || 0, hs.hold);
        if (--hs.hold <= 0) {
          hs.held = null;
          hs.cool = STRIKE_HAZ.grabCooldown;
          b.guard = 0;
          if (layer >= 3) {
            // THROWN, not dropped. Aimed at where the player is standing, with
            // real gravity on it, so it is a projectile you read off its arc.
            const px = ctx.player.x + 12, py = ctx.player.y + 12;
            const dx = px - (h.x + h.w / 2);
            const dy = py - (h.y + h.h / 2);
            const d = Math.max(1, Math.hypot(dx, dy));
            h.mode = 'thrown';
            h.vx = (dx / d) * STRIKE_HAZ.throwSpeed;
            h.vy = (dy / d) * STRIKE_HAZ.throwSpeed - 1.2;   // a lob, not a dart
            h.damage = STRIKE_HAZ.throwDamage;
            h.diesOnHit = true;
            ctx.sfx('shootBig', { pitch: 0.6 });
          } else {
            h.mode = 'swing';
          }
        }
        continue;
      }

      if (h.mode === 'thrown') {
        h.vy += STRIKE_HAZ.throwGravity;
        h.x += h.vx;
        h.y += h.vy;
        // It is spent on the first thing it meets: the floor, a wall, or the
        // player (diesOnHit, resolved by stepArenaHazards).
        if (h.y + h.h >= a.floorY || h.x <= a.x0 || h.x + h.w >= a.x1) {
          a.hazards.splice(i, 1);
          hs.respawn = STRIKE_HAZ.returnFrames;
          ctx.shake(1, 6);
        }
        continue;
      }

      h.x += h.vx;
      if (h.x <= a.x0 + 4) { h.x = a.x0 + 4; h.vx = Math.abs(h.vx); }
      if (h.x + h.w >= a.x1 - 4) { h.x = a.x1 - 4 - h.w; h.vx = -Math.abs(h.vx); }
    }

    // A thrown bag is winched back up. Without this, layer 3 spends its own
    // hazard: throw both and the room is empty for the rest of the fight.
    if (hs.respawn !== undefined && --hs.respawn <= 0) {
      hs.respawn = undefined;
      const rail = a.rails[1] || a.rails[0];
      a.hazards.push({
        kind: 'bag',
        x: a.x0 + 24, y: rail.y + STRIKE_HAZ.drop,
        w: STRIKE_HAZ.w, h: STRIKE_HAZ.h,
        railY: rail.y,
        vx: STRIKE_HAZ.speed,
        damage: 1,
        mode: 'swing',
      });
    }
  };
}

/**
 * STRIKE MAN'S ATTACK — a fighting-game kit, built to the owner's brief of
 * "Fighter Joe from Kirby / Ryu from Street Fighter".
 *
 * L1 "Dashes in on foot and throws a Vulcan Jab — a rapid flurry of
 *     short-range punches off a clear wind-up — finishing on a Rising Break
 *     uppercut that launches. He has nothing at range on this layer, so the
 *     whole fight is spacing."
 * L2 "Adds a guard stance between combos that reflects the first shot it takes.
 *     The Rising Break now chases upward once before he lands, and he will
 *     throw it on its own as an anti-air the moment the player is above him."
 * L3 "Adds a thrown Force Blast when the player keeps their distance, and a
 *     spinning kick that crosses the room. The combo can be cancelled into a
 *     dash mid-string, so he finishes it from the side he did not start on."
 *
 * THE LAYERS CLOSE OFF ESCAPES, THEY DO NOT ADD DAMAGE. Layer 1 has exactly one
 * answer and one counter: stay out of his reach. Layer 2 takes away jumping
 * over him and takes away free chip damage while he is walking. Layer 3 takes
 * away standing at range. Each rung removes a place to be rather than making
 * the same attack hurt more, which is what makes a boss feel like it learned
 * something instead of like it gained a stat.
 *
 * HE MOVES ON FOOT. The `[wip]` text these replaced said "teleports close", and
 * the two characters the owner named do not teleport — they walk you down. A
 * dash you can see coming is also the only version of this that is fair at
 * melee range, because a teleport into a jab flurry cannot be spaced against.
 */
const STRIKE_ATK = {
  walk: { 1: 0.5, 2: 0.6, 3: 0.7 },
  dash: { 1: 1.6, 2: 1.9, 3: 2.2 },
  rest: { 1: [80, 130], 2: [65, 105], 3: [50, 90] },
  reach: 34,               // how close he wants to be before committing
  // VULCAN JAB
  jabWindup: 24,
  jabs: { 1: 4, 2: 5, 3: 6 },
  jabGap: 8,
  jabReach: 26,
  jabDamage: 1,
  // RISING BREAK — the launcher, and from L2 an anti-air in its own right.
  riseWindup: 20,
  riseVy: -4.6,
  riseGrav: 0.3,
  riseDamage: 2,
  riseW: 24,
  riseChase: { 1: 0, 2: 1, 3: 1 },   // extra upward beats before he falls
  // GUARD — L2+. Reflects the first shot it eats, then drops.
  guardFrames: { 1: 0, 2: 70, 3: 55 },
  // FORCE BLAST — L3, thrown when the player will not come close.
  blastWindup: 28,
  blastSpeed: 2.5,
  blastFar: 70,
  // SPINNING KICK — L3. Crosses the room at head height.
  spinWindup: 22,
  spinSpeed: 2.4,
  spinFrames: 80,
  spinDamage: 2,
};

/** Does a box overlap the player's? Local, because a fight sees only its ctx. */
const boxHitsPlayer = (ctx, x, y, w, h) => {
  const p = ctx.playerBox;
  return p.x < x + w && p.x + p.w > x && p.y < y + h && p.y + p.h > y;
};

function strikeAttack(layer) {
  return (ctx) => {
    const b = ctx.boss, p = ctx.player, a = ctx.arena;
    const groundY = (a ? a.floorY : ctx.floorY) - b.h;
    const fs = b.fs || (b.fs = {
      mode: 'stalk', t: rnd(...STRIKE_ATK.rest[layer]), hits: 0, vy: 0, chase: 0,
    });
    const pcx = p.x + 12, bcx = b.x + b.w / 2;
    const toward = Math.sign(pcx - bcx) || 1;
    const gap = Math.abs(pcx - bcx);
    // Above him and close in x — the state that layer 2's anti-air punishes.
    const overhead = (p.y + 24) < b.y + b.h * 0.4 && gap < STRIKE_ATK.reach * 1.4;

    switch (fs.mode) {
      case 'stalk': {
        b.x += toward * STRIKE_ATK.walk[layer];
        b.y = groundY;
        // L2+: he covers himself while walking, so chipping him down from
        // across the room stops being free.
        if (STRIKE_ATK.guardFrames[layer] && fs.guard > 0) fs.guard--;
        if (--fs.t > 0) break;

        if (layer >= 2 && overhead) { fs.mode = 'rise'; fs.t = STRIKE_ATK.riseWindup; break; }
        if (layer >= 3 && gap > STRIKE_ATK.blastFar) {
          fs.mode = Math.random() < 0.5 ? 'blast' : 'spin';
          fs.t = fs.mode === 'blast' ? STRIKE_ATK.blastWindup : STRIKE_ATK.spinWindup;
          fs.dir = toward;
          break;
        }
        fs.mode = 'dash';
        fs.dir = toward;
        break;
      }

      case 'dash': {
        b.x += fs.dir * STRIKE_ATK.dash[layer];
        b.y = groundY;
        if (gap <= STRIKE_ATK.reach || b.x <= ctx.bounds.x0 || b.x + b.w >= ctx.bounds.x1) {
          fs.mode = 'jabWind';
          fs.t = STRIKE_ATK.jabWindup;
        }
        break;
      }

      // THE WIND-UP IS THE FAIRNESS. He plants and telegraphs before the
      // flurry, which is the window to slide out of reach or hit him first.
      case 'jabWind': {
        b.y = groundY;
        if (--fs.t > 0) break;
        fs.mode = 'jab';
        fs.hits = STRIKE_ATK.jabs[layer];
        fs.t = 0;
        fs.dir = toward;
        break;
      }

      case 'jab': {
        b.y = groundY;
        if (--fs.t > 0) break;
        fs.t = STRIKE_ATK.jabGap;
        const hx = fs.dir > 0 ? b.x + b.w : b.x - STRIKE_ATK.jabReach;
        if (boxHitsPlayer(ctx, hx, b.y + b.h * 0.3, STRIKE_ATK.jabReach, b.h * 0.5)) {
          ctx.hurt(bcx, STRIKE_ATK.jabDamage);
        }
        if (--fs.hits > 0) break;
        // L3 can cancel the string into a dash and finish from the other side.
        if (layer >= 3 && Math.random() < 0.4) {
          fs.mode = 'dash';
          fs.dir = -fs.dir;
          fs.t = 0;
          break;
        }
        fs.mode = 'rise';
        fs.t = STRIKE_ATK.riseWindup;
        break;
      }

      case 'rise': {
        if (--fs.t > 0) break;
        fs.mode = 'rising';
        fs.vy = STRIKE_ATK.riseVy;
        fs.chase = STRIKE_ATK.riseChase[layer];
        break;
      }

      case 'rising': {
        b.y += fs.vy;
        fs.vy += STRIKE_ATK.riseGrav;
        // "Chases upward once before he lands" — a second beat of lift if the
        // player is still above him when the first one runs out of steam.
        if (fs.vy > 0 && fs.chase > 0 && overhead) {
          fs.chase--;
          fs.vy = STRIKE_ATK.riseVy * 0.8;
        }
        if (boxHitsPlayer(ctx, b.x - (STRIKE_ATK.riseW - b.w) / 2, b.y - 6,
          STRIKE_ATK.riseW, b.h + 6)) {
          ctx.hurt(bcx, STRIKE_ATK.riseDamage);
        }
        if (b.y >= groundY) {
          b.y = groundY;
          fs.mode = 'stalk';
          fs.t = rnd(...STRIKE_ATK.rest[layer]);
          fs.guard = STRIKE_ATK.guardFrames[layer];
        }
        break;
      }

      case 'blast': {
        b.y = groundY;
        if (--fs.t > 0) break;
        const v = aimAt(bcx, b.y + b.h * 0.45, p.x + 12, p.y + 12);
        ctx.shoot({
          x: bcx, y: b.y + b.h * 0.45,
          vx: v.x * STRIKE_ATK.blastSpeed, vy: v.y * STRIKE_ATK.blastSpeed,
          radius: 4, damage: 2, color: b.primary, shape: 'spark', life: 240,
        });
        fs.mode = 'stalk';
        fs.t = rnd(...STRIKE_ATK.rest[layer]);
        fs.guard = STRIKE_ATK.guardFrames[layer];
        break;
      }

      case 'spin': {
        b.y = groundY;
        if (--fs.t > 0) break;
        fs.mode = 'spinning';
        fs.t = STRIKE_ATK.spinFrames;
        break;
      }

      case 'spinning': {
        b.x += fs.dir * STRIKE_ATK.spinSpeed;
        // Head height, so it cannot simply be jumped — it has to be slid under
        // or stepped around at a wall.
        b.y = groundY - 6;
        if (b.x <= ctx.bounds.x0) { b.x = ctx.bounds.x0; fs.dir = 1; }
        if (b.x + b.w >= ctx.bounds.x1) { b.x = ctx.bounds.x1 - b.w; fs.dir = -1; }
        if (boxHitsPlayer(ctx, b.x - 3, b.y, b.w + 6, b.h)) {
          ctx.hurt(bcx, STRIKE_ATK.spinDamage);
        }
        if (--fs.t > 0) break;
        b.y = groundY;
        fs.mode = 'stalk';
        fs.t = rnd(...STRIKE_ATK.rest[layer]);
        fs.guard = STRIKE_ATK.guardFrames[layer];
        break;
      }
    }

    // THE GUARD IS READ BY THE BULLET LOOP, not applied here. `b.guard` above
    // zero is what makes the next player shot reflect instead of land — see
    // stepBullets, which zeroes it on the reflect.
    //
    // That zero is how the spend travels BACK: the bullet loop cannot see `fs`,
    // so the stance notices its published copy went missing and drops itself.
    // Without this the next frame would republish the stance and the guard
    // would reflect forever.
    if (fs.guard > 0 && b.guard === 0) fs.guard = 0;
    b.guard = fs.guard > 0 ? fs.guard : 0;
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

  torrent: {
    attack: {
      1: { step: tempestAttack(1) }, 2: { step: tempestAttack(2) }, 3: { step: tempestAttack(3) },
    },
    hazard: {
      1: { step: tempestHazard(1) }, 2: { step: tempestHazard(2) }, 3: { step: tempestHazard(3) },
    },
  },

  volt: {
    attack: { 1: { step: voltAttack(1) }, 2: { step: voltAttack(2) }, 3: { step: voltAttack(3) } },
    hazard: { 1: { step: voltHazard(1) }, 2: { step: voltHazard(2) }, 3: { step: voltHazard(3) } },
  },

  // STRIKE MAN — all three attack layers and all three hazard layers built.
  strike: {
    attack: {
      1: { step: strikeAttack(1) }, 2: { step: strikeAttack(2) }, 3: { step: strikeAttack(3) },
    },
    hazard: {
      1: { step: strikeHazard(1) }, 2: { step: strikeHazard(2) }, 3: { step: strikeHazard(3) },
    },
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

/**
 * Does this boss actually FIGHT, or is he a rectangle you shoot at?
 *
 * Twelve of the seventeen have no attack loop written. Standing still while
 * the player empties a clip into you is not an easy fight, it is NO fight, and
 * a playtester who walks through that door has spent a minute of their session
 * on content that cannot tell them anything. `PLAYABLE_BOSSES` in bosses.js is
 * what keeps them out of a shipped run.
 *
 * LAYER 1 IS THE RIGHT QUESTION, not "any layer". `fightFor` falls back
 * downward, so a boss with a layer-1 attack has one at every layer — checking
 * the floor is therefore checking all three, and it is also the layer of a
 * first encounter, which is the one a new save will actually meet.
 *
 * Derived, never listed. The day a boss gains an attack loop he appears in a
 * playtester's bag with no edit here or anywhere else.
 */
export const hasFight = (bossId) => !!fightFor(bossId, 1).attack;
