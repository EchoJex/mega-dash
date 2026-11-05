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
- **Getting a pick into the game is code work that comes after the pick**: the area's pieces are
  drawn by `GameScene.draw` today, so a picked look needs an area version of the rooms' drawing
  (painted once, then only placed), and `tests/contrast.test.js` moved onto the picked colours.
