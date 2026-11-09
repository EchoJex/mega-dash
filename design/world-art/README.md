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
| Typeless, Fire, Water, Electric, Grass, Fighting | batch 1: **picked, and in the game** (5 Nov 2026) |
| Ice, Ground | batch 2: **picked, and in the game** (6 Nov 2026); Ground on the first round's bedrock |
| Rock, Dark | batch 3: **picked, and in the game** (8 Nov 2026) |
| Dragon | batch 3: **picked, and in the game** (9 Nov 2026): the great hall on the first round's castle bricks |
| Steel | batch 3: **picked** (backdrops 1, 2 and 5 joined into the assembly line, material B), **not in the game**: waits on which way the line loops (1 or 2), the progress measure, and its doors (three pairs on the canvas, none picked) |
| Ghost | batch 3: **picked** (the grave tower as a climb, material A), **not in the game**: the owner's answers of 8 Nov settled how it plays; it waits on being built, the first area that scrolls up instead of along |
| Poison, Flying, Psychic, Bug | batch 2: three variants each on the canvas, **paused by the owner** (6 Nov 2026), below |

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

**Batch 2 is on the canvas** (its own page, "Batch 2"), 5 Nov 2026, laid out the same way: one
board per slice, six backdrops each (two scrolling in layers, shown moving) and three materials.
**Ground keeps the bedrock picked in the first round**, so its board offers six backdrops in front
of it and asks only for a backdrop number. Every material clears the game's contrast floors against
all six of its slice's backdrops.

| slice | backdrops | materials | status |
|---|---|---|---|
| Ice | 1 aurora night (moving) · 2 glacier wall · 3 frozen lake · 4 ice cave · 5 blizzard peaks (moving) · 6 frozen works | A packed snow · B glacier ice · C frosted steel | **PICKED: backdrop 1, changed, and material A** (owner, 6 Nov 2026), in their words below |
| Poison | 1 toxic swamp (moving) · 2 chemical plant · 3 acid rain · 4 mushroom grove · 5 sewer tunnel (moving) · 6 waste dump | A toxic grate · B sewer brick · C corroded plate | **paused** (owner, 6 Nov 2026) |
| Ground | 1 desert dunes (moving) · 2 red canyon · 3 quarry · 4 mesa sunset · 5 mine shaft (moving) · 6 fossil cliff | B bedrock (picked in the first round) | **PICKED: backdrop 1, changed** (owner, 6 Nov 2026), in their words below |
| Flying | 1 above the clouds (moving) · 2 floating islands · 3 wind farm · 4 balloon festival · 5 airship docks (moving) · 6 cliff nests | A airship deck · B sky temple · C turbine walkway | **paused** (owner, 6 Nov 2026) |
| Psychic | 1 cosmic void (moving) · 2 crystal temple · 3 the watching eye · 4 mirror hall · 5 mind waves (moving) · 6 observation lab | A crystal tiles · B observation floor · C dreamstone | **paused** (owner, 6 Nov 2026) |
| Bug | 1 giant hive (moving) · 2 leaf canopy · 3 ant tunnels (moving) · 4 web forest · 5 termite mounds · 6 shell cavern | A honeycomb · B chitin plates · C rotting log | **paused** (owner, 6 Nov 2026) |

**Ice's pick, in the owner's words (6 Nov 2026):** "1a, but make the aurora even prettier". Redrawn to
match: the aurora is now three curtains of light (a far violet one, the big green one, and a fold of
it swinging out in front), each with a bright lower edge and rays rising from it, green turning teal
and violet as they rise. They ripple, brightness runs along them, and the brightest parts flare
white with a pink fringe. The air glows round them, stars twinkle behind, and the far peaks catch
their light along their tops. Each curtain is a set of one-pixel rays painted once and placed every
step (`AURORA` in `src/systems/area-art/slices.js`), and it all comes back to where it started every 8 seconds
(`AURORA_LOOP`). Material A is as offered.

**Ground's pick, in the owner's words (6 Nov 2026):** "1b add heat waves and other improvements to
the desert feel". Redrawn to match: the sky is bleached pale and the sun white-hot with a wide glare;
the dunes have sharp crests, a sunlit side crossed by wind ripples and a slip face in shadow, in three
ranks; heat waves make the far dunes wobble, and a mirage shimmers along the horizon like water; sand
blows off the near crests and two vultures circle. The heat waves are rows of the far dunes' own
picture slid a pixel or two sideways every step (`heatRows`), the way the Fire room's heat shimmer
works. It loops every 8 seconds (`DESERT_LOOP`). The bedrock is as picked in the first round.

