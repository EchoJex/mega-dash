/**
 * LOADOUT — which weapons a run is actually carrying, and how many of them it
 * is allowed to carry at all.
 *
 * THE SIDEARM OCCUPIES A SLOT. It is not a free extra weapon riding above the
 * loadout. A run starts with it in an offensive slot, and at the top mastery
 * rank you may trade it away for a second special — which is the trade that
 * makes the offensive row a real budget rather than "two bonus guns".
 *
 * LOADOUT MASTERY
 * ---------------
 * Slot count and simultaneity are META PROGRESSION, bought in the Hub, and the
 * two classes progress independently. A new save has one offensive position
 * holding the sidearm and no defensive row at all; everything past that is
 * earned.
 *
 *   OFFENSIVE
 *     0  sidearm only — one position, and the sidearm is welded into it
 *     1  a special slot opens, but only ONE of it and the sidearm can be live;
 *        the press-and-hold toggles which
 *     2  both are live at once — the second position is still the sidearm
 *     3  the second position is freed, so two specials can be carried
 *
 *   DEFENSIVE
 *     0  no defensive row
 *     1  one slot
 *     2  a second slot, but only one of the two may be running
 *     3  both run at once
 *
 * Read the two ladders as the same shape offset by the sidearm: a slot, then
 * simultaneity, then the last restriction lifted.
 *
 * WHY THE TWO CLASSES BEHAVE DIFFERENTLY IN PLAY. Offensive weapons share the
 * fire button, so only one is *aimed* at a time and the swipe picks it — but
 * "live" and "aimed" are different things, which is why rank 2 is worth buying
 * even though your thumb can only point at one of them. Defensive weapons are
 * autonomous — a drone that fires itself, a shield that maintains itself, a
 * jetpack that vents on landing — so every live defensive slot acts at once and
 * none is ever selected. A defensive weapon costs no thumb, which is exactly
 * why its slot is a real budget.
 *
 * ENABLE/DISABLE is separate from equipping. A slotted weapon can be switched
 * off from the wheel with a press-and-hold without giving up the slot — the
 * drone's chatter is not always what you want in a boss room, and re-slotting
 * just to silence it would lose the levels you put into it for the rest of the
 * run. Where mastery caps how many may be live, that same gesture becomes a
 * radio switch instead of an on/off: turning one on turns the other off.
 *
 * State lives on the run, not in `save`: a loadout is a run-scoped thing and
 * nothing about it should survive death. The RANKS come from `save` via the
 * upgrades, but they are copied onto the loadout at run start and never read
 * from `save` again, so nothing here can be surprised by a mid-run purchase.
 */

import {
  SIDEARM_ID, OFFENSIVE, DEFENSIVE, SLOTS_PER_CLASS,
  classOf, specialsOfClass, isSidearm,
} from '../data/weapons.js';

export const CLASSES = [OFFENSIVE, DEFENSIVE];

/**
 * THE MASTERY TABLE, indexed by rank.
 *
 *   slots   how many positions of the class are usable at all
 *   active  how many of them may be running at the same time
 *   pin     the position the sidearm is welded into, or -1 for none
 *
 * `pin` is what makes the offensive ladder work without a second mechanism:
 * ranks 0-2 keep the sidearm in a fixed position that cannot be traded away,
 * and rank 3 simply stops pinning it.
 */
export const MASTERY = {
  [OFFENSIVE]: [
    { slots: 1, active: 1, pin: 0 },
    { slots: 2, active: 1, pin: 1 },
    { slots: 2, active: 2, pin: 1 },
    { slots: 2, active: 2, pin: -1 },
  ],
  [DEFENSIVE]: [
    { slots: 0, active: 0, pin: -1 },
    { slots: 1, active: 1, pin: -1 },
    { slots: 2, active: 1, pin: -1 },
    { slots: 2, active: 2, pin: -1 },
  ],
};

export const MAX_RANK = 3;

/**
 * The offensive row must never be entirely switched off — the sidearm is what
 * you fall back to, and a fire button that does nothing reads as a broken
 * button rather than as a choice. Defensive is "up to N", so zero is allowed.
 */
