# MEGA DASH — Project Context

A mobile-first, landscape-only 2D side-scrolling platformer.
**Mega Man 2 aesthetics · Vampire Survivors levelling and meta progression.**

Stack: **Phaser 3 + Vite**, wrapped by **Capacitor** for Android. One codebase ships
the Android APK. The browser is a development surface only.

The project owner directs; Claude writes the code. Assume the owner will not hand-edit
source. Explain decisions in plain language, not code walkthroughs.

---

## Commands

```bash
npm run dev      # dev server, --host so a phone on the same wifi can play it
npm run build    # production bundle into dist/
npm test         # code-integrity + data-shape tests (~0.1s) — run before committing
npm run status   # the ELEMENT SLICE BOARD — what is built, read from live code
npm run apk      # local APK build (needs Android SDK; CI does this for free)
```

### The dev loop is the in-app updater, not a local server

CI builds the APK on **every push to every branch** and publishes it as a GitHub Release.
Install the APK on the phone once; every later build arrives from inside the game:

- **tap UPDATE** → newest build of `main`
- **long-press UPDATE** → pick a channel: `main`, or any branch with a live CI build

That exists so iterating never requires a dev server on a PC with a phone pointed at it
over wifi. `npm run dev` still works and is fine for quick checks in a desktop browser,
but it is **optional** — pushing a branch and pulling it into the app is the primary loop.

CI publishes `ch-<branch>` for every branch, and the rolling `latest` **only from `main`**,
so a feature branch can never become the default update. Release notes carry
`versionCode=NNNN`, which is what the updater compares against the installed build.

**`android/` is committed** — it holds the updater's native code (`Updater.java`,
`UpdaterPlugin.java`) and `debug.keystore`. That keystore is deliberately in the repo: without
one stable signing key, every CI run would sign differently and no build could ever install
over the last. It signs debug builds of an unreleased game and protects nothing.

**The game itself is entirely offline.** It bundles every asset and fetches nothing. There
is no Pages deploy, no service worker, no remote content. `INTERNET` exists solely for the
updater.

---

## Non-negotiable architecture

### 1. Fixed virtual resolution
`src/config/display.js`. The game renders at **224px tall**, width flexing 320–480 by
device aspect, then integer-scales to fill the screen.

**Never derive a gameplay value from `window.innerWidth/Height`.** The old HTML
prototype scaled physics off screen height, so it literally played differently per
device. That is fixed and must stay fixed. Use `VIEW_W` / `VIEW_H`.

**`RENDER_SCALE` is render density, not resolution.** The canvas backing store is that
many real pixels per virtual pixel and every scene camera zooms by the same factor, so
the playfield is still exactly 224 virtual pixels tall everywhere. It is chosen from the
device's physical pixel height so the browser's final scale lands near 1:1. **This is not
an exception to the rule above** — no gameplay value reads it. Scenes must take their
width from `viewWidthOf(this.scale)`, never `scale.gameSize.width`, which is now the
denser backing size.

### 2. Fixed timestep, decoupled rendering
`GameScene.update()` banks variable delta and runs whole 1/60s steps. Identical
behaviour on 60Hz and 120Hz screens. Never multiply movement by a variable delta.

### 3. Hand-rolled physics — not Phaser Arcade
`src/systems/physics.js`. Mega Man precision needs deterministic, predictable motion:
instant max speed, no acceleration ramp, exact repeatable landings. A general-purpose
AABB solver introduces drift and tunneling that is very hard to tune out.

Phaser owns rendering, input, scenes, audio, asset pipeline. This file owns movement.
**Do not "upgrade" to Arcade or Matter physics.**

### 4. Sprite box ≠ collision box
Collision boxes live in `config/feel.js`, sprite sizes in `systems/assets.js`, and they
are deliberately different. The sprite changes silhouette constantly (arm cannon
extends, legs tuck, slide flattens); if the hitbox followed the art, vulnerability would
change frame to frame — unlearnable, and it feels like cheating. A stable narrower box
gives *precise* (predictable damage) and *fair* (near-misses visibly miss).

Player shots get a slightly generous box; enemy shots a slightly stingy one. Ground
probing is inset so you can stand with boots overhanging a ledge.

### 5. Asset abstraction — placeholders swap to art with no code changes
`src/systems/assets.js`. Every drawable resolves to a placeholder shape **or** real art
depending on `MANIFEST`. Adding art is: drop a PNG in `public/sprites/`, add one line to
`MANIFEST`. Per actor, in any order, over months, game playable throughout.

