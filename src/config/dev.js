/**
 * DEV MODE — playtest perks. All of this comes out late in development.
 *
 * The guiding rule: every interaction still HAPPENS. You still get hit, still
 * flinch, still take knockback, still burn your invulnerability frames, still
 * get thrown out of a pit. The only thing dev mode changes is that the run does
 * not end, so a session can reach the interesting part without replaying the
 * first two minutes each time.
 *
 * That matters more than blanket invincibility would: a playtest where damage
 * silently does nothing teaches you nothing about whether an attack is fair.
 *
 * TO SHIP: set `enabled: false`. That is the single switch — every perk routes
 * through `dev()`, so one edit disables the lot. Delete the file and its imports
 * when the game is done with it.
 *
 * The HUD shows a DEV marker whenever this is on, because a playtest misread as
 * "balanced" while unkillable is worse than no playtest at all.
 */

export const DEV = {
  enabled: true,

  /**
   * Damage lands in full — knockback, flinch, i-frames, the lot — but current
   * HP is floored at 1 instead of reaching 0. You feel every hit and survive.
   */
  hpFloor: true,

  /** Tapping a padlocked slot on the re-quip wheel equips it anyway. */
  unlockAnyWeapon: true,

  /** Level-up cards may offer weapons you have not unlocked yet. */
  cardsFromAllWeapons: true,
};

/** True only when dev mode is on AND that specific perk is enabled. */
export const dev = (perk) => DEV.enabled && DEV[perk] === true;
