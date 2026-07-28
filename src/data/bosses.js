/**
 * BOSSES - 17 robot masters, one per element.
 *
 * PALETTE RULE (NES constraint): every sprite gets exactly 3 colours plus
 * transparency - primary, secondary, and a shared near-black outline. The
 * outline is what stops dark bosses (Eclipse) dissolving into the dark
 * background, and it is why sprites read as objects in front of a scene.
 *
 * The 17 primaries were optimised so the MINIMUM perceptual distance (CIELAB
 * dE) between any two is ~27.7 - comfortably distinguishable at a glance -
 * while each still reads as its element. Do not hand-edit one primary in
 * isolation; re-run the spacing optimisation so the whole set stays separated.
 *
 * Secondaries are accent-only and may repeat freely.
 *
 * `baseHp` was doubled so a fight lasts long enough for its attack pattern to
 * actually play out. Still a placeholder — real tuning is late-phase.
 *
 * `scale` is height relative to the player (24px), averaging 1.75x with
 * roughly +/-0.3 for bulky vs petite builds.
 *
 * `silhouette` is deliberately null everywhere. Silhouette design follows from
 * attack and arena design, which is not done yet, so bosses render as
 * placeholder rectangles (see systems/assets.js). Filling these in early would
 * mean designing blind and redoing it.
 *
 * Source of truth: design/boss-design-tracker.html - read it before
 * implementing any boss.
 */