**Manifest keys** — `player` · `<bossId>` · `<minionId>` · `shot:<weaponId>` ·
`pickup:etank` · `pickup:exp` · `background`. An entry is either a static image
(`{ file }`) or a spritesheet (`{ file, frameW, frameH, anims, fps }`). Optional
`anchor` (`bottom` default / `center`), `offX`/`offY`, `parallax`, `tintable`.

Rendering goes through **`ActorLayer`**, one per depth band, constructed back to front in
`GameScene.create()`. Each layer owns a Graphics for placeholders *and* a pooled set of
sprites for art, because Phaser Graphics cannot draw textures and naively mixing the two
breaks draw order. `GameScene.draw()` never branches on whether art exists.

Art is drawn at its **native size** aligned to the collision box — never stretched to fit
it. That is the sprite-box/collision-box split from rule 4, enforced.

**Sprite grid per class** — `SPRITE_CLASS` in `config/display.js`. Art is authored at
exactly its class's grid and uses transparency to carve the real silhouette:
`minion 16×16` · `player 24×24` (the NES reference) · `miniboss 32×32` (reserved) ·
`boss 48×48`. Elites share the minion grid. These are ceilings, not collision boxes;
collision gets tuned against the final art.

**Draw order** — `DEPTH` in `config/display.js`, applied explicitly rather than by
construction order. **The player is always above every world actor** — hazards, pickups,
minions, projectiles, bosses — because losing sight of the player is losing the run. Only
UI overlays go above, and those live in UIScene, a whole scene above this one.

**Palette:** the buster is just another weapon (dark blue body, light blue accent), and
`NULL_WEAPON` is the no-weapon starting point — a palette with no primary and no
secondary, so the player renders as an **outline-only silhouette with every interior cell
transparent**. Fill belongs to the weapon; silhouette belongs to the player.

**Known gap:** equipping a weapon recolours the player live, which placeholders do for
free. Real art cannot — a Phaser tint would wreck a 3-colour sprite. Fixing it needs
per-weapon frames or a palette-swap shader, and both need the art to exist first.

### Sprite art is HUMAN-AUTHORED. Do not generate it.

Character art, silhouettes and boss arena backgrounds are the owner's to draw. Generated
pixel art falls below the line the owner has drawn between *AI-supported* and *AI-created*
game development, and that line is a deliberate authorship decision, not a quality
judgement about any particular generator.

So do not offer to generate, and never quietly add, sprites or silhouettes for the player,
minions, bosses, or arena backdrops. Bosses stay honest rectangles at true collision
footprint until real art lands. `silhouette: null` in `bosses.js` is not a gap to fill.

**What IS fair game to generate:** the procedural overworld terrain, the placeholder arena
backdrops (shapes, not art — replaced when the owner draws the real ones), the HUD bitmap
font, sound effects, and draft *design prose* the owner then edits. Anything that is not a
drawn sprite.

Bosses are **honest rectangles at true collision footprint** right now. Silhouette design
follows from attack and arena design, which is not done. Do not invent silhouettes early.

---

## Terminology — mutually exclusive, do not blur

| Term | Scope | Earned from | Spent on |
|---|---|---|---|
| **EXP** / **Level** | run only | **collected** from enemy drops | levelling weapons |
| **Chips** | persistent | score + boss kills at run end | **Upgrades** |
| **Upgrades** | persistent | bought with Chips | permanent stat boosts (16) |
| **Weapon Level** | run only, per weapon, 1→10 | level-up choices | that weapon's feature ladder |
| **Layer** | persistent, per boss, 1→3 | lifetime clears of that boss | how hard that boss fights |

Never say "Bolts" (renamed to Chips). EXP never buys Upgrades; Chips never grant Levels.

---

## The four Vampire Survivors pillars (all required)

1. **Per-run stat growth** — EXP/Level + per-weapon levels 1→10
2. **Difficulty scales with run duration** — keyed to **elapsed time**, not distance
   (`FEEL.rampSeconds` and friends). Distance-keying was a runner-era holdover that let
   a stationary player freeze the ramp.
3. **Meta upgrades** — Chips → Upgrades in the Hub
4. **Meta boss tracker by layer** — `save.bossKills` → `bossLayer()`

---

## Bosses

`src/data/bosses.js` — 17, one per element. Shuffle bag: no repeats until all 17 seen.

