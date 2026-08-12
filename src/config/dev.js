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

  /**
   * Every weapon unlocked at level 1 from the first frame of a run.
   *
   * Level 1 and not level 10 on purpose: the point is to have all eighteen
   * available to slot and compare, not to skip the ladder. A weapon handed over
   * at its top rung teaches you nothing about whether the rungs below it are
   * worth climbing, and every ladder's shape is still being written.
   *
   * THE ONE THING THIS HIDES: a boss only grants a weapon it has not already
   * given you, so with everything unlocked no boss ever fires the acquire
   * banner or the slot-choice picker. Switch this off to test that sequence.
   */
  startUnlocked: true,

  /**
   * Both Loadout Mastery ranks at 3: four slots, all of them live, and the
   * sidearm free to trade away.
   *
   * This one is a real bypass of meta progression rather than a shortcut around
   * grind, and it is here because the alternative is worse. Every weapon in the
   * game is reached through the loadout, so a rank-0 playtest can only ever see
   * one weapon at a time — the slice loop would be gated behind a Chip grind
   * that has nothing to do with the slice being built.
   *
   * The cost is that dev mode cannot tell you how ranks 0-2 FEEL. Switch this
   * off when balancing the ladder itself.
   */
  maxMastery: true,

  /**
   * A boss picker in the pause menu that drops you just outside any boss's
   * door. Element-slice development means fighting one boss over and over;
   * waiting out a 60-second door timer and a shuffle bag to reach him is the
   * single biggest tax on that loop.
   */
  bossSelect: true,

  /**
   * A WEAPONS +1 LV button in the pause menu.
   *
   * A ladder is the hardest thing in the game to reach on purpose: levels come
   * from EXP you have to walk over, so seeing what a Lv10 rung does meant
   * playing most of a run to get there. In the pause menu rather than on the
   * HUD or the wheel — it must never be reachable by a thumb mid-fight, and the
   * re-quip wheel is a shipping control that dev tools should stay out of.
   */
  levelButton: true,

  /**
   * Boss layers WRAP instead of clamping: the 4th encounter is the 1st again
   * (4=1, 5=2, 6=3). Shipped behaviour clamps at 3 forever, which is correct
   * for players and useless for testing, because layers 1 and 2 become
   * unreachable the moment you have beaten a boss three times.
   */
  cycleLayers: true,
};

/** True only when dev mode is on AND that specific perk is enabled. */
export const dev = (perk) => DEV.enabled && DEV[perk] === true;