const MIN_ACTIVE = { [OFFENSIVE]: 1, [DEFENSIVE]: 0 };

const clampRank = (n) => Math.max(0, Math.min(MAX_RANK, n | 0));

/** The mastery row in force for a class. Unknown class -> nothing is allowed. */
const tierOf = (lo, cls) =>
  MASTERY[cls]?.[clampRank(lo.rank?.[cls] ?? 0)] || { slots: 0, active: 0, pin: -1 };

/** How many positions of a class are usable at the current rank. */
export const slotCount = (lo, cls) => tierOf(lo, cls).slots;

/** How many may run at once. */
const activeCap = (lo, cls) => tierOf(lo, cls).active;

/** The position the sidearm is welded into, or -1. */
export const pinnedAt = (lo, cls) => (cls === OFFENSIVE ? tierOf(lo, cls).pin : -1);

/** Is this position unusable at the current rank? The wheel padlocks these. */
export const slotLocked = (lo, cls, index) => index >= slotCount(lo, cls);

export function makeLoadout(rank = {}) {
  const lo = {
    [OFFENSIVE]: Array(SLOTS_PER_CLASS).fill(null),
    [DEFENSIVE]: Array(SLOTS_PER_CLASS).fill(null),
    // Ids the player has switched off from the wheel. They keep their slot.
    disabled: new Set(),
    // Ids in the order they were most recently switched on. Only consulted to
    // pick which weapon loses its place when the active cap is exceeded, so
    // "the one you have not touched" goes rather than an arbitrary one.
    order: [],
    rank: {
      [OFFENSIVE]: clampRank(rank[OFFENSIVE] ?? 0),
      [DEFENSIVE]: clampRank(rank[DEFENSIVE] ?? 0),
    },
  };
  // THE SIDEARM STARTS IN A SLOT. Below rank 3 reconcile would weld it there
  // anyway; at rank 3 nothing pins it, and seeding it here is what makes
  // trading it away a decision the player makes rather than a slot they have to
  // go and fill. Seeded ONCE, at construction — reconcile must never put it
  // back, or dropping it at rank 3 would be impossible.
  if (pinnedAt(lo, OFFENSIVE) < 0 && slotCount(lo, OFFENSIVE) > 0) {
    lo[OFFENSIVE][0] = SIDEARM_ID;
    markOn(lo, SIDEARM_ID);
  }
  reconcile(lo);
  return lo;
}

/**
 * Set the mastery ranks and bring the loadout back into legal shape.
 *
 * The switched-off set is CLEARED first. A rank change re-draws the budget, and
 * the commonest one is buying a rank — a purchase that visibly changed nothing
 * because a weapon the old cap had switched off stayed switched off would read
 * as the upgrade not working. Everything the new cap can run, runs.
 */
export function setRanks(lo, rank) {
  for (const c of CLASSES) if (rank[c] != null) lo.rank[c] = clampRank(rank[c]);
  lo.disabled.clear();
  reconcile(lo);
  return lo;
}

/** The slot array for a class, or an empty array for anything else. */
export const slotsOf = (lo, cls) => lo[cls] || [];

/** Every id currently occupying a usable slot, in class then slot order. */
export const equippedIds = (lo) =>
  CLASSES.flatMap((c) => slotsOf(lo, c).slice(0, slotCount(lo, c))).filter(Boolean);

export const isEquipped = (lo, id) => equippedIds(lo).includes(id);

/**
 * Switched-off weapons keep their slot but do nothing.
 *
 * BEING SWITCHED OFF IS A PROPERTY OF OCCUPYING A SLOT, so it is cleared the
 * moment a weapon leaves one. Otherwise a weapon benched while off would come
 * back off the next time it was slotted, hours later, with the player having
 * no memory of switching it off and nothing on screen explaining why their new
 * pick was doing nothing.
 */
export const isEnabled = (lo, id) => !!id && !lo.disabled.has(id);