**Palette rule (NES constraint): exactly 3 colours + transparency.** Primary, secondary,
and a shared near-black outline (`#0A0A12`). The outline is not decoration — it stops
dark bosses dissolving into the dark background.

The 17 primaries are **perceptually optimised**: minimum CIELAB dE between any two is
~27.7 while each still reads as its element. **Do not hand-edit one primary in
isolation** — re-run the spacing optimisation so the set stays separated.

`scale` is height relative to the 24px player, averaging 1.75× with ±0.3 for bulky vs
petite builds.

### Every boss has TWO concurrent danger sources
This is central to every boss and must not be collapsed into one system:

1. an **ambient arena hazard loop** on its own timer
2. the **boss's own attack state machine**

They run simultaneously and are **always layer-synced** — a layer-2 boss uses layer-2
hazards *and* layer-2 attacks. Both elementally themed.

---

## Hazards

Pits and spikes deal the same **massive damage** (`FEEL.hazardDamage`), never an instant
kill, and then **beam** you out: straight up past the top of the screen, then back down at
the leftmost on-screen spot clear of walls, spikes and pits. The 90-frame invulnerability
flicker is preserved in full — its countdown is frozen while the beam is travelling, so
the beam cannot eat your i-frames.

Beaming rather than nudging is also what stops spikes becoming walkable: you cannot stroll
across a spike bed on i-frames, because the first contact removes you from it.

Spikes beam you only when the hit actually **lands**, or when you are **grounded** in them.
Clipping a spike mid-jump while already invulnerable does not stop you — you are passing
through, not stuck. A pit always beams: there is no floor to return to.

---

## Areas and arenas

A run alternates between two spaces:

**AREA** — the endless procedural stream. Its background is themed to the boss whose
door is coming, so the arena is **foreshadowed** before you reach it.

**ARENA** — exactly one screen, walled left and right, floored and ceilinged, camera
locked, no ambient minions. One screen wide matches the NES boss rooms, means the camera
never has to decide anything, and guarantees the whole fight stays visible.

The door does not open into the arena, it **warps** you there: contact freezes everything,
fades to black, builds the room behind full black, then fades back in and resumes. Nothing
is ever seen half-constructed. On the boss's death a **wrap door** appears and warps you
out to a fresh area themed to the next boss in the bag.

