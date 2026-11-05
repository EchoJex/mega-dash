# World pieces — variants for the owner to pick from

**Nothing in this folder is in the game.** By the owner's call (5 Nov 2026): "Every type of thing
should have a couple questions and/or a few variants to review before getting a label as
'Picked.'" This is group 1 of 3: the area backdrop, ground, platforms, spikes, the boss door and
the exit door. Groups 2 (DRIFTER, the E-Tank, the EXP orb) and 3 (the HUD) follow these picks.

**NEW PLAN, the owner, 5 Nov 2026: world pieces for each slice.** In their words: "new plan. draw
up all 17 slices world pieces just like you did here(floor, platform, exit door, spikes). i really
like the castle one for dragon, and the bedrock one for Ground , and the Steel plates for Steel (i
want a couple variants for the steel door though)". This replaces their earlier answer on the Ground
board (one default look for now). The first-round boards below stay as a record.

| slice | world pieces |
|---|---|
| Dragon | **PICKED: C, castle bricks** |
| Ground | **PICKED: B, bedrock** |
| Steel | **PICKED: A, steel plates**; a couple of door variants still to draw |
| Typeless, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Flying, Psychic, Bug, Rock, Ghost, Dark | three variants each, still to draw, in batches |

The owner's answers, the same day: every slice also gets its own boss door and backdrop, "yes,
everything. 6 wildly different backdrop variants per slice since the player has to look at it
constantly. on a few backdrops, consider a layered parallax effect." Steel's door variants, for which
door: "both". Into the game: "pushed in batches of ~6 slices."

