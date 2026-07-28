/**
 * DEV MODE — playtest perks. All of this comes out late in development.
 *
 * The game logic around these is written as if they do not exist: weapons are
 * genuinely gated behind boss kills, spikes genuinely kill, energy genuinely
 * runs out. These flags only bypass those rules so a session can reach the
 * interesting part without replaying the first two minutes each time.
 *
 * TO SHIP: set `enabled: false`. That is the single switch — every perk routes
 * through `dev()`, so one edit disables the lot and nothing else needs touching.
 * Delete the file and its imports when the game is done with it.
 *
 * The HUD shows a DEV marker whenever this is on, because a playtest you
 * misread as "balanced" while invincible is worse than no playtest at all.
 */

export const DEV = {
  enabled: true,

  /** Damage is ignored entirely — energy never drops. */
  unlimitedHp: true,

  /** Spikes stop being instant death. */
  spikeImmunity: true,

  /**
   * Falling into a pit respawns you on the nearest ground instead of ending the
   * run. Not asked for explicitly, but with unlimited HP and spike immunity on,
   * a pit is the ONLY remaining way to die — so one mistimed jump still throws
   * away a playtest. Set false if you want pits lethal while testing platforming.
   */
  pitImmunity: true,

  /** Tapping a padlocked slot on the re-quip wheel equips it anyway. */
  unlockAnyWeapon: true,

  /** Level-up cards may offer weapons you have not unlocked yet. */
  cardsFromAllWeapons: true,
};

/** True only when dev mode is on AND that specific perk is enabled. */
export const dev = (perk) => DEV.enabled && DEV[perk] === true;