`src/systems/arena.js` owns the room, the placeholder backdrop (a darkened wash of the
boss's own primary until `background:<bossId>` art exists), and **screen shake** — whole
virtual pixels only, because the render is integer-scaled and a fractional offset would
shimmer. Shake moves the world, never the HUD.

---

## Elemental attributes

Attributes belong to **player special weapons** and to **bosses inside their own arena**.
Nothing else has them — minions carry none (elementally themed minions are a possible
much later addition), and ordinary terrain outside an arena carries none.

Each attribute has a terrain form and a character form, e.g. **Hot** (terrain) /
**Burn** (character), **Soaked** / **Wet**, **Corrosive** / **Poisoned**,
**Electrified** / **Stunned**. Several will end up sharing identical underlying
behaviour with a different coloured tint — stun, constrict and freeze already do.

**Flinch and knockback are NOT attributes.** They are basic hitbox interaction, present
on every hit regardless of element. Do not model them as status effects.

See the ELEMENTAL ATTRIBUTES section of `design/TRACKER.md` for the per-attribute
definitions.

---

## Minions

`src/data/minions.js` — exactly two, one per plane of movement: **SCRAPPER** (ground,
walks its span and turns at pit edges) and **DRIFTER** (air, drifts left while tracking
your altitude). Bosses are events; minions are weather.

Same 3-colour NES palette rule as bosses, but the minion palette is **unrelated to the
boss palette** and carries no spacing constraint against it. Minions are not part of the
perceptually-optimised 17; pick whatever colour suits the minion.

**Elites are the same size as their base minion** — same sprite grid, same silhouette,
told apart by a gold outline (`ELITE_OUTLINE`). Size would be a weak tell once the ramp
has been running, and sharing the grid means one piece of art covers both forms.

Spawn cadence and HP scale off `difficultyStep()` in `systems/minions.js`, which reads
**elapsed sim time**. Slow motion slows the ramp too — that is intended.

Kills drive the combo counter and drop EXP (`systems/pickups.js`), plus a separate
`FEEL.pickupChance` roll for an E-Tank.

**No ambient minions during a boss fight.** A boss arena is sealed — the only enemies in
it are the boss and whatever its own moveset summons, which comes from
`data/bossFights.js`, never from the ambient spawner. Existing minions are cleared when
the fight starts and the stream resumes when it ends.

---

## Weapons

`src/data/weapons.js` — buster + 17 specials.

**Balance invariant: every weapon deals identical DPS at level 1.**
`damage = dpsTarget × cooldown/60 ÷ projectiles`. The test asserting this is deliberately
skipped until the late tuning phase — these numbers are placeholders.
Weapon choice is about *utility*, not power. If you add projectiles or pierce,
**rebalance the cooldown** — do not just raise damage.

Equipping a weapon **recolours the player sprite live** from its source boss's palette.

Real feature jumps at **Lv 1 / 3 / 6 / 10** per the design tracker; intermediate levels
are damage-only. A weapon uses the flat placeholder step until it gains a `WEAPON_LADDERS`
entry, which happens in its element's slice — never ahead of it, and never in a batch.

---

## Design source of truth

**`design/TRACKER.md` is canonical.** Plain Markdown, readable and editable by both of us.
It holds the 17 element slices, the elemental attributes, a BUGS log and a BRAINSTORM area.

The owner edits it either directly or through the **tracker web app** (`docs/index.html`,
served from GitHub Pages), which is a lens over the same file and autosaves straight into
the repo. There is no export step and no download — that friction was the whole problem
with the old HTML tracker, along with a JSON export built on the false premise that Claude
needed structured data to read a design doc. Both are gone.

`docs/tracker-md.js` is the ONE parser, imported by both the web app and the repo tooling.
`tests/tracker.test.js` asserts `serialize(parse(x)) === x` byte for byte, so the app
cannot silently rewrite or drop prose it did not understand.

### Status markers — the implementation gate

Every field carries one marker, and **Claude implements `[ready]` fields only**:

| marker | meaning |
|---|---|
| `[ready]` | The owner has asserted this is ready to build. **The only green light.** |
| `[wip]` | Being written. Editing any field sets this automatically. |
| `[draft]` | Generated by Claude as a starting point. Never implement; it must be reviewed first. |
| `[todo]` | Nothing written yet. |
| `[na]` | Deliberately not applicable. |

Editing a field revokes `[ready]`. Re-marking it ready is a deliberate act, and that act
is the go-ahead. **Do not build from `[draft]` or `[wip]`, and do not ask to.**

### BRAINSTORM is off-limits

Read it for context — it says where the game is heading and stops you building something
that contradicts it. **Implement nothing from it, and never suggest promoting an idea out
of it.** The owner moves ideas into a slice themselves when they are ready to be real.

### The generated data file

`design/boss-data.json` holds only the mechanical values (palette hexes, sprite scale,
names) extracted from the tracker's meta lines by `npm run sync`. The owner never edits or
sees it. `tests/data.test.js` uses it to assert `bosses.js` has not drifted from the
design. Each slice's meta line carries an `` `id` `` stamp — that is the join key, because
Tempest Man ships in code as `torrent` and deriving the id from the display name would be
wrong, silently.

**Read the tracker before implementing any boss or weapon.** It is more current than any
code comment.

## The plan: ONE ELEMENT AT A TIME

**Run `npm run status` for where every slice actually stands.** It reads live code
and the tracker, so unlike a table in this file it cannot go stale. Do not add a
progress table here — that drift has already bitten this project twice.

### Why it is sliced this way

The old plan was horizontal: "all 17 weapon visuals", then "all 17 weapon mechanics",
each split in thirds. Those thirds existed only to fit a session's compute budget on the
free plan, and to guarantee a playable build per session. **CI now builds every push on
every branch**, so a playable build per push is automatic and that constraint is gone.

Horizontal slicing was the worst possible shape here. A weapon's visuals cannot be
playtested without its mechanics, so nothing was *finished* until the very last phase; it
needed all 17 ladders designed before any of it could start; and it maximised the distance
between writing a design and finding out whether it was fun.

So: **one element, built end to end, playtested, pushed. Then the next.**

### What one element slice contains

An element is DONE when all of this is true for its boss:

1. **Design reviewed by the owner.** Generated `[DRAFT]` prose is a starting point, not a
   specification. A slice does not begin until the owner has passed over that boss's
   tracker fields. This is the gate, not a formality.
2. **Attack layers** — every layer the tracker defines, in `data/bossFights.js`.
3. **Arena** — theme, backdrop shapes, and the furniture its hazards need.
4. **Hazard layers** — every layer the tracker defines, layer-synced with the attacks.
5. **Elemental attribute** — terrain form and character form, in `systems/attributes.js`.
6. **Weapon** — the real Lv 1/3/6/10 ladder, registered in `WEAPON_LADDERS`. This is what
   flips the slice from "in progress" to DONE.
7. **Sound** for its attacks and its weapon.
8. **Overworld terrain theme** for its approach (a first pass already exists for all 17).
9. **Playtested on device, pushed to a branch.**

Art is NOT in the slice. Sprites and arena backdrops are the owner's to draw and land
whenever they land, per actor, via `MANIFEST` — the game stays playable without them.

### Order

Core → Blaze → Tempest first: their design is owner-authored rather than drafted, and the
first three establish the template. Core Man is deliberately first as the simplest — it is
Typeless, so it carries no attribute and its weapon is the plain one.

After those three the order is the owner's call. Nothing technical forces it.

### Cross-cutting work that is NOT part of any slice

These are global and land late, once the elements exist to tune against:

| | |
|---|---|
| **Balance pass** | weapon damage, boss/minion HP, the difficulty ramp — see the testing note below |
| **Physics tuning overlay** | driven by `FEEL_GROUPS`; deliberately deferred |
| **Boss defeat animations** | elemental death + weapon acquisition; cosmetic, folded into each slice when its element is built |
| **Ship prep** | `DEV.enabled = false`, which disables every playtest perk at once |

### Already complete (the foundation)

Engine and port to Phaser · fixed timestep · hand-rolled physics · classic NES motion
constants · sealed arenas with warp transitions · the dual boss loop · minions and the
time-keyed ramp · pickups · EXP and level-up cards · meta upgrades and Chips · the RE-QUIP
wheel · the sprite path (`MANIFEST`) · the in-app updater and per-branch CI · touch
controls · the bitmap font · procedural sound · the elemental attribute framework ·
themed overworld terrain · procedural terrain traversability guarantees.

### Tuning pass
The core **motion** constants in `config/feel.js` (walk, jump, gravity, terminal
velocity, slide speed and duration) are now the **classic NES Mega Man values**, converted
from that game's 8.8 fixed-point. They are a known-good reference feel to tune *away
from*, not a finished tune.

Everything else in that file is still an off-the-cuff prototype number and is not
playtested. Treat those as a starting point, not as precious.

A live in-game tuning overlay is **deliberately deferred to late in development**.
`FEEL_GROUPS` exists to drive it when that time comes — do not build it early.

### Run progression — as built

**Weapons are earned.** You start with the buster only. A special unlocks by killing the
boss that carries it (`BOSSES[].dropWeapon`). `starter_arsenal` / `twin_arsenal` are the
only head start and they cost Chips — they unlock 1 / 2 random specials at run start.

**EXP is collected, never granted.** A level is a flat `FEEL.expPerLevel` (100). Distance
grants nothing. Every enemy DROPS EXP on death and the player has to walk over it — so
levelling is something you do, not something that happens while you hold right. Drop size
is weighted `random ** FEEL.expDropBias`, which makes small drops common and big ones
rare; the minimum scales with the enemy's tier (`FEEL.expDrop`). Bosses split their drop
across several orbs so one bad pit does not eat the whole reward.

**Level-up pauses for a card screen** — `FEEL.cardWeaponChoices` weapon level-ups drawn
from unlocked non-maxed weapons, plus an always-present E-Tank (refill) and Chips
(`FEEL.cardChips`). Levels queue: one big orb can grant several, and each gets its own
choice.

### Dev mode — `src/config/dev.js`

Playtest perks: HP floored at 1 (every hit still lands), equipping padlocked weapons,
cards drawn from locked weapons, a **boss selector** in the pause menu, and **layer
cycling**.

**Boss selector** — pause → BOSS SELECT → any of the 17. It restarts the area with that
boss's door a short walk ahead, keeping the run's weapons, levels and Chips. Deliberately
outside the door rather than inside the arena: the warp, the fade and the room building
on the far side all need testing too. This exists because element-slice development means
fighting one boss repeatedly, and reaching him normally costs a 60-second door timer plus
a shuffle bag that might not offer him for sixteen doors.

**Layer cycling** — `bossLayer(save, id, cycle)`. Shipped behaviour clamps at layer 3
forever, because a boss beaten five times must not become easy again. Dev mode wraps
instead: encounter 4 is encounter 1 again (4=1, 5=2, 6=3), so every layer stays reachable
however many times you have already won. Each tile in the picker shows the layer you will
actually get. **The game logic is written as if none of it exists** —
weapons are genuinely gated, spikes genuinely kill. Set `enabled: false` to ship; that one
switch disables everything. The HUD shows `[DEV]` whenever it is on, because a playtest
misread as "balanced" while invincible is worse than no playtest.

### The dual boss loop — as built

The dual-loop plumbing is live: `GameScene.stepBoss()` drives an attack loop and an
ambient hazard loop side by side every frame, both layer-synced, both fed from
`data/bossFights.js`. Sealed arenas, warp in/out, screen shake and enemy projectiles all
work.

**Three bosses are built from the tracker** — Core Man, Blaze Man and Tempest Man, every
layer the tracker actually defines:

| | attack | hazard | arena furniture |
|---|---|---|---|
| Core Man | L1–3 | L1–3 ceiling turrets, snapping to 45° / 22.5° / 11.25° | gear backdrop, 2 turrets |
| Blaze Man | L1–3 incl. the L3 lava flood | L1–3 falling rocks, +lava pools at L2 | volcano, 3 phasing platforms, floodable floor |
| Tempest Man | L1 water cannon | L1–2 rain, current, drain | high seas, portholes, grate + spike ball, floor water |

The remaining 14 bosses are `null` at every layer, and Tempest's attack L2/L3 and hazard
L3 are `null` because the tracker leaves them blank. **Do not invent content there** — the
owner specifies which dataset to implement, and seed-draft prose is not the same thing as
their hand-authored content.

`systems/attributes.js` implements the elemental attribute layer: Hot (terrain) / Burn
(character) are live and used by Blaze Man; Wet, Poisoned, Stun, Constrict and Freeze are
defined and tested but nothing applies them yet, because their sources are player special
weapons, which land in each element's own slice.

### Hooks left deliberately empty — fill, don't delete
- `bossFights.js` `hazard:` / `attack:` entries set to `null` → per-boss, per-layer content
- `player.diagInput` (`'ul'` / `'ur'`) → reserved diagonal special moves
- `MANIFEST` in `systems/assets.js` → real art
- `silhouette: null` in `bosses.js` → deferred by design

---

## Conventions

- **Held touch inputs are tracked at scene level, never via a zone's `pointerout`.** A
  thumb drifting outside a 44px pad is normal on a phone; cancelling on it made movement
  die in mid-air. A held input ends when the finger lifts, not when it wanders.
- **HUD text sets `resolution: TEXT_RES`** and every scene calls `fitCamera()`
  (`systems/text.js`). Text legibility comes from RENDER_SCALE giving the canvas real
  pixels to draw into; `TEXT_RES` just matches the glyph texture to that density. Raising
  `TEXT_RES` alone makes things WORSE — a larger glyph point-sampled back down into a
  small buffer loses strokes and visibly fragments letters.
- A hand-authored **bitmap font** is the eventual answer for a pixel game and is on the
  art list. The density fix holds until it lands.
- Comments explain **why**, not what. Phase-boundary and deliberate-stub comments exist
  so future sessions don't "fix" intentional placeholders — keep that habit.
- Boss/weapon ids are lowercase snake (`eclipse_blade`); display names UPPERCASE.
- Colours are `#RRGGBB` strings in data, converted with `hexNum()` at draw time.
- Run `npm test` before committing. The whole suite is ~0.1s.

### What tests are for at this phase — and what they are NOT for

**Tests verify plumbing, not numbers.** They check that placeholders resolve, layers
order correctly, upgrades describe themselves without crashing, data shapes hold, and
unknown ids degrade instead of throwing. That is the right standard while everything on
screen is a placeholder.

**Do not add assertions that pin a placeholder value in place.** Weapon damage, boss and
minion HP, elite multipliers, the difficulty ramp, and every colour are all provisional.
A test that asserts one of them does not protect anything — it just fails the build every
time the number is nudged, which is the whole point of the number being provisional.

Balance and stat tuning arrive **late**, together with the physics-tuning overlay. The DPS
invariant test already exists in `tests/dps.test.js` and is deliberately `skip`ped with a
reason; un-skip it when real weapon tuning begins.

Same rule when reviewing or verifying: check that the code path works, not that a
placeholder number is "right".
- The full-reset link on the title screen wipes all persistence and hard-reloads — use it
  when testing save-dependent behaviour (layers, Chips, Upgrades).