| batch | slices |
|---|---|
| 1 | Typeless, Fire, Water, Electric, Grass, Fighting (the six in the playable game) |
| 2 | Ice, Poison, Ground, Flying, Psychic, Bug |
| 3 | Rock, Ghost, Dragon, Dark, Steel (with Steel's door variants, both doors) |

Each slice: six backdrops, and three variants of the floor, platform, spikes, boss door and exit door.

**Batch 1 is on the canvas** (its own page, "Batch 1"), one board per slice: six backdrops, two of
them scrolling in layers and shown moving, and three materials, each a floor, platform, spike bed,
boss door and exit door. Every material clears the game's contrast floors against all six of its
slice's backdrops.

| slice | backdrops | materials | status |
|---|---|---|---|
| Typeless | 1 test range · 2 hangar (moving) · 3 blueprint · 4 searchlights · 5 radar ridges (moving) · 6 control room | A bunker concrete · B diamond plate · C steel grating | **PICKED: backdrop 2, material A** (owner, 5 Nov 2026: "2+A") |
| Fire | 1 volcano range (moving) · 2 lava sea · 3 forge · 4 smokestacks · 5 ember storm (moving) · 6 basalt columns | A basalt and lava · B fire brick · C grate over coals | **PICKED: backdrop 5, material C, changed** (owner, 5 Nov 2026), in their words below |
| Water | 1 stormy sea (moving) · 2 underwater lab (moving; first offered as plain underwater) · 3 harbour · 4 waterfall cliffs · 5 rainy city (moving) · 6 lighthouse | A wet slate · B ship deck · C aqueduct tiles | **PICKED: backdrop 2, changed, and material A** (owner, 5 Nov 2026), in their words below |
| Electric | 1 pylon lines (moving) · 2 thunderhead · 3 circuit sky · 4 tesla lab · 5 neon city (moving) · 6 static sky | A insulator tiles · B hazard grating · C circuit board | **PICKED: backdrop 1, and material B, changed** (owner, 5 Nov 2026), in their words below |
| Grass | 1 deep forest (moving) · 2 bamboo grove · 3 terraced hills · 4 firefly meadow · 5 overgrown ruins (moving) · 6 canopy | A meadow turf · B bamboo · C mossy stone | **PICKED: backdrop 2, and material B on A's ground** (owner, 5 Nov 2026: "2b including platform as it currently is, but the ground uses the ground from A meadow turf.") |
| Fighting | 1 arena crowd (moving; first offered still) · 2 dojo · 3 mountain temple (moving) · 4 boxing gym · 5 dusk rooftops (moving) · 6 torii and dummies | A dojo floor · B ring canvas · C street concrete | **PICKED: backdrop 1, changed, and material B** (owner, 5 Nov 2026: "1b but ensure the arena crowd is animated") |

**Fire's pick, in the owner's words (5 Nov 2026):** "5c but remove the fast moving layer of embers,
and have the embers slowly drift downward. spikes should be a shiny jet black obsidian glass. doorway
should use be a stone arch made of obsidian glass with tera cotta colored mortar". Redrawn to match:
the ember storm lost its fast near layer of embers, and the rest drift slowly down and go out; the
grate's spikes are jet-black obsidian glass (`glass` in `materials.mjs`); both of its doors are
arches of obsidian glass blocks with terracotta mortar. The doorway was read as both doors, the boss
door keeping its cyan sign and the exit door its gold light.

**Water's pick, in the owner's words (5 Nov 2026):** "2a but to prevent the player from thinking the
physics for the level are different than normal, make the underwater appear to be behind algae
covered, lightly cracked thick underwater habitat glass, like a subsea laboratory. kelp and the
silhouette of deep sea creatures should be animated in". Redrawn to match: backdrop 2 became the
view out of a subsea lab, thick glass panes in a riveted frame with algae growing in from the edges
and a few light cracks. Outside, kelp sways, bubbles rise, and two sharks, an anglerfish, a squid
and a jellyfish fade in out of the dark, glide by and fade out. All of it comes back to where it
started every 8 seconds (`LAB_LOOP`), so its pictures loop with no jump. Material A is as offered.

**Electric's pick, in the owner's words (5 Nov 2026):** "1b but make the spikes a series of AA style
batteries with terminal nubs instead of the usual spikes". Redrawn to match: material B's spike bed
is a row of AA batteries standing up (`batteries` in `materials.mjs`), each with a silver cap, its
terminal nub on top, a violet band and a yellow cell. Backdrop 1 is as offered.

**Fighting's pick:** the arena crowd now jumps and cheers, each person on their own beat and some
with their arms up, while camera flashes go off and the spotlights sweep. A haze of light behind
the crowd and a rim of light on their heads keep them visible against the dark. The crowd scrolls
a little faster than the back wall. Material B is as offered.

**All six slices of batch 1 are picked** (5 Nov 2026), **and are in the game.** Before they went in,
the owner answered three questions: the bamboo grove scrolls slowly as you run ("Scroll slowly"),
each boss room's exit door is that slice's picked door ("Yes, the slice's door"), and Electric's
batteries crackle with sparks between their nubs ("Yes, add sparks").

A pick can mix materials: Grass's `pick` names B for the platform, spikes and doors and A for the
ground (`ground: 'A'`), and nothing was redrawn.

A picked slice carries `pick` in `batch1.mjs`, and `render.mjs` paints it as `pick-<boss>.png` (plus
`.apng` when something in it moves by itself), shown as YOUR PICK at the top of its board.

The per-slice painters: `src/systems/area-art/materials.js` (eight kinds of floor, each with its
platform, spikes and doors), `src/systems/area-art/paint.js` (skies, ridges, skylines, forests, beams,
rain), `src/systems/area-art/slices.js` (the picks), `batch1.mjs` (the six slices with every variant),
`scenes.mjs` (how each picture is laid out). `node design/world-art/render.mjs <folder> --batch 1`
paints batch 1's pictures and prints each material's contrast against its slice's backdrops.

**The review canvas:** [MEGA DASH World Pieces](https://claude.ai/artifact/FKEuvSabVmDeimP3387SVG).
One board per thing; each shows the game today and three variants, with two questions. The owner
picks in each board's comment thread; Claude then labels the board PICKED, here and on the canvas.

| thing | variants | status |
|---|---|---|
| backdrop | 1 far skyline · 2 hills under a deep sky · 3 stars and a far moon | not picked yet |
| ground | A steel plates · B bedrock · C castle bricks | **PICKED: A, steel plates** (owner, 5 Nov 2026); questions answered, below |
| platforms | A steel girder · B rock slab · C brick shelf | not picked yet |
| spikes | A steel cones · B stone shards · C iron spears | not picked yet |
| boss door | A steel shutter · B stone arch · C castle gate | not picked yet |
| exit door | A gold shutter · B arch of light · C gold portcullis | not picked yet |

**The owner's answers, in their words (5 Nov 2026):**

- **Ground**, boss colours or one look: "eventually i might have elementally themed terrain, but
  for now i just want a default that is less ugly than the geometry placeholders." How busy: "agree
  that it shouldnt been too busy. eventually i might better balance touch UI needs vs low ground
  level height that doesnt compromise on player satisfaction."
  When it goes in: "wait for the remainder of the world pieces", so the steel ground goes into the
  game together with the rest of this group once every board is picked.

- `variants.mjs` paints every variant with the game's own room kit
  (`src/systems/arena-art/pixels.js`), at the game's sizes, so a picked painter moves into the game
  as written. Drawn by Claude at the owner's request, 5 Nov 2026.
- `node design/world-art/render.mjs <folder>` paints the canvas's pictures into a folder (one PNG
  each, at game size) and prints each material's worst contrast against the seventeen backdrops,
  the same checks `tests/contrast.test.js` makes on today's ground. It needs Playwright, like
  `npm run smoke`.
- **Batch 1 is in the game** (5 Nov 2026): `src/systems/area-art/` draws each picked slice's area
  (and its boss room's exit door), painted once and then only placed, as the rooms are. The picks
  themselves, in the owner's words, live in `src/systems/area-art/slices.js`, which `batch1.mjs`
  imports, so the canvas and the game paint from one copy. `tests/area-art.test.js` holds the picked
  pits to the contrast floors that `tests/contrast.test.js` holds the plain look to.