export const BOSSES = [
  {
    id: 'core', name: 'CORE MAN', element: 'Typeless',
    primary: '#687380', secondary: '#2E3338', outline: '#0A0A12',
    scale: 1.7, baseHp: 60,
    attackName: 'Core Pulse', dropWeapon: 'core_blaster',
    silhouette: null,
  },
  {
    id: 'blaze', name: 'BLAZE MAN', element: 'Fire',
    primary: '#E11416', secondary: '#141414', outline: '#0A0A12',
    scale: 1.75, baseHp: 64,
    attackName: 'Inferno Wheel', dropWeapon: 'blaze_wheel',
    silhouette: null,
  },
  {
    // renamed in the tracker; the id stays 'torrent' so save.bossKills survives
    id: 'torrent', name: 'TEMPEST MAN', element: 'Water',
    primary: '#145DBD', secondary: '#C09060', outline: '#0A0A12',
    scale: 1.75, baseHp: 64,
    attackName: 'Aqua Torrent', dropWeapon: 'torrent_cannon',
    silhouette: null,
  },
  {
    id: 'volt', name: 'VOLT MAN', element: 'Electric',
    primary: '#F5D328', secondary: '#5B21B6', outline: '#0A0A12',
    scale: 1.65, baseHp: 60,
    attackName: 'Chain Spark', dropWeapon: 'volt_spark',
    silhouette: null,
  },
  {
    id: 'thorn', name: 'THORN MAN', element: 'Grass',
    primary: '#2AAB1C', secondary: '#5C4033', outline: '#0A0A12',
    scale: 1.8, baseHp: 68,
    attackName: 'Vine Lash', dropWeapon: 'thorn_lash',
    silhouette: null,
  },
  {
    id: 'frost', name: 'FROST MAN', element: 'Ice',
    primary: '#A0EFE7', secondary: '#FFFFFF', outline: '#0A0A12',
    scale: 1.85, baseHp: 68,
    attackName: 'Glacier Spike', dropWeapon: 'frost_guard',
    silhouette: null,
  },
  {
    id: 'strike', name: 'STRIKE MAN', element: 'Fighting',
    primary: '#EA6A34', secondary: '#7C2D12', outline: '#0A0A12',
    scale: 1.85, baseHp: 72,
    attackName: 'Rush Combo', dropWeapon: 'strike_gauntlet',
    silhouette: null,
  },
  {
    id: 'venom', name: 'VENOM MAN', element: 'Poison',
    primary: '#A926D9', secondary: '#84CC16', outline: '#0A0A12',
    scale: 1.7, baseHp: 60,
    attackName: 'Toxic Cloud', dropWeapon: 'venom_spray',
    silhouette: null,
  },
  {
    id: 'quake', name: 'QUAKE MAN', element: 'Ground',
    primary: '#A76625', secondary: '#EA580C', outline: '#0A0A12',
    scale: 1.95, baseHp: 76,
    attackName: 'Seismic Stomp', dropWeapon: 'quake_hammer',
    silhouette: null,
  },
  {
    id: 'gale', name: 'GALE MAN', element: 'Flying',
    primary: '#5CADD5', secondary: '#F8FAFC', outline: '#0A0A12',
    scale: 1.5, baseHp: 56,
    attackName: 'Wind Vortex', dropWeapon: 'gale_vortex',
    silhouette: null,
  },
  {
    id: 'psi', name: 'PSI MAN', element: 'Psychic',
    primary: '#EA43BD', secondary: '#F9A8D4', outline: '#0A0A12',
    scale: 1.55, baseHp: 60,
    attackName: 'Mind Lift', dropWeapon: 'psi_orb',
    silhouette: null,
  },
  {
    id: 'swarm', name: 'SWARM MAN', element: 'Bug',
    primary: '#B8DC28', secondary: '#4D5C1A', outline: '#0A0A12',
    scale: 1.6, baseHp: 60,
    attackName: 'Infestation', dropWeapon: 'swarm_caller',
    silhouette: null,
  },
  {
    id: 'granite', name: 'GRANITE MAN', element: 'Rock',
    primary: '#5F443A', secondary: '#A8A296', outline: '#0A0A12',
    scale: 2.0, baseHp: 80,
    attackName: 'Boulder Roll', dropWeapon: 'rock_buster',
    silhouette: null,
  },
  {
    id: 'wraith', name: 'WRAITH MAN', element: 'Ghost',
    primary: '#A68DD8', secondary: '#2A1F4A', outline: '#0A0A12',
    scale: 1.6, baseHp: 56,
    attackName: 'Spectral Shift', dropWeapon: 'wraith_cloak',
    silhouette: null,
  },
  {
    id: 'drake', name: 'DRAKE MAN', element: 'Dragon',
    primary: '#C3225D', secondary: '#6B1220', outline: '#0A0A12',
    scale: 1.9, baseHp: 76,
    attackName: 'Dragon Breath', dropWeapon: 'drake_breath',
    silhouette: null,
  },
  {
    id: 'eclipse', name: 'ECLIPSE MAN', element: 'Dark',
    primary: '#2A273F', secondary: '#DC2626', outline: '#0A0A12',
    scale: 1.75, baseHp: 68,
    attackName: 'Shadow Bind', dropWeapon: 'eclipse_blade',
    silhouette: null,
  },
  {
    id: 'alloy', name: 'ALLOY MAN', element: 'Steel',
    primary: '#B2BABD', secondary: '#4B5563', outline: '#0A0A12',
    scale: 1.9, baseHp: 76,
    attackName: 'Metal Barrage', dropWeapon: 'alloy_blade',
    silhouette: null,
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

/** Shared near-black used as the third colour on every sprite. */
export const OUTLINE = '#0A0A12';

/**
 * Encounter order: a shuffle bag. No boss repeats until all 17 have been seen
 * in the current run, then the bag reshuffles.
 */
export function makeBossBag() {
  let bag = [];
  return function next() {
    if (bag.length === 0) bag = [...BOSSES].sort(() => Math.random() - 0.5);
    return bag.shift();
  };
}

/**
 * LAYER - meta progression, persists across runs.
 *
 * A boss fights harder the more times you have beaten it *ever*, not within a
 * single run. 0 lifetime clears = layer 1, 1 = layer 2, 2+ = layer 3.
 *
 * Layers 2 and 3 currently resolve to the same (empty) behaviour because that
 * content is not written for most bosses yet. The escalation plumbing is live
 * and ready - see the tracker for which bosses have layer 2/3 defined.
 *
 * Hazards and attacks are ALWAYS layer-synced: a layer-2 boss uses layer-2
 * arena hazards and layer-2 attacks together.
 */
export function bossLayer(save, id) {
  const clears = (save.bossKills && save.bossKills[id]) || 0;
  return Math.max(1, Math.min(3, clears + 1));
}
