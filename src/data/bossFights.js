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
 * ctx = { boss, player, layer, shoot, bounds }
 *   bounds  the walkable span — the sealed arena's inner walls during a fight,
 *           the camera view otherwise. Never read the camera directly.
 *
 * SOURCE OF TRUTH: design/boss-design-tracker.json (exported from the HTML
 * tracker). Do NOT read the `const BOSSES` array inside the HTML — it is stale.
 * A `null` layer means the tracker has not defined it; inventing content there
 * would mean designing blind.
 */

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

export const FIGHTS = {
  core: {
    attack: { 1: { step: coreAttack(1) }, 2: { step: coreAttack(2) }, 3: { step: coreAttack(3) } },
    // Ceiling turrets firing 3-bullet bursts, aiming to the nearest 45 / 22.5 /
    // 11.25 degrees. Fully designed, but needs a sealed arena with a CEILING to
    // mount them on — nothing to attach to in the scrolling world.
    hazard: { 1: null, 2: null, 3: null },
  },

  // BLAZE MAN — fully designed across all layers, but every layer needs the Hot
  // and Burn attributes, an arena with walls for fireballs to climb, phasing
  // platforms, and a floodable floor. None of those exist yet.
  blaze: {
    attack: { 1: null, 2: null, 3: null },
    hazard: { 1: null, 2: null, 3: null },
  },

  // TEMPEST MAN — attack L1 and hazards L1/L2 are designed, but all of it is
  // built on arena geometry that does not exist: corner portholes, a central
  // grate/drain, knee-deep floor water with inward currents, and directional
  // rain force. Hazard L3 and attacks L2/L3 are still blank in the tracker.
  torrent: {
    attack: { 1: null, 2: null, 3: null },
    hazard: { 1: null, 2: null, 3: null },
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