**Ice and Ground went into the game on 6 Nov 2026**, without waiting for the rest of batch 2, in the
owner's words: "push what is solved in batch 2 and move on". **Poison, Flying, Psychic and Bug are
paused**, in their words: "I'll need to pause on Flying, psychic, bug and poison because artistically they could go many ways, as you see in poison: toxins, corrosion, radiation, smog, sewage... too many angles that would fundamentally change the weapon/boss/arena hazards, backdrop". Their boards stay on the canvas, marked PAUSED;
nothing more is drawn for them until the owner settles each slice's direction.

**Batch 3 is on the canvas** (its own page, "Batch 3"), 6 Nov 2026, after the owner chose "All of
batch 3": one board per slice, six backdrops each (two scrolling in layers, shown moving), laid out as
before. **Dragon keeps the castle bricks** picked in the first round, so its board asks only for a
backdrop. **Steel keeps the steel plates** picked in the first round, and its three "materials" are
those plates with three new pairs of doors, a boss door and an exit door each, as the owner asked ("i
want a couple variants for the steel door though", and for which door, "both"). Every floor clears
the game's contrast floors against all six of its slice's backdrops; the closest is Dark's shadow
brick, at 2.06 against a floor of 2.

| slice | backdrops | materials | status |
|---|---|---|---|
| Rock | 1 blue grotto · 2 star vault · 3 tall grass · 4 glowing blooms · 5 mushroom hollow · 6 lantern walk, all moving (six variants of the glowworm grotto the owner picked; before that crystal cavern, geode cavern, underground lake, cave mouth, glowworm grotto and giant crystals, and first offered as crag peaks, stone circle, hoodoo valley, geode cavern, rockslide and stone guardian) | A granite blocks · B quarry strata · C cut slabs | **PICKED: 7 star meadow (2 and 4 joined), with B, changed, and A's arched doors** (owner, 6 and 8 Nov 2026) |
| Ghost | 1 haunted hall (moving) · 2 lantern shrine · 3 grave tower · 4 haunted carnival · 5 soul river (moving) · 6 ghost town (all six redrawn; first offered as graveyard fog, haunted mansion, candlelit crypt, ghost ship, spirit forest and chapel ruins) | A rotten floorboards · B crypt stone · C chapel tiles | **PICKED: 3 grave tower, with A rotten floorboards, as a climb up a tower three screens wide** (owner, 7 Nov 2026), in their words below; how the climb plays still to settle |
| Dragon | 1 great hall (moving) · 2 rose window chapel · 3 armoury gallery · 4 dragon window stair · 5 throne room (moving) · 6 moonlit cloister (six castle halls built on the throne hall the owner picked; first offered as dragon's keep, castle ramparts, hoard cave, dragon bones, volcanic ridge and throne hall) | C castle bricks (picked in the first round) | 1 great hall picked and in the game (9 Nov 2026), in their words below |
| Dark | 1 total eclipse (moving) · 2 moonlit ruin · 3 blackout city · 4 single eyes · 5 void rift (moving) · 6 obsidian cathedral | A obsidian tiles · B shadow brick · C cracked stone | **PICKED: 1 total eclipse, with A on C's ground** (owner, 6 Nov 2026), in their words below |
| Steel | 1 rolling mill (moving) · 2 foundry · 3 skyscraper frame · 4 shipyard · 5 assembly line (moving; redrawn as the owner's story from 1, 2 and the first 5, robot arms along a conveyor) · 6 steel bridge | the steel plates (picked in the first round) with A vault doors · B blast doors · C bulkheads | **PICKED: 5 assembly line, with B blast doors** (owner, 6 Nov 2026), in their words below |

**Rock's pick, in the owner's words (6 Nov 2026):** "B, but redo Rock backdrops using caves and
crystals as the focus, and make the spikes glisteny violet crystals". Redrawn to match: material B,
quarry strata, now has violet crystal spikes (`crystals` in `src/systems/area-art/materials.js`),
sharp amethyst points, each catching the light for a moment now and then. All six backdrops are new,
each a cave with crystals at its heart: a crystal cavern and a glowworm grotto (both moving), a giant
geode, an underground lake mirroring its crystals, a cave mouth looking out at a green valley, and a
cavern crossed by giant crystal beams. The backdrop is still to pick.

**Rock's second answer, in the owner's words (6 Nov 2026):** "i like 5b but with the arched doorways
from a. improve backdrop 5 with 6 new variants inspired by the aesthetics found in Waterfall level in
Undertale, other than the actual waterfalls as that would be a water type feaature". So material B
keeps its violet crystal spikes and takes material A's arched stone doors (`doors: 'A'` in its
`pick`), and the six backdrops are now variants of the glowworm grotto, all of them moving: the
grotto by blue light, with far spires and specks of light drifting up; a vault glittering like a
night sky, a band of crystal light across it; tall blue grass swaying, a few blades with glowing seed
heads; a meadow of hanging bell flowers whose light ripples across them; giant cyan and violet
mushrooms with spores drifting up; and an old boardwalk with crystal lanterns and mist beneath it.
They take that game's mood (the blue dark, glowing plants, a roof like a starry sky) and copy none of
its pictures, and there is no water in any of them, as asked. The board shows the grotto they picked
first, with B and A's doors.
Their pick of those six, the same day: "2 and 4", the star vault and the glowing blooms. Whether that
means one backdrop joining the two, or the two one after the other through the area, is asked on the
board.
Their answer, 8 Nov 2026: "A", one backdrop joining them. So backdrop 7, the star meadow, is the star
vault's roof, crystal band and far spires over the glowing blooms' meadow, and it is Rock's pick.

**Rock and Dark are in the game**, 8 Nov 2026, on the owner's word: "Push everything that's decided".
Their painters moved into `src/systems/area-art/batch3.js`, which `batch3.mjs` imports, so the canvas
and the game paint from one copy; the game's `pickedMaterial` now takes doors from a second material
too. Steel is not in yet (which way its line loops, and the progress measure, are still open), nor
Ghost (its tower is a new kind of area).

**Ghost's backdrops, redone at the owner's ask (6 Nov 2026):** "redo the 6 backdrops, with a wider
interpretation of 'Ghost' using what other video games have established as precedent". The six new
ones each take a kind of haunting games keep coming back to, drawn fresh rather than copied from any
one game: a manor hall where the furniture floats and the portraits' eyes follow you (moving), a
shrine path of gates, paper lanterns and blue spirit flames, a tower given over to graves, a shut-down
fairground whose ghost train has one great staring eye, a river of souls with its ferryman (moving),
and a western ghost town with a see-through cowboy in the street. The materials are as offered.

**Ghost's pick, in the owner's words (7 Nov 2026):** "3a but This level will only be 3 full screen
widths wide. beyond this 3 screen wide scrolling, all other platforming and scrolling will be done in
the vertical as the player ascends this grave tower. add animated blue flame spirits, significantly
increase the unique styles of graves, have a thin fog with clear patches ebb and flow, shifting with
player movement like the layered parallax but over the foreground, mildly obscuring the player,
platforms, enemies etc but not the flame spirits. periodically there will be a staircase that, at the
top, is a one way passable platform that spans the whole level width as checkpoints. all other
platforms should have randomized widths no narrower than the current standard platform". So the grave
tower with the rotten floorboards is drawn as a climb (`TOWER_PICTURES` in `batch3.mjs`): a tower 1440
pixels wide, its far wall at half the camera's speed with graves in fifteen kinds (`grave`), stone
pillars nearer at three quarters, platforms 44 to 88 wide, and every few tiers a staircase up to a
walkway the whole width of the tower, the checkpoint. A thin fog (`towerFog`) drifts over everything
at 1.35 times the camera's speed, its clear patches opening and closing; the blue flame spirits are
drawn over it. The board shows the camera following the player up past two checkpoints, and a map of
the tower. How the climb plays (falling, where the boss door is) is asked on the board. It is the
first area that does not run left to right, so it needs its own build in the game.
Their answers, 8 Nov 2026: "1a and b. The idea is that these checkpoint-like contiguous platforms will
prevent extreme fall heights. 2 the ghost boss will be in the upper right". So a missed jump drops the
player onto whatever is below, and the full-width walkways catch him, so no fall is longer than one
stretch between checkpoints; Ghost's boss door is in the tower's upper right.

**Rock's star meadow, later (9 Nov 2026):** "i love the Your Pick, but slow down the twinkling, and
have the glowing flowers ebb into glowing based on the players proximity to them". The stars twinkle
half as often, and each bell flower is dim, waking or fully lit by how near the player is to it.

**Dragon's great hall, in the owner's words (9 Nov 2026):** "Dragon great Hall is good. I love the
colors of the left window. Use these colors and their compliments and generate 5 unique windows that
randomly loop"; then, with a sheet of six colour sets: "I changed my mind about the colors. Make each
stained glass window based on each of these color sets"; then "Remove the picture in the middle,
ensure the stained glass tile patterns are randomized, then put it into the game and the Dragon world
pieces art". Then: "commit to main the great-hall-windows.png version without anything special in
the middle ... use the yellow one for reference and color swap light yellow for light red, and yellow
for red, then generate a Green one and blue one (avoid colors associated with the draco-blaster
weapon). in total one Red, one Blue, one Green, One Yellow, and one 'dragon' (which currently uses
colors from draco-blaster)". Earlier the same day they asked for every window to share the reference
window's grid. So five windows, all on the first round's diamonds, come down the hall in a shuffled
order of 20 that never repeats a window back to back.

**Dragon's pick, in the owner's words (6 Nov 2026):** "6c but do another 6 variants based on 6c, i
like the interior halls of a castle, and i like some stained glass windows". So the throne hall with
the castle bricks is the starting point, and the six backdrops are now halls inside the castle, each
with stained glass: a great hall of tall windows, pillars and banners (moving: torches flicker), a
chapel with a great rose window and a dragon at its heart, an armoury gallery of suits of armour
between windows, a grand stair past one huge window of a crimson dragon, the throne room with its
chandeliers swinging (moving), and a cloister whose arches are glazed and lit by the moon. The
banners and shields carry the dragon's crest, a gold lozenge round one slit eye. The board shows the
throne hall first, for comparison; one of the six is still to pick.

**Dark's pick, in the owner's words (6 Nov 2026):** "1a but with the cracked glowing stone from c".
So: backdrop 1, the total eclipse, with material A's glass tile platform, black glass shards and
energy doors on material C's cracked stone ground, red light glowing in its cracks, mixed the way
Grass is. Nothing was redrawn. Material A's words on the board had promised "a door of red void
light", but its door was always the energy door it shows, cyan for a boss and gold for the way out;
the words were corrected, not the picture.

**Steel's pick, in the owner's words (6 Nov 2026):** "1, 2, 5 and material B. I want the backdrop to
tell an assembly line story of low poly, mildly variable steel copies of the player, progressing from
the ladle to the billets, to a stamp, to welding arms, to the the end of the conveyor belt where they
are dropped into a black pit that extends below the visible area, implying that they are getting
dumped into a pit". So backdrops 1, 2 and 5 became one new backdrop 5, the assembly line, read left
to right: the ladle pours, billets cool on the rollers, a press stamps each into a flat cut-out of the
player, two welding arms raise it into a steel copy (four slightly different copies, in turn), and at
the end of the belt the copies topple into a black pit that carries on below the screen. It goes with
the steel plates and door pair B, the blast doors. Backdrops 1 and 2 stay on the board as they were.

**Backdrops that tell a story in order, in the owner's words (6 Nov 2026):** "note that levels with
sequential backdrops art will be based on the progress percentage, split evenly, with a yet to be
determined progress metric e.g. kill count, score count, step count, elapsed time". So in the game a
backdrop like Steel's line does not simply repeat: each stage of its story takes an even share of the
area's progress, measured by something still to be chosen. Nothing is built for it yet.

**Steel's line in three phases, in the owner's words (6 Nov 2026):** "since each phase of the assembly
line will be repeating for a while as a backdrop, have Phase 1 backdrop art spawn off-screen to the
right, repeating molten steel filled ladles pouring glowing hot billets that slightly cool, then at
whatever the progress metric ends phase 1, dont switch the entire backdrop, just shift to spawning in
phase 2 art off-screen to the right as the player walks such that phase 1 images remain on screen
until the last one spawned has drifted off screen to the left due to the player progressing to the
right. Phase 2 will be a more detailed press, which only forms the head and torso, briefly pauses the
assembly line while the billet cools rapidly and takes on the form the press made, then a hinged table
lifts the now shaped billet upright, freeing the space under the press and the conveyor belt
continues, loading up a new billet under the press. Phase 3 will be 4 sets of moving arm pairs, one
pair for assembly of arms, one pair for welding the arms, then one pair for assembly of the legs and
one pair for welding the legs." Their answers to four questions: "1b" (the pit once only, at the very
end before the boss door), "2a" (each fitting pair takes its parts from a bin hanging above the
line), "3 idk. show me both options. one option is pauses (pouring, pressing, welding dumping) should
all share the same cadence so the phases line up visually at the phase seams), or having the conveyor
always moving, and the ladles, press, arms, follow the belt", and "4a" (each phase as its own moving
picture, plus a walk through the handovers).

