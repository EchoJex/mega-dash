# MEGA DASH — Project Context

A mobile-first, landscape-only 2D side-scrolling platformer.
**Mega Man 2 aesthetics · Risk of Rain meta progression · Vampire Survivors levelling.**

Stack: **Phaser 3 + Vite**, wrapped by **Capacitor** for Android. One codebase ships
both a browser build and an APK.

The project owner directs; Claude writes the code. Assume the owner will not hand-edit
source. Explain decisions in plain language, not code walkthroughs.

---

## Commands

```bash
npm run dev      # dev server, --host so a phone on the same wifi can play it
npm run build    # production bundle into dist/
npm test         # balance + data-integrity tests — run before every commit
npm run apk      # local APK build (needs Android SDK; CI does this for free)
```

CI builds the APK and deploys the web build on every push to `main`.

---

## Non-negotiable architecture

### 1. Fixed virtual resolution
`src/config/display.js`. The game renders at **224px tall**, width flexing 320–480 by
device aspect, then integer-scales to fill the screen.

**Never derive a gameplay value from `window.innerWidth/Height`.** The old HTML
prototype scaled physics off screen height, so it literally played differently per
device. That is fixed and must stay fixed. Use `VIEW_W` / `VIEW_H`.

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
`src/systems/assets.js`. Every drawable resolves to a placeholder rectangle **or** real
art depending on `MANIFEST`. Adding art is: drop a PNG in `public/sprites/`, add one
line to `MANIFEST`. Per boss, in any order, over months, game playable throughout.

Bosses are **honest rectangles at true collision footprint** right now. Silhouette design
follows from attack and arena design, which is not done. Do not invent silhouettes early.

---

## Terminology — mutually exclusive, do not blur

| Term | Scope | Earned from | Spent on |
|---|---|---|---|
| **EXP** / **Level** | run only | rightward distance + kills | levelling weapons |
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
This is central to Phases 6–8 and must not be collapsed into one system:

1. an **ambient arena hazard loop** on its own timer
2. the **boss's own attack state machine**

They run simultaneously and are **always layer-synced** — a layer-2 boss uses layer-2
hazards *and* layer-2 attacks. Both elementally themed.

---

## Weapons

`src/data/weapons.js` — buster + 17 specials.

**Balance invariant: every weapon deals identical DPS at level 1.**
`damage = dpsTarget × cooldown/60 ÷ projectiles`. Enforced by `tests/dps.test.js`.
Weapon choice is about *utility*, not power. If you add projectiles or pierce,
**rebalance the cooldown** — do not just raise damage.

Equipping a weapon **recolours the player sprite live** from its source boss's palette.

Real feature jumps at **Lv 1 / 3 / 6 / 10** per the design tracker; intermediate levels
are damage-only. Currently all levels use a flat placeholder step.

---

## Design source of truth

**`design/boss-design-tracker.html`** — a standalone app: 17 bosses × 24 fields
(identity, elemental attributes, arena theme, hazard layers 1–3, attack layers 1–3,
sprite/palette block, weapon + Lv1/3/6/10 ladder). Each field flagged
`ok` / `warn` / `miss` / `na`.

**Read the tracker before implementing any boss or weapon.** It is more current than any
code comment. ~77% complete.

Gaps: Core Man (6), Torrent Man (10), and Strike / Swarm / Granite / Wraith / Drake
(14 each — essentially identity-only). Silhouettes deliberately empty everywhere.

Three palette entries are flagged `warn` as **recommended changes** pending owner review
(Torrent, Volt, Venom) where perceptual spacing conflicts with the original prose.

**Do not invent boss content that the tracker marks missing — ask.**

---

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | Strip to buster-only; weapon-select pause screen | ✅ |
| 2 | 17 placeholder bosses (visuals + presence, no attacks) | ✅ |
| 3 | 17 placeholder weapons + per-weapon level system | ✅ |
| — | **Port to Phaser** (this repo) | ✅ |
| — | **Tuning pass** — `feel.js` values are untested placeholders | ⬅ **next** |
| 4 | VS-style level-up cards; weapons unlock only via their boss | ⬜ |
| 5 | Boss defeat animations + weapon acquisition popups | ⏭ deferred (cosmetic) |
| 6–8 | Boss attacks + arena hazards, in thirds | ⬜ |
| 9–11 | Weapon visuals, in thirds | ⬜ |
| 12–14 | Weapon mechanics, in thirds | ⬜ |

### Tuning pass (immediate next)
Every value in `config/feel.js` came from the HTML prototype where they were
**off-the-cuff numbers to get iteration moving**. They are not playtested. Treat them as
a starting point, not as precious. A debug overlay for live tuning is the natural first
task.

### Phase 4 spec
- Delete the two lines in `GameScene.startRun()` that unlock all weapons; gate unlocks on
  defeating each boss (`BOSSES[].dropWeapon`)
- Replace the placeholder auto-levelup in `gainExp()` with a **pick-a-card screen**:
  always a Chip bonus card and an E-Tank card, **plus** up to 3 weapon level-up cards
  drawn from unlocked non-maxed weapons — 2 to 5 cards total
- Re-enable `starter_arsenal` / `twin_arsenal` upgrades

### Hooks left deliberately empty — fill, don't delete
- `GameScene.stepBoss()` → the dual hazard + attack loops (Phases 6–8)
- `player.diagInput` (`'ul'` / `'ur'`) → reserved diagonal special moves
- `MANIFEST` in `systems/assets.js` → real art
- `silhouette: null` in `bosses.js` → deferred by design

---

## Conventions

- Comments explain **why**, not what. Phase-boundary and deliberate-stub comments exist
  so future sessions don't "fix" intentional placeholders — keep that habit.
- Boss/weapon ids are lowercase snake (`eclipse_blade`); display names UPPERCASE.
- Colours are `#RRGGBB` strings in data, converted with `hexNum()` at draw time.
- Run `npm test` before committing. It catches balance regressions instantly.
- The full-reset link on the title screen wipes all persistence and hard-reloads — use it
  when testing save-dependent behaviour (layers, Chips, Upgrades).
