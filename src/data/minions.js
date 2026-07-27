/**
 * MINIONS — the two ordinary enemy archetypes.
 *
 * Bosses are events; minions are weather. There are deliberately only two, one
 * per plane of movement, because the interesting variable in this game is the
 * difficulty RAMP and the boss fight — not enemy variety. More archetypes can
 * land later without changing anything here.
 *
 * PALETTE: the same 3-colour NES rule as bosses (primary, secondary, shared
 * near-black outline). But the two primaries are deliberately LOW CHROMA and
 * kept well away from all 17 boss primaries. A minion must never be mistaken
 * for a boss at a glance, and the boss must stay the most saturated thing on
 * screen. tests/data.test.js asserts the separation.
 *
 * Collision box is the whole rectangle here. Unlike the player there is no
 * sprite-vs-hitbox split, because a minion never changes silhouette.
 */

export const MINIONS = [
  {
    id: 'scrapper', name: 'SCRAPPER', kind: 'ground',
    primary: '#788850', secondary: '#2E3520', outline: '#0A0A12',
    w: 14, h: 14,
    hp: 3,
    speed: 0.45,
    // Walks its span and turns at the edge rather than marching into a pit.
    // A minion that suicides into a hole is free score and teaches nothing.
    turnsAtLedge: true,
  },
  {
    id: 'drifter', name: 'DRIFTER', kind: 'air',
    primary: '#309888', secondary: '#10332E', outline: '#0A0A12',
    w: 12, h: 12,
    hp: 2,
    speed: 0.72,          // drifts leftward faster than the player walks right
    trackStrength: 0.02,  // how hard it corrects toward the player's altitude
    trackMax: 0.5,        // ...and the cap, so it arcs instead of snapping
    bobAmp: 0.35,
    bobRate: 0.08,
  },
];

export const MINION_BY_ID = Object.fromEntries(MINIONS.map((m) => [m.id, m]));

/**
 * Elites reuse their base palette but swap the outline for UI gold. The
 * silhouette is already bigger; the rim is what makes "this one is dangerous"
 * legible at a glance against a dark background, and it costs no fourth colour
 * on the sprite itself.
 */
export const ELITE_OUTLINE = '#F5D328';
