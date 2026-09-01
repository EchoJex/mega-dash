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
 * while each still reads as its element.
 *
 * THE OPTIMISATION IS PAUSED until the game is far closer to finished — the
 * owner's call, and the reason is that re-running it on every edit turns each
 * palette into a seventeen-way negotiation before there is any art to judge the
 * result against. A primary may be changed on its own now and the set is allowed
 * to drift; the spacing pass comes back LATE, with balance and the physics
 * overlay. Do not re-tighten it early.
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
 * Source of truth: design/TRACKER.md - read it before implementing any boss.
 * The palette hexes and scale here are checked against it by tests/data.test.js
 * via design/boss-data.json, so the two cannot drift apart.
 */

import { hasFight } from '../systems/bossFights.js';

export const BOSSES = [
  {
    // Renamed in the tracker from CORE MAN; the id stays 'core' so
    // save.bossKills and every layer already earned survive the rename.
    //
    // He is the only boss SMALLER than the player, at 0.8x rather than the
    // 1.75x average — a prototype chassis, and the tracker's own word for it.
    // Nothing in the code assumes a boss is large, but be aware when tuning:
    // his collision footprint is 19x14, so a spread that reads as generous
    // against Blaze Man can miss him entirely.
    id: 'core', name: 'PROTO MK0', element: 'Typeless',
    primary: '#687380', secondary: '#2E3338', outline: '#0A0A12',
    scale: 0.8, baseHp: 60,
    attackName: 'Ballistic barrage', dropWeapon: 'core_blaster',
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
    /**
     * "Blue yellow guy with a large grey hydro jet pack."
     *
     * The grey is NOT in the palette, and cannot be: the NES rule is exactly
     * three colours plus transparency, and blue, yellow and the shared outline
     * spend all three. The jetpack is a SEPARATE OBJECT attached to his back —
     * the same pattern as the weapon hardware drawn on the player — so it
     * carries its own greys without costing him a palette slot. See
     * `rig: 'jetpack'` below and drawBossRig in systems/assets.js.
     */
    primary: '#145DBD', secondary: '#F5C518', outline: '#0A0A12',
    // 1.5x — "below average build", down from the 1.75x average. The tracker's
    // `scale` field is the source of truth and it moved; a boss's footprint is
    // what every attack of his is spaced against, so this is a real change to
    // how his fight reads, not a cosmetic one.
    scale: 1.5, baseHp: 64,
    attackName: 'Aqua Torrent', dropWeapon: 'torrent_cannon',
    // Hardware bolted on rather than painted in — drawn whether or not he is
    // currently thrusting, because a pack you only see mid-dive is not a pack.
    rig: 'jetpack',
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
    // "1.95x player height (sumo bulk build)" — the largest in the roster, and
    // the one boss whose whole kit is closing distance on foot. Size is the
    // read: a fighter you can outrun has to LOOK like something you cannot
    // stand in front of.
    scale: 1.95, baseHp: 72,
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
 * THE BOSSES A SHIPPED RUN MAY SEND YOU TO — derived, never listed.
 *
 * A playtester must only meet content that has had some development. Twelve of
 * the seventeen have no attack loop written and would stand still while you
 * shot them; walking through that door costs a minute of a playtest session and
 * teaches nothing, and worse, it reads as a broken fight rather than as an
 * unbuilt one. Dev mode still sees all seventeen — testing the unbuilt is what
 * dev mode is FOR.
 *
 * `hasFight` is read from `systems/bossFights.js` rather than kept as a list here,
 * so a boss joins this roster on the day his attack loop lands and nobody has
 * to remember to add him. The same derivation the sim's catalogue uses.
 */
export const PLAYABLE_BOSSES = () => BOSSES.filter((b) => hasFight(b.id));

/**
 * Encounter order: a shuffle bag. No boss repeats until every boss in the pool
 * has been seen in the current run, then the bag reshuffles.
 *
 * The pool is a parameter rather than a constant because WHICH bosses may turn
 * up is a policy question — dev mode wants all seventeen, a playtester wants
 * only the ones that fight — and the caller is the only thing that knows which
 * launch this is. An empty pool falls back to the full roster: a run with no
 * doors at all is a worse failure than a run with an unfinished boss in it.
 */
export function makeBossBag(pool = BOSSES) {
  const roster = pool.length ? pool : BOSSES;
  let bag = [];
  return function next() {
    if (bag.length === 0) bag = [...roster].sort(() => Math.random() - 0.5);
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
export function bossLayer(save, id, cycle = false) {
  const clears = (save.bossKills && save.bossKills[id]) || 0;
  // SHIPPED BEHAVIOUR: layers only ever go up, then stay at 3. A boss you have
  // beaten five times must not become easy again — that would undo the meta
  // progression the layer system exists to provide.
  if (!cycle) return Math.max(1, Math.min(3, clears + 1));

  // DEV ONLY: wrap instead of clamping, so the 4th encounter is the 1st again
  // (4=1, 5=2, 6=3, ...). Playtesting a layer means fighting it repeatedly, and
  // a save stuck at layer 3 makes layers 1 and 2 unreachable without a wipe.
  return (clears % 3) + 1;
}
