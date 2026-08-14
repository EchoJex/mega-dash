/**
 * DEV MODE — playtest perks, and the branch of the game they live on.
 *
 * TWO SWITCHES, NOT ONE, AND THEY MEAN DIFFERENT THINGS.
 *
 *   `available`  compile-time. Is the dev branch in this build AT ALL? Set it
 *                false to ship: the launch dialog disappears, the dev menu
 *                disappears, `enabled` can never become true, and every perk
 *                below is dead code the moment the bundler can see it.
 *   `enabled`    the choice a person made at launch. The game now opens on a
 *                LAUNCH DIALOG — DEV MODE or PLAYTESTER — and that answer sets
 *                this for the session. It is never persisted: picking is one
 *                tap and a stale answer is a whole playtest misread.
 *
 * The split exists because "clean of any dev mode code" became a thing the
 * owner wanted to be able to CHOOSE, not a thing that needed a rebuild. A
 * playtester launch has to be indistinguishable from the shipped game, and the
 * only honest way to check that is to be able to launch into it.
 *
 * The guiding rule for the perks themselves is unchanged: every interaction
 * still HAPPENS. You still get hit, still flinch, still take knockback, still
 * burn your invulnerability frames, still get thrown out of a pit. The only
 * thing dev mode changes is that the run does not end, so a session can reach
 * the interesting part without replaying the first two minutes each time.
 *
 * WHERE THE CONTROLS LIVE: the DEV MENU, on the title screen, and nowhere else.
 * There is no dev panel in the pause menu and no boss picker in it either —
 * both moved out. A dev tool reachable by a thumb mid-fight is a dev tool that
 * gets pressed mid-fight, and the pause menu a playtester sees should be the
 * pause menu the game ships with.
 *
 * The HUD shows a DEV marker whenever this is on, because a playtest misread as
 * "balanced" while unkillable is worse than no playtest at all.
 */

const KEY = 'megadash_dev_v1';

export const DEV = {
  /**
   * COMPILE-TIME. The ship switch — set false and the whole dev branch goes,
   * launch dialog included. `enabled` cannot be turned on without it.
   */
  available: true,

  /**
   * THE LAUNCH CHOICE. False until someone picks DEV MODE on the launch dialog.
   * Deliberately not persisted — see the header.
   */
  enabled: false,

  // ── Perks. Every one is a live toggle in the dev menu. ──

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
   * Every weapon unlocked from the first frame of a run, at `startLevel`.
   *
   * That level defaults to 1 on purpose: the point is to have all eighteen
   * available to slot and compare, not to skip the ladder. A weapon handed over
   * at its top rung teaches you nothing about whether the rungs below it are
   * worth climbing. The dial is there for when a specific rung IS the thing
   * being tested.
   *
   * THE ONE THING THIS HIDES: a boss only grants a weapon it has not already
   * given you, so with everything unlocked no boss ever fires the acquire
   * banner or the slot-choice picker. Switch it off to test that sequence.
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
   * The cost is that it cannot tell you how ranks 0-2 FEEL. Set `offRank` /
   * `defRank` to a number when that is what you are testing; they win over this.
   */
  maxMastery: true,

  /**
   * The boss picker in the DEV MENU, which starts a run with that boss's door a
   * short walk ahead. Element-slice development means fighting one boss over
   * and over; waiting out a 60-second timer and a shuffle bag to reach him is
   * the single biggest tax on that loop.
   */
  bossSelect: true,

  /**
   * Boss layers WRAP instead of clamping: the 4th encounter is the 1st again
   * (4=1, 5=2, 6=3). Shipped behaviour clamps at 3 forever, which is correct
   * for players and useless for testing, because layers 1 and 2 become
   * unreachable the moment you have beaten a boss three times.
   */
  cycleLayers: true,

  /**
   * THE BOSS-DEFEAT RE-QUIP WINDOW, HANDED TO YOU AT RUN START.
   *
   * Dev mode does not bypass `canRequip` — a loadout change is an event you
   * earn, and a playtest that could re-quip at will was never testing the thing
   * being designed. That leaves the arsenal unreachable until the first boss
   * falls, which is exactly the wrong order for a session that wants to test a
   * weapon against a fight.
   *
   * So the run OPENS on the real post-boss wheel: the same control, the same
   * window, the same rules, just granted rather than earned. Set the loadout,
   * tap away, walk. It shuts on the first arena warp like any other window.
   *
   * This is also the answer to re-quipping mid-run: abort the run, and the next
   * one opens on the wheel again.
   */
  requipAtStart: true,

  /**
   * The diagnostic line under the HUD — build, seed, render density — and
   * nothing else. The [DEV] marker beside the score is NOT this: that one is on
   * whenever dev mode is, because a playtest note that does not say it came
   * from a dev build is a playtest note that gets misread.
   */
  debugHud: true,

  // ── Live dials. Not perks: these hold VALUES. ──

  /**
   * The layer every boss fights at, or 0 for "whatever the save says".
   *
   * An override rather than a save edit on purpose. Writing clears into
   * `save.bossKills` to reach layer 3 would permanently raise the shipped
   * layer of a boss on this device, and there would be no way back down to
   * layer 1 without a full reset.
   */
  nextLayer: 0,

  /** What level `startUnlocked` hands the arsenal over at. */
  startLevel: 1,

  /**
   * Loadout Mastery ranks to start a run at, or null for `maxMastery`'s answer.
   *
   * Separate from `maxMastery` because that switch is all-or-nothing and the
   * ranks below 3 are exactly the ones it cannot show you.
   */
  offRank: null,
  defRank: null,

  /** Boss id the next run's first door leads to, or null for the shuffle bag. */
  startBoss: null,
};

