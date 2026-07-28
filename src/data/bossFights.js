/**
 * BOSS FIGHTS — the two concurrent danger sources, per boss, per layer.
 *
 * Every boss runs TWO loops at once and they are ALWAYS layer-synced: a layer-2
 * boss uses layer-2 hazards *and* layer-2 attacks. See CLAUDE.md; this is not a
 * detail to collapse into one system.
 *
 *   hazard[n]  the ambient ARENA loop — fires on its own timer, elementally
 *              themed, and keeps running no matter what the boss is doing
 *   attack[n]  the boss's own state machine — what it personally does to you
 *
 * A `null` layer means the design tracker has not defined it yet. That is a
 * deliberate hole, not an oversight: `design/boss-design-tracker.html` is the
 * source of truth and inventing content it marks missing would mean designing
 * blind. Read the tracker before filling any of these in.
 *
 * Each entry is:
 *   cooldown   [minFrames, maxFrames] — semi-variable so patterns stay readable
 *              without becoming metronomic
 *   run(ctx)   performs one activation. ctx gives { boss, player, layer, shoot }
 */

/** Small helper: aim a unit vector from a source at the player's centre. */
export function aimAt(sx, sy, px, py) {
  const dx = px - sx, dy = py - sy;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

export const FIGHTS = {
  // ── CORE MAN — Typeless ───────────────────────────────────────────
  core: {
    attack: {
      // "Fires a slow energy orb that splits into 3 smaller orbs with mild
      //  auto-aim after a short time, dealing small damage. Short
      //  semi-variable cooldown."
      1: {
        cooldown: [70, 110],
        run: ({ boss, player, shoot }) => {
          const sx = boss.x + boss.w / 2, sy = boss.y + boss.h / 2;
          const a = aimAt(sx, sy, player.x + 12, player.y + 12);
          shoot({
            x: sx, y: sy,
            vx: a.x * 1.1, vy: a.y * 1.1,
            radius: 4, damage: 1, color: boss.primary, shape: 'orb',
            // splits into 3 mildly homing fragments
            splitIn: 42, splitCount: 3, splitSpeed: 1.5,
            splitHoming: 0.014, splitRadius: 2.5,
          });
        },
      },
      2: null, // tracker: Attack L2 not yet defined
      3: null, // tracker: Attack L3 not yet defined
    },
    hazard: {
      // "Plain light grey room with a couple of small ceiling turrets."
      // L1: turrets aim to nearest 45°, simultaneous 3-bullet bursts, 20s cd.
      // L2: same turrets, nearest 22.5°, slightly reduced cooldown.
      // Both need a bounded ARENA with a ceiling to mount turrets on, which
      // does not exist yet — see the arena question in CLAUDE.md's phase notes.
      1: null,
      2: null,
      3: null, // tracker: "Not yet defined."
    },
  },

  // ── BLAZE MAN — Fire ──────────────────────────────────────────────
  // Fully designed in the tracker across all three layers, but every layer
  // depends on systems that do not exist yet: the Hot status effect, a bounded
  // arena with walls for fireballs to climb, phasing platforms, and a floor
  // that can flood with lava. Left null rather than half-built.
  blaze: {
    attack: { 1: null, 2: null, 3: null },
    hazard: { 1: null, 2: null, 3: null },
  },

  // ── TORRENT MAN — Water ───────────────────────────────────────────
  // Attack L1 is designed; the arena, all three hazard layers, and attacks
  // L2/L3 are blank in the tracker.
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
  // fights at the hardest layer that is actually written, rather than idling.
  const pick = (table) => {
    for (let l = layer; l >= 1; l--) if (table[l]) return table[l];
    return null;
  };
  return { attack: pick(f.attack), hazard: pick(f.hazard) };
};
