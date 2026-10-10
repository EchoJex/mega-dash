# MEGA DASH — DESIGN BRIEF

**Read this before drawing anything for this game.** It is the game's look and its limits
on one page, written for Claude Design and for anyone else drawing for MEGA DASH. Every
number here was read out of the game's own code on 6 Oct 2026.

If this page and `CLAUDE.md` disagree, `CLAUDE.md` is right and this page is the bug.
What the game SHOULD contain is `design/TRACKER.md`; the words used here are explained in
`design/GLOSSARY.md`. The **MEGA DASH design system** in Claude Design is built from this
page: when this page changes, update it too (link at the bottom).

---

## 1. The screen

- **224 pixels tall, 320 to 480 wide** depending on the phone. Everything is drawn one game
  pixel at a time and then scaled up by a whole number, so nothing is ever blurred, rotated
  smoothly or placed between pixels. **Draw and check every screen at both 320 and 480.**
- **The floor line is at y = 184.** Below it is a 40-pixel band, and the thumb pads cover
  its lower part (y = 194 to 224). The top 33 pixels can carry the HUD text.
  Anything the player must see happen goes between the two.
- **A boss room is exactly one screen**: walls at both edges, ceiling at y = 0, the camera
  never moves. The whole fight is always in view.
- **One clock: 60 steps a second.** "Frames" in a duration means steps. A beat is one
  second (Volt Man's room runs on it).

## 2. The look — 16-bit, SNES era (the owner's call, 29 Sep 2026)

- **A sprite has up to 15 colours plus see-through.** Shade each material in a **colour
  ramp** of 3 to 5 tones, shadows a little cool, highlights sparing. Far limbs sit one tone
  darker than near ones so a flipped sprite still reads.
- **Every character and bullet has the near-black outline `#0A0A12` round the outside.**
  Inside edges may use a dark tone of the fill instead.
- **Colours are free.** Snapping to the SNES's 32 levels per channel is optional.
- **Rooms are richer than sprites** and have no colour cap: the approved rooms build their
  own ramps and use ordered dithering and row-by-row gradients, as SNES backgrounds did.
- **The examples to follow** are the player's sheet (`public/sprites/player.png`, source
  `design/sprites/player.sprite`) and the six drawn rooms (`src/systems/arena-art/`). A
  `.sprite` file with no `palette` lines is the older three-colour kind — not an example.
- **It is a visual upgrade, not a feel change.** Sizes, collision and movement stay as
  they are.

## 3. Colours that carry meaning

- **The player** is a white suit with a `#3CBCFC` accent (visor, arm-cannon muzzle, helmet
  fin), twelve colours in all. He is **never tinted or recoloured**, and must stay visible
  in every room — put him in front of the brightest and busiest part of each room and check.
- **A boss's primary and secondary are his identity**; his 16-bit shades are built from
  them. His **shots must show against his own room**: Proto Mk0's are warning red `#FF4A32`
  with a one-pixel near-black **rim**, because grey shots vanished into his grey bunker.
- **Elite minions** wear a gold outline `#F5D328` instead of the near-black one.
- **Red means warning in Proto Mk0's bunker** and is kept for that.

| boss | type | primary | secondary | footprint (w×h) |
|---|---|---|---|---|
| PROTO MK0 | Typeless | `#687380` | `#2E3338` | 14×19 |
| BLAZE MAN | Fire | `#E11416` | `#141414` | 32×42 |
| TEMPEST MAN | Water | `#145DBD` | `#F5C518` | 27×36 |
| VOLT MAN | Electric | `#F5D328` | `#5B21B6` | 30×40 |
| THORN MAN | Grass | `#2AAB1C` | `#5C4033` | 32×43 |
| FROST MAN | Ice | `#A0EFE7` | `#FFFFFF` | 33×44 |
| STRIKE MAN | Fighting | `#EA6A34` | `#7C2D12` | 35×47 |
| VENOM MAN | Poison | `#A926D9` | `#84CC16` | 31×41 |
| QUAKE MAN | Ground | `#A76625` | `#EA580C` | 35×47 |
| GALE MAN | Flying | `#5CADD5` | `#F8FAFC` | 27×36 |
| PSI MAN | Psychic | `#EA43BD` | `#F9A8D4` | 28×37 |
| SWARM MAN | Bug | `#B8DC28` | `#4D5C1A` | 29×38 |
| GRANITE MAN | Rock | `#5F443A` | `#A8A296` | 36×48 |
| WRAITH MAN | Ghost | `#A68DD8` | `#2A1F4A` | 29×38 |
| DRAKE MAN | Dragon | `#C3225D` | `#6B1220` | 35×46 |
| ECLIPSE MAN | Dark | `#2A273F` | `#DC2626` | 32×42 |
| ALLOY MAN | Steel | `#B2BABD` | `#4B5563` | 35×46 |

Minions: **SPIGLET** (ground) `#788850` / `#2E3520`, 14×14 · **DRIFTER** (air) `#309888` /
`#10332E`, 12×12. These tables are copies of `src/data/bosses.js` and `src/data/minions.js`;
the code wins if they ever differ.

## 4. Sizes

| kind | drawing box | notes |
|---|---|---|
| player | 24×24 | hit box 12×22 standing, 16×11 sliding |
| minion | 16×16 | elites share the box and the art |
| boss | 48×48 | his hit box is the footprint above |
| miniboss | 32×32 | reserved, nothing uses it yet |
| shot | 16×16 | the biggest shot is an 8-pixel ball; the rest is room for a glow or trail |
| pickup | 16×16 | its pick-up box is 7×7 |

