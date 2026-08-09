/**
 * LOADOUT — which weapons a run is actually carrying.
 *
 * A run holds ONE sidearm plus TWO offensive and TWO defensive special weapons.
 * Everything else it has unlocked sits on the bench: still levelling, still
 * offered by level-up cards, just not in play until you swap it in.
 *
 * WHY A CAP AT ALL. Without one, every boss you beat is a strict addition and
 * by the eighth door you are carrying a menu rather than a build. Two slots per
 * class means a new weapon is a *decision* — which is the moment the meta
 * progression actually asks something of you.
 *
 * WHY THE TWO CLASSES BEHAVE DIFFERENTLY. Offensive weapons share the fire
 * button, so only one can be live at a time and the wheel picks it. Defensive
 * weapons are autonomous — a drone that fires itself, a shield that maintains
 * itself, a jetpack that vents on landing — so BOTH defensive slots run at once
 * and neither is ever "selected". That asymmetry is the point of the split: a
 * defensive weapon costs no thumb, so its slot is a real budget.
 *
 * ENABLE/DISABLE is separate from equipping. A slotted weapon can be switched
 * off from the wheel with a press-and-hold without giving up the slot — the
 * drone's chatter is not always what you want in a boss room, and re-slotting
 * just to silence it would lose the levels you put into it for the rest of the
 * run.
 *
 * State lives on the run, not in `save`: a loadout is a run-scoped thing and
 * nothing about it should survive death.
 */

import {
  SIDEARM_ID, OFFENSIVE, DEFENSIVE, SLOTS_PER_CLASS,
  classOf, specialsOfClass,
} from '../data/weapons.js';

export const CLASSES = [OFFENSIVE, DEFENSIVE];

export function makeLoadout() {
  return {
    [OFFENSIVE]: Array(SLOTS_PER_CLASS).fill(null),
    [DEFENSIVE]: Array(SLOTS_PER_CLASS).fill(null),
    // Ids the player has switched off from the wheel. They keep their slot.
    disabled: new Set(),
  };
}

/** The slot array for a class, or an empty array for the sidearm. */
export const slotsOf = (lo, cls) => lo[cls] || [];

/** Every id currently occupying a slot, in class then slot order. */
export const equippedIds = (lo) =>
  CLASSES.flatMap((c) => slotsOf(lo, c)).filter(Boolean);

export const isEquipped = (lo, id) => equippedIds(lo).includes(id);

/**
 * Switched-off weapons keep their slot but do nothing. The sidearm cannot be.
 *
 * BEING SWITCHED OFF IS A PROPERTY OF OCCUPYING A SLOT, so it is cleared the
 * moment a weapon leaves one. Otherwise a weapon benched while off would come
 * back off the next time it was slotted, hours later, with the player having
 * no memory of switching it off and nothing on screen explaining why their new
 * pick was doing nothing.
 */
export const isEnabled = (lo, id) => id === SIDEARM_ID || !lo.disabled.has(id);

export function toggleEnabled(lo, id) {
  if (id === SIDEARM_ID) return true;      // the sidearm is never switched off
  if (lo.disabled.has(id)) lo.disabled.delete(id);
  else lo.disabled.add(id);
  return isEnabled(lo, id);
}

/** Index of the first free slot in a class, or -1 when both are taken. */
export const freeSlot = (lo, cls) => slotsOf(lo, cls).indexOf(null);

/**
 * Put a weapon in a specific slot of its own class.
 *
 * If it is already in the OTHER slot of that class the two swap rather than the
 * weapon appearing twice — a duplicate would double its effect for free, and
 * the wheel would show the same icon in both slots with no way to tell them
 * apart. Returns the id that got displaced, or null.
 */
export function equip(lo, id, index) {
  const cls = classOf(id);
  const slots = slotsOf(lo, cls);
  if (!slots.length || index < 0 || index >= slots.length) return null;
  const already = slots.indexOf(id);
  const displaced = slots[index];
  if (already >= 0) slots[already] = displaced;   // straight swap
  slots[index] = id;
  if (already < 0 && displaced) lo.disabled.delete(displaced);
  return already >= 0 ? null : displaced;
}

/**
 * Slot a newly unlocked weapon without asking, if there is room.
 *
 * Returns the slot index it landed in, or -1 when the class is full — which is
 * the caller's cue to open the loadout picker instead of silently benching a
 * weapon the player just earned.
 */
export function autoEquip(lo, id) {
  const cls = classOf(id);
  const i = freeSlot(lo, cls);
  if (i < 0) return -1;
  slotsOf(lo, cls)[i] = id;
  return i;
}

export function unequip(lo, id) {
  for (const c of CLASSES) {
    const slots = slotsOf(lo, c);
    const i = slots.indexOf(id);
    if (i >= 0) { slots[i] = null; lo.disabled.delete(id); return true; }
  }
  return false;
}

/**
 * The weapons the fire button can currently use: the sidearm, then whichever
 * offensive slots are filled and switched on. Order is stable, because the
 * re-quip swipe aims at positions in this list.
 */
export const firables = (lo) => [
  SIDEARM_ID,
  ...slotsOf(lo, OFFENSIVE).filter((id) => id && isEnabled(lo, id)),
];

/** Defensive weapons currently running. Both slots act at once; none is aimed. */
export const running = (lo) =>
  slotsOf(lo, DEFENSIVE).filter((id) => id && isEnabled(lo, id));

/**
 * Force `activeWeapon` back onto something the player can actually fire.
 *
 * Called after any slot change. Without it, benching or disabling the weapon
 * you were holding would leave the fire button pointed at a weapon that is no
 * longer equipped — which reads as the button breaking.
 */
export function normaliseActive(lo, activeWeapon) {
  const usable = firables(lo);
  return usable.includes(activeWeapon) ? activeWeapon : SIDEARM_ID;
}

/** Benched specials of a class: unlocked, not slotted. Used by the wheel arcs. */
export const benched = (lo, cls, unlocked) =>
  specialsOfClass(cls).filter((id) => unlocked.has(id) && !isEquipped(lo, id));