/** The enabled ids of a class, oldest switch-on first. */
function enabledIn(lo, cls) {
  const filled = slotsOf(lo, cls).slice(0, slotCount(lo, cls)).filter(Boolean);
  const on = filled.filter((id) => isEnabled(lo, id));
  return on.sort((a, b) => lo.order.indexOf(a) - lo.order.indexOf(b));
}

function markOn(lo, id) {
  const i = lo.order.indexOf(id);
  if (i >= 0) lo.order.splice(i, 1);
  lo.order.push(id);
}

/**
 * Press-and-hold on a module: switch it on or off within the class's budget.
 *
 * With room to spare this is a plain on/off. When the cap is tighter than the
 * number of filled slots it becomes a RADIO — switching one on switches the
 * longest-untouched one off — and the last one standing cannot be switched off
 * if the class has a minimum. That single behaviour covers offensive rank 1's
 * "the slot or the sidearm, never both" and defensive rank 2's "up to one",
 * without either needing a rule of its own.
 */
export function toggleEnabled(lo, id) {
  const cls = classOf(id);
  if (!MASTERY[cls] || !isEquipped(lo, id)) return isEnabled(lo, id);

  if (isEnabled(lo, id)) {
    if (enabledIn(lo, cls).length <= MIN_ACTIVE[cls]) return true;  // last one standing
    lo.disabled.add(id);
  } else {
    lo.disabled.delete(id);
    markOn(lo, id);
    const cap = activeCap(lo, cls);
    let on = enabledIn(lo, cls);
    while (on.length > cap) {
      lo.disabled.add(on[0] === id ? on[1] : on[0]);
      on = enabledIn(lo, cls);
    }
  }
  return isEnabled(lo, id);
}

/**
 * Force the loadout back into a shape the current ranks allow.
 *
 * Called after every mutation rather than trusting each caller to get it
 * right — a pinned sidearm that drifted, or a third weapon left running after a
 * rank was read back in, would both be silent and both would be very hard to
 * see on a phone.
 */
function reconcile(lo) {
  for (const cls of CLASSES) {
    const slots = slotsOf(lo, cls);
    const n = slotCount(lo, cls);
    const pin = pinnedAt(lo, cls);

    // Positions past the rank's reach hold nothing.
    for (let i = n; i < slots.length; i++) {
      if (slots[i]) lo.disabled.delete(slots[i]);
      slots[i] = null;
    }
    if (pin >= 0 && pin < n) {
      // The sidearm is welded here, and cannot also be somewhere else.
      for (let i = 0; i < n; i++) if (i !== pin && isSidearm(slots[i])) slots[i] = null;
      slots[pin] = SIDEARM_ID;
    }

    // The active budget. THE NEWCOMER LOSES, which is the opposite of what
    // toggleEnabled does and deliberately so: a deliberate press-and-hold means
    // "run this one instead", but a weapon arriving in a slot must not silently
    // switch off the weapon you were already using.
    const cap = activeCap(lo, cls);
    let on = enabledIn(lo, cls);
    while (on.length > cap) { lo.disabled.add(on[on.length - 1]); on = enabledIn(lo, cls); }
    // ...and its floor. The offensive row always has something to fire.
    const filled = slots.slice(0, n).filter(Boolean);
    if (filled.length && enabledIn(lo, cls).length < MIN_ACTIVE[cls]) {
      const first = filled.find((id) => isSidearm(id)) || filled[0];
      lo.disabled.delete(first);
      markOn(lo, first);
    }
  }
  // Nothing benched stays marked off — see isEnabled's note.
  for (const id of [...lo.disabled]) if (!isEquipped(lo, id)) lo.disabled.delete(id);
  return lo;
}

/** Index of the first free, usable, unpinned slot in a class, or -1. */
export function freeSlot(lo, cls) {
  const slots = slotsOf(lo, cls), pin = pinnedAt(lo, cls);
  for (let i = 0; i < slotCount(lo, cls); i++) {
    if (i !== pin && !slots[i]) return i;
  }
  return -1;
}

/**
 * How many positions of a class a SPECIAL could ever occupy at this rank.
 *
 * Zero means a drop of that class has nowhere to go and must bench silently
 * rather than opening a picker — being asked to choose a slot you do not own is
 * worse than not being asked.
 */
