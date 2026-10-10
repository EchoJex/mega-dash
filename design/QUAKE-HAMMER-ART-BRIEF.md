# Quake Hammer — art brief for Claude Design

The Quake Hammer is built and playable with plain placeholder shapes (a brown handle and
a rock-coloured block). This is what the art has to replace. Look at the game with the
hammer equipped (dev menu → WEAPONS ALL, or `npm run dev`) and swing it to see the timing.

**Inspiration, by the owner:** King Dedede's hammer. The jab follows Dedede's neutral
A-A-A from Smash Ultimate. The charge is held over the shoulder; where Dedede's hammer
burns when fully charged, this one sheds **tiny dust clouds** instead.

**Look:** SNES-era 16-bit pixel art, up to 15 colours plus transparency, shared outline
`#0A0A12`. Quake Man's colours: primary `#A76625` (brown), secondary `#EA580C` (orange).
A big, heavy, rock-headed hammer — the head is bigger than the player's torso is wide.
Dust and sand are warm tan (`#E6D6B0`, `#CDB892`, `#D9B56A`, `#B8923F`).

The player is 24×24 and white with a `#3CBCFC` accent; the hammer is drawn ON TOP of him
and must never hide the visor for long (he must stay findable).

## Timing (game steps; the game runs 60 a second)

| move | what happens | steps |
|---|---|---|
| **Jab 1** (tap) | quick short swing, forward | hits on step 10, over by 33 |
| **Jab 2** (tap again after jab 1 hits) | swing back up | hits 13 after the press, over by 40 |
| **Jab 3** (tap again) | finisher: a vertical hammer-head strike | hits on step 10, over by 50 |
| **Charge** (hold past 9 steps) | hammer over the shoulder, held | full after 90 steps |
| **Full charge** | tiny dust clouds fall off the hammer head | every ~4 steps |
| **Release** | big swing from shoulder to the ground in front | hits on step 16, over by 56 |

## Effects

| thing | when | size / life |
|---|---|---|
| **Dust cloud — small / medium / large** | on release, where the hammer lands (an enemy or the ground), sized by how long the charge was held | radius 10 / 16 / 24 px; about 26–42 steps, billowing out and fading |
| **Spikes** | ONLY a full charge that hits the ground: 4 long slender sand spikes stab diagonally forward from the contact point (about 24°, 38°, 52°, 66° above the floor, 42–64 px long) | stab out in 5 steps, stay 30 steps (half a second) |
| **Sand** | each spike crumbles into grains that are pulled down to the floor and rest there | grains stay 3 seconds, then fade over about 0.75 s |

## Not built yet (so nothing in the game reads art for these)

The hammer, the dust, the spikes and the sand are all drawn by code today. When art is
ready, the hook that reads it still has to be written (the hammer needs its own sheet with
one clip per move above; the effects need frames). Say so and it gets built in the same
way as the player's sheet.
