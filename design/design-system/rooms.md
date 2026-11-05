# Drawing a boss room

The drawn rooms (Proto Mk0, Blaze, Tempest, Volt, Thorn, Strike and Wraith Man's) went into the game almost as written because they followed these rules. Draw the next one the same way.

**A room's pictures hint at the game its boss's weapon comes from; its music hints at the element** (owner, 22 Oct 2026). The Rock boss's room nods to Kirby, because his weapon is Kirby's Rock form; the Typeless bunker asks for Nullfire Drones lying about.

## Everything that moves is drawn ahead of time

- Paint each moving thing once, while the room builds behind the warp's black: a searchlight at every angle of its sweep, a lava surface at every step of its wobble, rain, sparks. Store them as numbered frames or small named pieces.
- While the fight plays, a room may only **pick a frame and a position** for each piece. Never repaint pixels one at a time during play; a phone cannot afford it.
- A looping effect in the drawn rooms is 4 to 32 frames. Crowds of small things (sparks, drops, embers, debris) are small named pieces reused every frame.

## Use the game's drawing kit

- Paint with `src/systems/arena-art/pixels.js`: raster painting, ordered dithering, row-by-row gradients, `frames` (a numbered strip) and `pieces` (named small pictures).
- Build the room on the stage in `src/systems/arena-art/index.js`: `S.layer` (draw order, back to front; `far` for distant things, `furn` for furniture), `S.image`, `S.tile`, `S.rect`, `S.crops`, `S.pool`.
- A room is one function `(S, arena, viewW)` that returns `{ update(arena) }`, plus `hazards` and `patches` listing the hazards and ground effects it draws itself. Any it does not list are still drawn by the game in plain shapes.

## Read the game's state

- Read the room's real state — `src/systems/arena.js` for the room, `src/systems/bossFights.js` for the fight — and use its names: `turrets`, `panels`, `cover`, `rails`, `conductors`, `liquid`.
- If a demo needs stand-in movement to show something, **label every stand-in "not to be built"**.
- Keep every warning the game draws visible, such as the flashing bar on a training bag Strike Man is about to punch.

## Light, shake and arrival

- **Blackout**: in a room that loses power, everything that gives off light — lamps, meters, sparks, bolts — is drawn after the darkness so it keeps glowing. The boss and minions darken too but stay in front, so a body walking past a lamp blocks it. The player and shots are never darkened.
- **Shake**: `far` layers move at 0.3 times the screen shake; everything else moves fully, in whole pixels.
- **Arrival**: put furniture on `furn` layers. The room fades in over one second, the furniture over the next, then the boss beams down.

## Budgets

Measured on the first six drawn rooms: 0.9 to 2.5 thousandths of a second per frame in a browser slowed to a sixth of its speed (the old plain rooms: 0.7), and about 7KB of download each. A new room should land in that range.

## Checks before asking for approval

- Both widths, 320 and 480.
- Layer 3, with every hazard at once.
- The worst moment the room has: a blackout, a flood, a storm.
- The player, in white, in front of the brightest and busiest part.
- The boss's own shots across the room.