So the line is drawn as units, each one station's stretch of belt, that can follow one another in any
order: a ladle (phase 1), a furnace and a press (phase 2), a gate and four pairs of arms (phase 3),
and once, the belt's end over the pit. What rides the belt depends only on where it is in its unit,
and where a unit meets another of its kind the belt runs through the furnace or the gate, so the
pieces can start over. The Steel board shows both ways of moving side by side: A, one beat (the belt
moves a slot, then stands while everything works, all on one beat of 2 seconds) and B, always moving
(each ladle, press and pair of arms rides along with its item, then hurries back). Each has its
three phases, the end, and a short walk through all of them. Not picked yet, and not in the game; the
code is `PHASE_PICTURES` in `batch3.mjs`.

**Steel's B, in the owner's words (7 Nov 2026):** "i for sure like the end result of the B column, only
the entire backdrop art needs to be more muted to distinguish it from the forground. now i need to
think of how to loop each section so that from a factory workflow perspective each phase looped makes
sense. Draw out 2 variants, one like what you just drew, where the player walks, with each phase
looping until some progress trigger makes phase 2 start being drawn and then eventually phase 3, and
one where all phases play in order with the entire assembly line loops with a new conveyor belt (this
would remove the progress based phase transitions)". So B, always moving, is picked, and the whole
backdrop is muted (`muted` in `batch3.mjs`: its colours greyed a third of the way and darkened towards
the hall's haze), so the floor, the player and what they fight stand out in front. Two walks are on the
board, both muted: 1, the phases by progress, as before, with the pit once at the very end; and 2, the
whole line repeating, each phase once in order and ending at its pit, then a new belt fed by a hopper of
empty moulds (`cycleOf`). In 2 the pit comes at the end of every line, which is the point of it. Which
loop is still to pick (`LOOP_PICTURES`).

A pick can mix materials: Grass's `pick` names B for the platform, spikes and doors and A for the
ground (`ground: 'A'`), and nothing was redrawn. Rock's takes its doors from a second material
instead (`doors: 'A'`). `render.mjs` paints both kinds; the game's `pickedMaterial` in
`src/systems/area-art/slices.js` knows only `ground` so far, and needs `doors` too when Rock goes in.

`node design/world-art/render.mjs <folder> --batch 3 --only alloy` paints one slice's pictures; a slice's `extras` (Steel's line in phases) are painted frame by frame in front of its picked floor.

A picked slice carries `pick` in `batch1.mjs`, `batch2.mjs` or `batch3.mjs`, and `render.mjs` paints it as `pick-<boss>.png` (plus
`.apng` when something in it moves by itself), shown as YOUR PICK at the top of its board.

The per-slice painters: `src/systems/area-art/materials.js` (nine kinds of floor, each with its
platform, spikes and doors, and the first round's bedrock, `BEDROCK`), `src/systems/area-art/paint.js` (skies, ridges, skylines, forests, beams,
rain), `src/systems/area-art/slices.js` (the picks), `batch1.mjs`, `batch2.mjs` and `batch3.mjs`
(each batch's slices with every variant), `scenes.mjs` (how each picture is laid out).
`node design/world-art/render.mjs <folder> --batch 2` paints batch 2's pictures (or `--batch 1`,
batch 1's) and prints each material's contrast against its slice's backdrops.

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
- **Batch 1 is in the game** (5 Nov 2026), **and Ice and Ground from batch 2** (6 Nov 2026):
  `src/systems/area-art/` draws each picked slice's area (and its boss room's exit door), painted
  once and then only placed, as the rooms are. The picks themselves, in the owner's words, live in
  `src/systems/area-art/slices.js`, which `batch1.mjs` and `batch2.mjs` import, so the canvas and the game paint from one copy. `tests/area-art.test.js` holds the picked
  pits to the contrast floors that `tests/contrast.test.js` holds the plain look to.
