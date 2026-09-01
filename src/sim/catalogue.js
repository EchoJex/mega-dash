/**
 * WHAT CAN ACTUALLY BE SIMULATED TODAY — read from live code, never a list.
 *
 * Most of this game is `[wip]` in the tracker: 12 of the 17 bosses have no
 * fight built, and 6 weapons have no ladder. A sweep that quietly included them
 * would put a confident difficulty number next to content that does not exist,
 * which is worse than no number at all.
 *
 * So the catalogue is DERIVED — `fightFor` and `hasLadder` are the same
 * functions the game uses — and it re-derives itself every run. When the owner
 * builds Frost Man's weapon, Frost Man's weapon appears here with no edit.
 */

import { BOSSES } from '../data/bosses.js';
import { fightFor } from '../systems/bossFights.js';
import { WEAPONS, SIDEARM_ID, hasLadder, classOf } from '../data/weapons.js';
import { isPassive } from './encounter.js';

/** Bosses with an attack loop at this layer — the ones worth fighting. */
const bossesAt = (layer) => BOSSES
  .filter((b) => !!fightFor(b.id, layer).attack)
  .map((b) => b.id);

/**
 * Weapons with a real ladder, plus the sidearm.
 *
 * The sidearm has no `WEAPON_LADDERS` entry and never will — it is the flat
 * baseline every other weapon is measured against, so excluding it would throw
 * away the only control in the experiment.
 */
const testableWeapons = () => WEAPONS
  .filter((w) => w.id === SIDEARM_ID || hasLadder(w.id))
  .map((w) => w.id);

/** Everything the CLI needs to explain itself and to plan a sweep. */
export const catalogue = () => ({
  weapons: testableWeapons().map((id) => ({
    id, cls: classOf(id), passive: isPassive(id), ladder: hasLadder(id),
  })),
  skippedWeapons: WEAPONS
    .filter((w) => w.id !== SIDEARM_ID && !hasLadder(w.id))
    .map((w) => ({ id: w.id, why: 'no ladder — levels are damage only' })),
  bosses: BOSSES.map((b) => ({
    id: b.id,
    name: b.name,
    layers: [1, 2, 3].map((l) => {
      const f = fightFor(b.id, l);
      const under = l > 1 ? fightFor(b.id, l - 1) : {};
      return {
        layer: l,
        attack: !!f.attack,
        hazard: !!f.hazard,
        // Same object as the layer below means `fightFor` fell back rather
        // than finding content written for this layer.
        attackRepeat: !!f.attack && f.attack === under.attack,
        hazardRepeat: !!f.hazard && f.hazard === under.hazard,
      };
    }),
  })),
});