- **The drawing is not the hit box.** The hit box stays still while the drawing changes, so
  draw the silhouette freely inside the box; never stretch a drawing to fit a hit box.
- Characters stand with their **feet on the floor line**; bullets are drawn from their
  middle.
- **Bosses stay plain rectangles at their true footprint** until the owner asks for that
  boss's sprite by name. Do not invent silhouettes.

## 5. Draw order, back to front

background → **room art** → ground, spikes, doors → pickups → minions → bullets → boss →
**player** → HUD and thumb pads (a separate layer above the game).

**The player is always in front of everything in the world.** Nothing may hide him.

## 6. Drawing a boss room so it goes straight into the game

- **Everything that moves is drawn ahead of time.** Paint each moving thing once, into
  numbered frames or small named pieces, while the room builds behind the warp's black.
  While playing, a room may only pick a frame and a position for each piece. **Never repaint
  pixels one at a time during play** — that is what a phone cannot afford. A looping effect
  in the approved rooms is 4 to 32 frames.
- **Use the game's own drawing kit** so the code moves across as written:
  `src/systems/arena-art/pixels.js` (raster painting, dithering, row gradients, `frames`,
  `pieces`) and the stage in `src/systems/arena-art/index.js` (`S.layer`, `S.image`,
  `S.tile`, `S.rect`, `S.crops`, `S.pool`). A room is one function `(S, arena, viewW)` that
  returns `{ update(arena) }`, plus the lists of hazards and ground effects it draws itself.
- **The picture follows the game; it never changes it.** Read the room's real state — the
  room in `src/systems/arena.js`, the fight in `src/systems/bossFights.js` — and use their
  names (`turrets`, `panels`, `cover`, `rails`). A demo may need stand-in movement to show
  something; **label every stand-in "not to be built"**.
- **Warnings the game draws must stay visible**, such as the flashing bar on a bag Strike
  Man is about to punch.
- **Shake:** a `far` layer (sky, distant things) moves at 0.3 times the screen shake,
  everything else moves fully, always in whole pixels.
- **Arrival:** the room fades in over one second, its furniture over the next, then the
  boss beams down. Put furniture on `furn` layers so it fades on its own beat.
- **Blackout:** in a room that loses power, everything that gives off light is drawn after
  the darkness so it keeps glowing; the boss and minions darken but stay in front of it.
  The player and shots are never darkened.
- **Furniture lives in the room's file.** The sprite editor's `furniture-…` slots are not
  read by the game.
- **Budgets measured on the approved rooms:** 0.9 to 2.5 thousandths of a second per frame
  in a browser slowed to a sixth of its speed (the old plain rooms: 0.7), and about 7KB of
  download each. A new room should land in that range.

## 7. Text and menus

- **One 5×7 pixel font, capitals only.** It has A–Z, 0–9, space and
  `. , : ; - + / \ ( ) [ ] ! ? ' " < > = % * # _ | · × → ◀ ▶ ◸ ◹`. Lower case becomes upper
  case; anything else (`@`, `&`, `$`…) shows as `?`.
- **Check text and menus by drawing them**, at 320 and 480 wide. Working spacing out from
  the letter size has put things on top of each other three times.
- Touch targets are for thumbs: the movement and action pads are 30 pixels tall along the
  bottom edge.

## 8. Who may make what

- **A sprite or a music track is made by Claude only when the owner asks for that one by
  name**, in the conversation. Rooms likewise: the owner asks for a room by name. Each made
  asset is labelled where it lives and listed in `CLAUDE.md` (*AI-made sprites and music*).
- Placeholder shapes, terrain, the HUD font and sound effects need no ask.
- Music is SNES-era chiptune, matching the art.

## 9. Handing work to Claude Code

- **Show the worst moments before asking for approval**: layer 3, every hazard at once, a
  blackout or flood, and the player and the boss's own shots across the room — at 320 and
  480 wide.
- **Export → Hand off to Claude Code**, with a short **handoff note** alongside (the arena
  one, `HANDOFF-arenas.md`, is the model):
  - what was approved, by whom, and when;
  - what must be kept exactly as drawn;
  - what is a stand-in and must not be built;
  - which tracker lines change, and to which marker. `[draft]` is the owner's word: it is
    written only by the owner, or when the owner says so.
- **Do not hand over an edited copy of `TRACKER.md`.** Claude Code edits the live file on
  `main`, field by field, because the owner may be editing it at the same time.

## 10. Where things live

| what | where |
|---|---|
| what the game should be | `design/TRACKER.md` |
| the rules, and why | `CLAUDE.md` |
| the words | `design/GLOSSARY.md` |
| the screen, sprite boxes, draw order | `src/config/display.js` |
| boss and minion colours and sizes | `src/data/bosses.js`, `src/data/minions.js` |
| sprite sources and built sheets | `design/sprites/*.sprite`, `public/sprites/*.png` |
| the drawn rooms and their drawing kit | `src/systems/arena-art/` |
| room state and furniture | `src/systems/arena.js` |
| fights and hazards | `src/systems/bossFights.js` |

**Design system:** [MEGA DASH](https://claude.ai/artifact/HhsA3oC7MAiDw647SUYzsw), in Claude Design: these rules as its
brand book, every colour and size as a named token, the game's font as a font file, the six
rooms and the player sheet as pictures, and live cards for the screen, the player, the boss
footprints, readable shots and the font. When this page changes, change it there too.