/**
 * Everything the dev menu can change, and therefore everything worth keeping
 * across a reload. `enabled` is deliberately absent — the launch dialog asks
 * every time. `startBoss` is absent too: it is one run's intent, not a setting.
 */
const PERSISTED = [
  'hpFloor', 'unlockAnyWeapon', 'cardsFromAllWeapons', 'startUnlocked',
  'maxMastery', 'bossSelect', 'cycleLayers', 'requipAtStart', 'debugHud',
  'nextLayer', 'startLevel', 'offRank', 'defRank',
];

/**
 * Dev settings persist in their own localStorage key, NOT in the save.
 *
 * The APK updater reloads the app on every build, and re-setting a dozen
 * toggles per build is friction that ends with them not being used. Keeping
 * them out of `megadash_save_v1` means a playtester's save has no dev residue
 * in it and can never be shaped by a setting they cannot see. `fullReset`
 * clears all of localStorage, so this goes with everything else.
 */
export function loadDevSettings() {
  if (!DEV.available) return;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const k of PERSISTED) if (k in saved) DEV[k] = saved[k];
  } catch { /* corrupt or unavailable — the defaults above are fine */ }
}

export function saveDevSettings() {
  if (!DEV.available) return;
  try {
    const out = {};
    for (const k of PERSISTED) out[k] = DEV[k];
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch { /* private browsing / quota — settings just do not survive */ }
}

/**
 * The launch dialog's answer. Refuses to turn dev mode on in a build that does
 * not have it, so `available: false` really is the one switch that ships.
 */
export function setDevMode(on) {
  DEV.enabled = !!on && DEV.available;
  DEV.startBoss = null;
  return DEV.enabled;
}

/** True only when dev mode is on AND that specific perk is enabled. */
export const dev = (perk) => DEV.enabled && DEV[perk] === true;

/**
 * The layer a boss actually fights at, given the one his clears earn him.
 *
 * Every caller of `bossLayer` goes through here so the menu's override lands
 * in one place. Outside dev mode it is the identity function.
 */
export const layerFor = (earned) =>
  (DEV.enabled && DEV.nextLayer ? DEV.nextLayer : earned);