export const tradeableSlots = (lo, cls) => {
  const pin = pinnedAt(lo, cls);
  return slotCount(lo, cls) - (pin >= 0 ? 1 : 0);
};

/**
 * May this weapon be put in this position?
 *
 * Three ways to be told no, and the wheel shows each of them differently: the
 * position is past your rank (padlocked), the position belongs to the sidearm
 * (it shows the sidearm), or the classes simply do not match.
 */
export function canEquip(lo, id, index) {
  const cls = classOf(id);
  if (!MASTERY[cls]) return false;
  if (index < 0 || index >= slotCount(lo, cls)) return false;
  const pin = pinnedAt(lo, cls);
  if (pin >= 0 && (index === pin) !== isSidearm(id)) return false;
  return true;
}

/**
 * Put a weapon in a specific slot of its own class.
 *
 * If it is already in the OTHER slot of that class the two swap rather than the
 * weapon appearing twice — a duplicate would double its effect for free, and
 * the wheel would show the same icon in both slots with no way to tell them
 * apart. Returns the id that got displaced, or null.
 */
export function equip(lo, id, index) {
  if (!canEquip(lo, id, index)) return null;
  const cls = classOf(id);
  const slots = slotsOf(lo, cls);
  const already = slots.indexOf(id);
  const displaced = slots[index];
  if (already >= 0) slots[already] = displaced;   // straight swap
  slots[index] = id;
  if (already < 0 && displaced) lo.disabled.delete(displaced);
  markOn(lo, id);
  reconcile(lo);
  return already >= 0 ? null : displaced;
}

/**
 * Slot a newly unlocked weapon without asking, if there is room.
 *
 * Returns the slot index it landed in, or -1 when the class has no room — which
 * is the caller's cue to open the loadout picker instead of silently benching a
 * weapon the player just earned. At rank 0 there is never room, and that is not
 * an error: the weapon is unlocked, levelling, and waiting for the Hub.
 */
export function autoEquip(lo, id) {
  const cls = classOf(id);
  const i = freeSlot(lo, cls);
  if (i < 0) return -1;
  slotsOf(lo, cls)[i] = id;
  markOn(lo, id);
  reconcile(lo);
  return i;
}

export function unequip(lo, id) {
  for (const c of CLASSES) {
    const slots = slotsOf(lo, c);
    const i = slots.indexOf(id);
    if (i >= 0 && i !== pinnedAt(lo, c)) {
      slots[i] = null;
      lo.disabled.delete(id);
      reconcile(lo);
      return true;
    }
  }
  return false;
}

/**
 * The weapons the fire button can currently use: whichever offensive slots are
 * filled and switched on, which at ranks 0-2 always includes the sidearm.
 * Order is stable, because the re-quip swipe aims at positions in this list.
 */
export const firables = (lo) =>
  slotsOf(lo, OFFENSIVE).slice(0, slotCount(lo, OFFENSIVE))
    .filter((id) => id && isEnabled(lo, id));

/** Defensive weapons currently running. All live slots act at once; none is aimed. */
export const running = (lo) =>
  slotsOf(lo, DEFENSIVE).slice(0, slotCount(lo, DEFENSIVE))
    .filter((id) => id && isEnabled(lo, id));

/**
 * Force `activeWeapon` back onto something the player can actually fire.
 *
 * Called after any slot change. Without it, benching or disabling the weapon
 * you were holding would leave the fire button pointed at a weapon that is no
 * longer equipped — which reads as the button breaking. With nothing firable at
 * all the answer is null, which resolves to NULL_WEAPON and fires nothing
 * rather than throwing.
 */
export function normaliseActive(lo, activeWeapon) {
  const usable = firables(lo);
  return usable.includes(activeWeapon) ? activeWeapon : (usable[0] ?? null);
}

/** Benched specials of a class: unlocked, not slotted. Used by the wheel arcs. */
export const benched = (lo, cls, unlocked) =>
  specialsOfClass(cls).filter((id) => unlocked.has(id) && !isEquipped(lo, id));
