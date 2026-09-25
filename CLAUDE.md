# MEGA DASH — Project Context

A mobile-first, landscape-only 2D side-scrolling platformer.
**Mega Man 2 aesthetics · Vampire Survivors levelling and meta progression.**

Stack: **Phaser 3 + Vite**, wrapped by **Capacitor** for Android. One codebase ships
the Android APK. The browser is a development surface only.

The project owner directs; Claude writes the code. Assume the owner will not hand-edit
source.

---

## Write to the owner in plain words. This is not optional.

**The owner does not write code, and has said so directly.** They decide what the game is;
they do not read the source. So every reply, every commit message and every line of these
documents is written for someone sharp and curious who has never taken a programming class.

**The test for a word:** would someone who has never programmed know it? If not, either
drop it or explain it in the same breath, starting from what it actually is. Aim at a
school leaver who reads well — not a beginner's tutorial, and not a specification.

Every "written" below is a real sentence Claude sent the owner inside one week:

| written | should have been |
|---|---|
| "a byte-for-byte round-trip" | "I read the file back after saving and checked that not one character had changed" |
| "mutation-tested" | "I broke it on purpose, to make sure the check would notice" |
| "a string comparison that fails silently" | "two parts of the code have to spell a word the same way. If one gets left behind nothing crashes — that part of the game just quietly stops happening" |
| "the call site" | "the place that uses it" |
| "derived, never listed" | "the computer works the list out for itself, so it cannot go out of date" |
| "it degrades instead of throwing" | "when something is missing it carries on instead of stopping" |

**Some names cannot be translated away.** `npm test`, `SAVE_BREAK`, file paths — those are
the real handles on real things, and hiding them would leave the owner unable to ask about
them. Say what the thing IS the first time it appears: "`npm test` — the quick check, about
a second, that looks for broken plumbing".

**Do not compensate by going vague, and do not talk down.** "It's all fine now" is worse
than jargon: it says nothing and cannot be checked. Say what was done, what was checked,
and what the check proved — in words that carry their own meaning.

**This applies to `design/GLOSSARY.md` too**, which exists for exactly this reason: a word
in the code that is not explained there is a bug in that file, not a gap in the reader.

---

## Commands

```bash
npm run dev      # dev server, --host so a phone on the same wifi can play it
npm run build    # production bundle into dist/
npm test         # code-integrity + data-shape tests (~0.1s) — run before committing
npm run status   # the ELEMENT SLICE BOARD — what is built, read from live code
npm run smoke    # OPT-IN: boot the real bundle in a browser and play it (~3 min)
npm run pages-test      # OPT-IN: drive both web apps against a fake GitHub (~40s)
npm run sprites  # regenerate the pixel-exact drawing templates in design/sprite-templates/
npm run sprites:build   # design/sprites/*.sprite -> the PNGs + the derived MANIFEST entries
npm run sprites:ship    # GIVE THE WORD: verify every [draft] frame reaches the game, mark it [ready]
npm run apk      # local APK build (needs Android SDK; CI does this for free)
```

### `npm run smoke` — the thing `npm test` cannot do

`npm test` runs in ~0.1s against fake contexts, which is the right standard for plumbing
and why it runs before every commit. But a fake context can be *wrong in a way that hides
a bug*: the boss harness was once missing `anim`, every behaviour reading it produced NaN,
the state machine wedged before reaching the line that actually crashed, and the suite
stayed green through a fight that died on a real device within seconds.

`tools/smoke.mjs` builds nothing and fakes nothing. It serves `dist/`, opens it in
Chromium, starts a run, fights every boss whose fight is built, then equips every weapon
that has a ladder at every rung and fires them — failing on any page exception,
console error, crash overlay, non-finite position or runaway projectile count.

`tools/harness.mjs` is the shared half of all three opt-in browser tools — the
playwright guard, the static server and the Chromium launch. Same reason as
`docs/gh.js`: three copies had drifted, and `pages-save.mjs`'s hardcoded
browser path meant it only ran inside a container.

It is **deliberately not in CI and not a devDependency**: Playwright's postinstall would
pull ~150MB of browsers onto every APK build for a job CI does not run. Run it locally
after any change to a fight, a weapon runtime or the render loop:

```bash
npx playwright@latest install chromium    # once
npm run build && npm run smoke
```

### `npm run pages-test` — do the two web apps keep what you put in them

`tools/pages-save.mjs` drives the real tracker and the real sprite editor in Chromium
against a faked api.github.com. Opt-in, not in CI, same terms as `npm run smoke`.

It asks each app the same three questions, and each one is a way work has actually been
lost: does typing reach `main` **with no button pressed**; does a save that collides with
a Claude commit **keep both sides**; and does work that never reached GitHub **come back
after a reload**. A unit test cannot catch these — they live in the ordering of network
calls and in what survives closing the page.

EVERY WRITE IN BOTH APPS IS A WHOLE-FILE PUT, so "the tab's copy is older than the
branch" is never a conflict — always a silent revert. It ate seven tracker fields on
3 Sep 2026. The guard is that every write names the version it is replacing and the apps
merge on a refusal; **do not remove either.**

### `npm run sim` — the boss difficulty harness

`tools/sim.mjs` plays a chosen fight thousands of times with a scripted player
and reports what it cost. It builds a second Vite entry (`sim.html`, only when
`SIM=1`, so a shipped APK carries none of it), opens it in headless Chromium and
calls `GameScene.step()` directly — no `requestAnimationFrame`, no renderer in
the loop, ~340,000 steps/sec, about 5,600x real time. **Nothing is mocked**: the
physics, the boss state machines, the hazard loops and the weapon runtimes are
the ones that ship. A full sweep of every complete pairing takes well under a minute;
`--list` says how many there are today rather than this file guessing.

```bash
npm run sim -- --list                                   # what is built enough to test
npm run sim -- --weapon=blaze_wheel --boss=blaze --layer=2 --level=3
npm run sim -- --all --layer=1,2,3 --iterations=20      # every complete pairing
```

**It refuses incomplete content rather than scoring it.** 12 of the 17 bosses
have no fight built and 5 weapons have no ladder; a boss with no behaviour
stands still while the player shoots him, which is not an easy fight but NO
fight. Those pairings are skipped and named. Where a layer falls back — Strike
Man's hazard L2/L3 — it runs and says so in a CAVEATS block. The catalogue is
derived from `fightFor` and `hasLadder`, so new content appears with no edit.

**The dev branch is forced OFF and checked.** `DEV.enabled` goes on solely so
`layerFor()` honours the layer override; every perk is set false and
`assertClean()` throws if one survives. An `hpFloor` left on would silently make
every win rate 100%.

**The controller is a consistent player, not a good one.** Utility scoring over
the same inputs a thumb has, with the engagement band read from the weapon's own
ladder (`range`/`reach`/`jabReach`) — a fixed standoff had the Volt Spark, which
zaps a 34px box, scoring 0% with zero shots fired. It also knows i-frames are
free, because `hurt()` returns early during them and closing distance in that
window is the only way melee ever lands.

**SIX METRICS, TWO TABLES.** PER LOADOUT answers "can this weapon beat him";
PER BOSS averages every loadout that fought him and answers "how hard is HE",
which is the question a difficulty pass actually asks. Both print every run.

| axis | weight | what it catches |
|---|---|---|
| loss rate | 30% | the loudest possible statement |
| HP lost | 25% | what surviving cost |
| **unavoidable share** | 15% | how much of that cost NO input could have prevented |
| TTK | 15% | how long it took |
| time-in-hitbox | 10% | how much was spent standing inside something |
| inputs/sec | 5% | how busy your hands were |

**UNAVOIDABLE DAMAGE FALLS OUT OF THE CONTROLLER FOR FREE**, and it is the axis
worth having. The controller scores every action available each frame before
picking one, so "was there an out?" is already computed — damage taken on a
frame where no candidate was clean is the boss's design, damage taken when one
was is the player's execution. Only the first kind means a fight is UNFAIR
rather than merely hard.

It measures FRAME-LOCAL unavoidability, not "could you have played the last two
seconds better". That is a real limit and it is still the useful number: against
Proto Mk0 the controller has an escape on 98.6% of frames yet takes 6.7 of its
7.1 damage in the other 1.4%, which is a boss whose turrets create rare
inescapable moments — a completely different shape from Blaze Man, where only
0.6 of 8.2 damage is unavoidable.

Inputs are counted as PRESSES, not frames: holding right for a second is one
input. The score uses inputs per second rather than the total, because the total
is mostly a restatement of duration and `ttk` already carries that.

**Read the output as "does this weapon function against this boss", not as
balance.** Weapon damage, boss HP and the ramp are all placeholders.

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

### Work on `main` by default

**`main` is where work lands unless the owner asks for a branch.** They will say so
explicitly when a change is speculative enough to want isolating; absent that, commit
straight to `main` so the build the phone pulls with a plain tap UPDATE is the current one.

This is a deliberate reversal of the earlier habit of opening a branch per slice. Feature
branches meant every playtest needed a long-press and a channel pick, the `latest` channel
sat months behind, and the tracker web app — which is served from `main` — could not even
see the branch the design was being edited on. The isolation was buying nothing that CI's
per-branch builds were not already providing on demand.

#### A branch handed to you by the session harness is NOT the owner asking

Read this before your first commit. It has already cost two sessions.

Remote Claude Code sessions are created with a branch pre-assigned — a name like
`claude/some-slug-a1b2c3` — and boilerplate setup text saying to develop there, commit
there, push there, and **never push to a different branch without explicit permission**.
That text is generated by the session infrastructure. **The owner did not write it and
has usually never seen it.**

So it does not satisfy "unless the owner asks for a branch." Nothing a harness
pre-populates ever does. **Only a human typing at you in the conversation counts**, and
when they do they will name the branch or say plainly that they want this isolated.

**The default is `main`, and it holds against the session's own setup.** If you find
yourself on a `claude/*` branch with no human having asked for one:

```bash
git checkout -B main origin/main   # or merge, if you already committed
```

and work there. Say in your first message that you did it and why, so the owner can
redirect you in one word if this genuinely was meant to be isolated.

**Why this matters more than it looks.** A branch is not a neutral place to put work
here. `latest` is published from `main` only, so every playtest of a branch build costs a
long-press and a channel pick — and the whole point of the updater is that iterating is
one tap. Worse, the tracker web app is served from `main`: design edits made while the
code lives on a branch cannot see that branch at all. Both failures are silent. The
owner does not get an error, they get a phone that quietly keeps installing an older
build.

**When the owner DOES name a branch, use it** — including the harness's own name if they
say to keep it. This is about who is allowed to decide, not about branches being bad.

**`android/` is committed** — it holds the updater's native code (`Updater.java`,
`UpdaterPlugin.java`) and `megadash-signing.keystore`. That keystore is deliberately in the
repo: without one stable signing key, every CI run would sign differently and no build could
ever install over the last. It signs an unreleased game and protects nothing.

**Never regenerate that keystore or change its `keyAlias`.** The signing identity is the key
inside it. Change either and every phone with the game installed has to uninstall first,
losing the save. The alias still reads `androiddebugkey` for historical reasons; renaming it
would cost a forced reinstall for nothing.

**CI ships a RELEASE build, and both build types use that one key.** A debug build carries
`android:debuggable="true"`, which is a Play Protect heuristic for sideloaded APKs — the game
was getting "Harmful app blocked" on every update. Because the key is unchanged, a release
build still installs cleanly over an older debug build.

**The game itself is entirely offline.** It bundles every asset and fetches nothing. There
is no Pages deploy, no service worker, no remote content. The manifest requests exactly two
permissions, both for the updater: `INTERNET` and `REQUEST_INSTALL_PACKAGES`. There are no
services and no manifest-declared receivers. Adding a permission to a sideloaded app with no
store reputation costs real trust — treat that list as closed unless a feature genuinely
needs it.

### The size budget — what a byte costs, and where the room is

**THE TARGET IS A 500MB INSTALLED APK, by the owner's call.** That is deliberately
generous and it replaces an earlier 20MB target benchmarked on Vampire Survivors at v1.5,
the last Phaser build. **Do not put that benchmark back.** It was picked because VS is the
same engine doing the same genre, which made it a fair yardstick and a bad budget: the
owner's judgement was that the web build is simply too lean to plan a phone game around.

Three measurements decide where the room actually is, and only one of them is a surprise.

#### The wrapper is 88% of today's download and is FIXED

Measured from a shipped APK, by COMPRESSED bytes, which is what travels on an update:

| | download | share |
|---|---|---|
| **WRAPPER** — Java/Kotlin dex, Android resources, signing | **2,858 KB** | **88%** |
| the whole game — JS bundle, sprites, shell | 395 KB | 12% |

Capacitor plus AndroidX plus the Kotlin runtime. It does not grow as the game does, and
shrinking it (R8, dropping AndroidX) trades real risk for a saving one boss slice would
dwarf. Treat it as the floor.

#### ART IS FREE. Stop optimising it.

`public/sprites/player.png` measures **0.1018 bytes per pixel** — 14 frames of 24x24 in 821
bytes — and the Volt Spark agrees at 0.1172. Three colours plus transparency is the most
compressible thing a PNG can hold, and that number is why.

Take the player's own fluidity as the template for everything (6-frame locomotion cycle,
2-frame idle, single poses for the jump states) and **every animated thing in the finished
game is ~105KB**: 17 bosses at 22 frames each is 85KB of that, and everything else together
is 20KB. Triple the frame counts AND treble the entropy for busier art and it reaches 1MB.
Seventeen arena backdrops at 480x224 add 0.18MB on the 3-colour rule, ~1MB drawn richly.

**So no amount of sprite-squeezing buys anything, and no fluidity target is too expensive.**
Never ask the owner to cut frames, share a sheet, or drop a pose for size. If art ever
appears in a size conversation, the conversation has gone wrong.

#### The allocation

| line | budget | what fills it |
|---|---|---|
| wrapper | 2.9 MB | **fixed.** Not content, not negotiable |
| game code | 1 MB | 17 fights, 18 ladders, arenas. Roughly doubles from today's 0.4MB |
| every sprite | 1 MB | pessimistic: 2x the frames at 2x the entropy |
| arena backdrops | 1 MB | 17, drawn richly |
| SFX | 1 MB | ~40 one-shots, in the APK — see below |
| **total inside the APK** | **~7 MB** | |
| headroom to 500MB | ~493 MB | **not the APK's to spend** — see below |

#### MUSIC SHIPS OUTSIDE THE APK. SFX SHIPS INSIDE.

The owner's decision, and the reason is CI rather than storage. **Every push builds an APK
and the in-app updater downloads the whole thing**, so anything inside it is re-downloaded
for every one-line fix. 500MB installed is unremarkable; 500MB to see a typo corrected is
the thing that would actually change how this project feels to work on.

Music is the only asset class big enough for that to bite — the table above is 7MB and every
row of it is bounded. So BGM becomes a pack fetched once, and the 493MB of headroom belongs
to that pack rather than to the APK.

**SFX stays in**, and the split is not arbitrary: a one-shot is a few KB, it is anchored to
a sprite FRAME (`sfx=` in the `.sprite` header), and a footstep that has to wait on a
download is a footstep that does not play. The editor caps an upload at 128KB and 2 seconds,
which is what keeps this row at 1MB rather than making it the new problem.

**NOTHING FETCHES A MUSIC PACK YET, and that is on purpose.** There is no music, so the
format, the hosting and the versioning would all be invented against zero files — and this
game currently fetches nothing but its own updates, so adding a network path is a real cost
to a closed surface. Build it on the day there is a track to deliver, not before. What it
will need when that day comes: a pack URL, a version check the updater already knows how to
do, somewhere writable to cache it, and a game that plays silently when it is absent.

**These numbers are a BUDGET, not a measurement.** Nothing derives them and nothing checks
them, so they will drift the way every hand-written inventory in this file has. Re-measure
from a real APK before trusting a row.


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
depending on `MANIFEST`. **Adding art is: draw it and run `npm run sprites:build`.** Per
actor, in any order, over months, game playable throughout.

**The hand-written `MANIFEST` line is gone, and it had to go.** It used to be the second
half of "drop a PNG in `public/sprites/`, add one line to `MANIFEST`", and that one line
was the last thing standing between a drawn frame and the game — the Volt Spark was drawn,
published, built to a PNG and still completely invisible, waiting on it. The build now
derives the whole entry from the `.sprite` source and the class it belongs to, into
`src/data/sprite-art.json`, and `assets.js` folds it in.

**A hand-written entry still wins for the LOOK fields** (`offX`, `parallax`, a deliberate
`anchor` override) and **never for `anims`/`holds`**, which are frame indices nobody
maintains by hand. A sprite with no `.sprite` source would keep a hand-written entry
entirely, which is what `MANIFEST` is still nominally for — but every sheet in the game
has a source now, so the table is down to a single tuning constant (`player.fps`, the
anchor `DEFAULT_HOLD` is derived from) and `preloadArt` skips any entry with no `file`.
The player's hand-written `anims` block was deleted when it was found still claiming a
one-frame slide against a sheet that had grown three.

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
`boss 48×48` · `shot 16×16` · `pickup 16×16`. Elites share the minion grid. These are
ceilings, not collision boxes; collision gets tuned against the final art.

**The last two have deliberate slack in them.** The largest projectile the engine draws is
an 8px ball (`radius: 4`) and a pickup's collision is a flat 7×7 — the rest of the 16 is
room for a glow, a spin or a trail, none of which collision ever sees.

**Draw order** — `DEPTH` in `config/display.js`, applied explicitly rather than by
construction order. **The player is always above every world actor** — hazards, pickups,
minions, projectiles, bosses — because losing sight of the player is losing the run. Only
UI overlays go above, and those live in UIScene, a whole scene above this one.

**Palette:** the player is a **fixed white**, taken from the art — `PLAYER_PALETTE` in
`config/display.js` holds the three colours baked into `public/sprites/player.png`, so the
constant and the sheet cannot disagree. He was blue (#1565C0) for the whole placeholder
era and this file called that fixed forever; the owner's sheet arrived white and **the art
wins.** White is also the strongest answer to "never lose sight of the player" against
arenas running from Blaze Man's dark red to Eclipse Man's near-black.

Equipping a weapon used to recolour the suit live from its source boss's palette; **that
is scrubbed, do not reintroduce it.** What you are carrying is told by weapon hardware
drawn on the player, not by his colour. A live recolour is something placeholders do for
free and real 3-colour art cannot (a Phaser tint multiplies the whole texture), so the
feature was quietly blocking the art it stood in for — and a protagonist whose colour
changes is one you have to re-find after every re-quip.

`NULL_WEAPON` is what an unresolvable weapon id falls back to: no primary and no
secondary, so anything drawn from it is an **outline-only silhouette with every interior
cell transparent**. It is a fail-visible path, not the player's look.

### `npm run sprites` — the drawing templates

`tools/sprite-templates.mjs` writes pixel-exact canvases for hand-drawn art into
`design/sprite-templates/`: an exact-size guide and an empty canvas per class, plus one
magnified reference sheet at 8x with one cell per pixel.

**Every number in them is READ OUT OF THE LIVE SOURCE** — the grids from `SPRITE_CLASS`,
the player's hurtbox from `FEEL`, the minion boxes from `MINIONS`, and each boss footprint
through the exact arithmetic `spawnBoss` uses (`h = round(24 * scale)`, `w = round(h *
0.75)` — note the width comes off the ROUNDED height, and the two orders disagree for
several bosses). Re-run it after any `scale` change rather than editing a PNG.

It writes its own PNGs from `zlib` rather than taking an image dependency, and it refuses
to emit a template whose collision box overflows its sprite grid — the first version read
`miniboss` for `boss` and produced a 36x48 footprint on a 32x32 canvas without complaining.

**This does not generate art.** It generates the empty paper and the guide lines, which is
the one part of the job that is arithmetic.

### The sprite editor — `docs/sprite-editor.html`

A sibling of the tracker app, served from the same GitHub Pages site, sharing its token,
its save engine (`docs/autosave.js`) and its marker vocabulary. **It is deliberately not
in the dev menu.** The game is entirely offline and its permission list is closed; an
in-game editor that autosaved would put a GitHub token and a write path inside a sideloaded
APK, which is a real cost to a trust surface paid so a drawing tool could sit one menu
nearer the thing it draws for.

**`design/sprites/*.sprite` is the source; `public/sprites/*.png` is the build output.**
`npm run sprites:build` is the only step between them, and nothing downstream changes —
adding art is drawing it and running that build. The `MANIFEST` line it used to also need
is gone — the entry is derived — so the PNG has a source file and nothing else has a step. Proven by round-tripping the shipped `player.png` through the format and
back: **pixel-identical.**

#### A FRAME IS `ACTOR > ACTION > INDEX`, and the index is 1-BASED PER ACTION

`[run 1]` through `[run 6]` are one animation; `[idle 1]`, `[idle 2]` are another.
**The sheet's absolute frame position is DERIVED from block order and written down
nowhere.** `MANIFEST.anims` used to hold those absolute indices by hand, so inserting a
frame anywhere but the end of the sheet silently repointed every animation after it —
`npm run sprites:build` now regenerates them into `src/data/sprite-art.json`, which
`createAnims` reads. **Do not hand-edit that file and do not put frame indices back in
`MANIFEST`**. The hand-written `anims` there was deleted once every sheet had a source:
it had rotted to `slide: [11]` against a sheet whose slide was 11, 12 and 13, and the
merge had been overwriting it on every load for long enough that nobody noticed. The build **says so out loud when an animation's shape changes**, because
adding a frame to an action is a gameplay change that arrives as a side effect of drawing.

**`status` IS PER FRAME.** A sheet is rarely finished all at once and the old
one-status-per-sheet gate meant a single unfinished pose held back every finished one. A
`wip` frame **still gets its cell in the PNG, drawn blank** — dropping the cell would
renumber the sheet, which is the breakage the derived list exists to prevent — and is
**left out of the regenerated animation**, so a cycle never plays a hole.

**THE SLIDE IS AN ASSERTION THEN A HOLD, and the two sum to `FEEL.slideDurationFrames`.**
One pass of the cycle is exactly one slide — shorter and the loop comes round and resets
the pose mid-slide, longer and the last frame is cut off before it finishes. **The split is
the owner's to tune; the SUM is an invariant** and `tests/sprites.test.js` holds it. It
started as two frames at 3 and 23 and is three at 8, 5 and 13, which is the point: the
COUNT is the owner's too, and only the total is fixed.

#### `hold` IS IN SIM STEPS, and the game always had this number

**FRAMES ARE STEPS — they are aliases, and `design/GLOSSARY.md` says so first.** When the
owner writes "hold for 10 frames" in a tracker field they mean 10 steps, and it must be
read that way. The two words point at one unit because the game has ONE clock: a 120Hz
phone paints twice as often as a 60Hz one, and the moment "frame" came to mean "one
repaint" the same animation would run at half speed on half the devices. Never introduce a
duration measured in refreshes, and never ask the owner which sense they meant.

One 1/60s step of the fixed simulation. On a 60Hz screen that is one refresh; on a 120Hz
phone the frame lasts the same *time* across ten. Steps are the unit that means something.

It was previously spelled as one `fps` for a whole sheet: the player is `fps: 12`, and
60/12 is **5 steps** — which is why `DEFAULT_HOLD` is 5 and not a rounder-looking 10, a
number that would quietly play a new frame at half its own animation's speed.
`animFps: { idle: 1.5 }` was the single escape hatch, and 60/1.5 is the idle's **40
steps** — the number the idle still holds, now as a per-frame `hold` rather than a sheet
rate. That escape hatch is deleted; `fps: 12` survives in `MANIFEST` as nothing but the
anchor, and `tests/sprites.test.js` pins `DEFAULT_HOLD` against it so the two cannot drift.

The editor's (i) beside the field carries this terminology, because "step" is the word
that stops meaning anything a month later.

**A PIXEL STORES ITS ROLE, NOT ITS COLOUR** — `1` for primary, never `#EA6A34`. The
seventeen boss primaries are optimised as a SET and get re-tuned as a set, so a palette
change in the tracker recolours every sprite drawn against it with no art reopened. It also
means the 3-colours-plus-transparency rule is the only thing the format can express.

**Only `ready` and `draft` frames build.** `wip` and `deferred` are skipped, so
half-finished art cannot reach a playtest — the same gate the fight content has, applied to
the thing that is actually visible.

#### `npm run sprites:ship` — the sprite half of the marker gate

The tracker has one word for "this is finished, build it": a field moves to `[draft]`,
Claude builds it, and it settles at `[ready]`. **Sprite frames now run the same handshake**
— give the word, and every `draft` frame that genuinely reaches the game is promoted to
`ready`.

**IT VERIFIES BEFORE IT PROMOTES.** `ready` means "built and in the game", so promoting a
frame that never made it would put a lie in the one file that answers that question. Four
things must hold, and each has been the thing that was wrong at least once: the sheet is in
the manifest, the PNG is on disk at the right size, the frame is in its animation (a `wip`
frame keeps its cell but leaves the anim), and **something can actually play that clip**.

A frame failing any of them is **left at `draft` with the reason printed**, which is not a
failure — it is drawn and it builds, it just is not reachable yet.

**The reachability check must stay EXACT, not a grep.** The first version searched `src/`
for the action name in quotes and was wrong in both directions on its first real test: it
passed a `charge` animation because `sfx('charge')` exists, and it passed `fly` on a
PROJECTILE because a MINION's clip happens to be called `fly`. The player's clip set is now
derived by running `playerClip` over the states that produce each branch; the minions' is
written down because the scene picks theirs inline.

**THE SPRITE OVERRIDES THE GEOMETRY, AND NOTHING IS CONDITIONAL ON THAT.**
`ActorLayer.draw(actor, fallback)` uses the sheet when `MANIFEST` has the id and calls the
fallback when it does not, so the whole placeholder-to-art path is one rule with no branch
anywhere: **all frames `wip` or `deferred` → no sheet is built → no manifest entry → the
code geometry draws. One frame at `draft` or `ready` → the drawing takes over**, same
place, same duration. Verified in the real build both ways.

**A HITSCAN WEAPON HAS NO BULLET, so it needs somewhere to hang that.** A thrown projectile
is already an actor and gets the swap for free; the Volt Spark is an instant hitbox and a
fading rectangle, so its six drawn frames built, loaded and had nothing to attach to.
A puff may now **name a weapon** (`ctx.puff({ ..., weapon: 'volt_spark' })`), and
`GameScene` routes a named puff through the bullets layer with `drawPuff` as the fallback.
Any other hitscan weapon gets the same by naming itself.

**A SPRITE WITH ONE ANIMATION PLAYS ITSELF** (`onlyClipOf`). `actor.clip` exists because the
player has six and only `GameScene` knows which one his velocity means; a projectile has
one and nothing was ever going to set it, so a six-frame spark loaded, drew, and held frame
1 forever. An actor that grows a SECOND animation goes back to naming its own clip — and
`sprites:ship` holds its frames until something does, which is the right direction to fail.

#### The fudge factors are TWO numbers and the vertical one is dangerous

The ratio between the drawn silhouette and the collision box, per axis, in 0.05 steps.
**The defaults are measured, not chosen**: the shipped player is 12 wide on a 17px
silhouette standing and 16 on 21 sliding — 0.71 and 0.76 — against 22 on 23 and 11 on 11
tall. So horizontal defaults to **0.70** and vertical to **1.00**, and applying 0.70 to that
same silhouette reproduces the engine's own 12px box exactly. `tests/sprites.test.js`
asserts that, so the default cannot drift from the art it came from.

**Horizontal fudge is free fairness; vertical fudge is not its mirror.** A box narrower than
the drawing means a near miss visibly misses. A box SHORTER than the drawing means the feet
land somewhere other than where they look, or a jump passes through a ceiling it visibly
hit — which reads as the game being wrong rather than as the game being kind. The editor
shows a standing gold warning whenever vertical leaves 1.00, and it stays up, because the
person who needs telling is whoever opens that sprite in a month.

The collision box is per ACTOR, not per frame, so a fudge factor is read against one chosen
reference frame — the player's own box matches `idle1` at 1.00 and `idle0` at 0.96.

#### THE TOOL ROW IS ONE LINE THAT SCROLLS, and that is a constraint, not a style

It carries the four colour pens, seven drawing tools, the zoom ladder, undo/redo, the
frame buttons and the view toggles; the NES chip, the role dropdowns and the fudge dials are
behind PAL. Left to
WRAP, that same row was one line on a desktop and four on a phone in landscape — which took
a 380px screen down to a **thirty-pixel canvas**, the exact opposite of what the layout is
for. `flex-wrap: nowrap` with `overflow-x: auto` makes the footer's height a constant, and
anything past the edge is a thumb-swipe. Two traps came with it and both are load-bearing:
`body` needs `grid-template-columns: minmax(0, 1fr)` or an auto column inflates to the tool
row's min-content and drags the stage off-centre with it, and `#drawer` needs an explicit
`[hidden]` rule because its own `display: grid` outranks the UA sheet's.

**The standing vertical-fudge warning lives OUTSIDE the drawer** so closing the drawer
cannot close it. That is the whole point of it being standing.

#### SHOTS AND PICKUPS ARE DRAWABLE AND CARRY NO COLLISION BOX

All 18 projectiles and both pickups are editor targets, derived from `DEFS` in
`data/weapons.js` and `PICKUP_STYLE` in `systems/pickups.js` — a weapon gains a drawable
shot on the day it joins the roster, with no edit in the generator.

**Their `box` is `null` on purpose and must stay that way.** A projectile's collision is a
RADIUS the engine computes per weapon and per level; a pickup's is a flat 7×7 pickup test.
Neither is the per-actor hurtbox the fudge dials exist to propose, so the editor hides the
box overlay and the dials for them rather than inviting anyone to tune a number nothing
reads. The MAX BOSS reference figure goes too — beside a 16-cell bullet it answers no
question and costs the zoom that drawing an 8px ball needs.

**The id is filename-safe and `key` is what MANIFEST wants.** `shot:sidearm` is a fine
manifest key and a bad path, so the file is `shot-sidearm.sprite` and the colon lives in one
generated field rather than in a two-way conversion somebody has to keep straight.
`npm run sprites:build` prints the manifest key beside the PNG for exactly that reason.

#### THE STAGE CAPTURES THE POINTER, so anything drawn ON it needs `stopPropagation`

`setPointerCapture` retargets the rest of a gesture at the stage, so a tap on a control
sitting over the canvas never becomes a click on that control — it paints a pixel behind
it. This has now bitten twice: the preview's rate button, and the (i) note. Both are fixed
by the same loop that stops `pointerdown`/`pointerup`/`pointermove`/`wheel` from
propagating. **Any new overlay on `#stage` joins that list.**

Also twice now: an element whose own CSS sets `display` **outranks the UA sheet's
`[hidden] { display: none }`**. `#drawer` (grid) and `#onionRow` (`.row` is flex) each
needed an explicit `[hidden]` rule, and without it the thing is permanently visible while
the code believes it is closed.

#### ONE FINGER IS ALWAYS THE TOOL. Do not reintroduce pinch.

Zoom is a ladder of whole numbers reached by buttons, and pan is a tool. Pinch-to-zoom was
removed for it, by the owner's call, so that a one-finger drag on the stage can never mean
two things — which is what a selection tool needs before it can drag a region around. The
rungs are integers because the grid overlay switches on at 4x and a fractional cell size
shimmers against it; `fitCam` may still land between rungs, and the next press snaps back
on. The wheel stays, on the same ladder, because a wheel carries no touch ambiguity.

**THE PREVIEW PLAYS ONE ANIMATION AT THE GAME'S OWN RATE.** It used to cycle the whole
sheet, running the idle into the run into the jump poses into the slide — which is not
something the game ever does. It plays the selected action, each frame for its own `hold`,
at 60 steps a second. **There is no fps dial any more** because there is nothing left for
it to choose; what replaced it is a slow-motion ladder (1x, 1/2, 1/4, 1/8) for looking at
a fast cycle without pretending the game plays it that way.

**SPIGLET AND DRIFTER STAND IN THE WALK LANE**, one on the floor and one in the air,
because bosses are events and minions are weather — a run is mostly spent beside those
two, so they are the honest timing reference in a way a boss met once every few minutes is
not.

**The preview has two modes and WALK is the one that answers the hard question.** A cycle
looping in place says whether the frames are smooth; it cannot say whether the weight
lands, because that is a relationship between how fast the feet move and how fast the body
travels. WALK crosses ground at `FEEL.moveSpeed`, read from the live source, with the
player still at the start line and an AVERAGE-sized boss still at the finish — the average
of the seventeen, not the largest, because the question is what a fight feels like rather
than what fits on the grid. **Travel runs on real time, not on the rate dial**: slowing the
cycle to look at it must not also slow the body and make the feet stop matching.

**The rate dial is gone and the holds replaced it.** It offered 60/24/12/6/1.5 fps for a
whole sheet, which is the same information a per-frame `hold` carries exactly — and the
dial could not express the one thing real animation does, which is frames of different
lengths in the same cycle.

**Undo is one snapshot per STROKE.** A drag across twelve pixels is one thing the artist
did, and twelve taps to take it back is how an undo stack becomes useless. Snapshotting the
frame LIST rather than the current frame is what makes +FRAME and −FRAME undoable at all.

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
| **Upgrades** | persistent | bought with Chips | permanent stat boosts (25: 21 ordinary + 4 MASTERY ladders) |
| **Weapon Level** | run only, per weapon, 1→10 | level-up choices | that weapon's feature ladder |
| **Layer** | persistent, per boss, 1→3 | lifetime clears of that boss | how hard that boss fights |
| **Slot** | run only, up to 2 offensive + 2 defensive | equipping a weapon you have unlocked | which weapons are actually in play |
| **Loadout Mastery** | persistent, per class, 0→3 | bought with Chips | how many slots exist and how many run at once |

Never say "Bolts" (renamed to Chips) or "Mega Buster" (renamed to **Side Arm** — its id is
`sidearm`, renamed with the weapon once it was clear no save had ever held a
weapon id). EXP never buys
Upgrades; Chips never grant Levels. A weapon is *unlocked* for the run and *equipped* into
a slot; those are different states and an unlocked weapon on the bench still levels up.

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

The 17 primaries were **perceptually optimised**: minimum CIELAB dE between any two is
~27.7 while each still reads as its element.

**THE SPACING OPTIMISATION IS PAUSED, by the owner's call, until the game is far closer to
finished.** Starting from a statistically separated set was worth doing and the set stays
as the baseline — but re-running the optimisation on every edit makes each palette a
seventeen-way negotiation, and the art is not far enough along to know which colours the
game actually needs. So a primary may now be changed on its own, and the set is allowed to
drift. Re-run the optimisation as a LATE pass, alongside balance and the physics overlay,
when the sprites exist to judge it against. Do not re-tighten it early on your own
initiative.

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

`src/data/minions.js` — exactly two, one per plane of movement: **SPIGLET** (ground,
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
`systems/bossFights.js`, never from the ambient spawner. Existing minions are cleared when
the fight starts and the stream resumes when it ends.

---

## Weapons

`src/data/weapons.js` — the sidearm + 17 specials.

### Classes and the loadout

Every weapon carries a `cls`, taken from the first word of its tracker field:

| class | count | how it plays |
|---|---|---|
| **offensive** | 9 | shares the fire button; the wheel picks which one is aimed. **The sidearm is one of these** — the old Mega Buster, renamed, starting in an offensive slot. It is not a free extra riding above the loadout |
| **defensive** | 9 | runs by itself — a drone that auto-fires, a shield that maintains itself, a jetpack that vents on landing. Never aimed |

Eighteen in total: 17 specials, one per boss, plus the sidearm. The counts above
are the live answer from `data/weapons.js` — an earlier version of this table
listed the sidearm on a row of its own AND inside the offensive count, which made
it read as 1 + 11 + 6 and quietly lost a defensive weapon.

**The split is deliberately EVEN, and that is a design decision rather than an
accident of counting.** It was 11/7 while every weapon whose class field was
unwritten sat in the offensive row by default. Two Loadout Mastery ladders gate
the two halves, so a lopsided roster makes buying one of them the obvious
purchase and the other a formality. Reaching 9/9 cost two reclassifications —
**Psi Orb** and **Granite Form** — both taken on weapons whose ladders were
entirely unwritten, so nothing settled was overruled.

`systems/loadout.js` owns the slots and is the only thing that may decide what is
equipped; `systems/weaponry.js` owns what each weapon does. Everything unlocked but not
slotted sits on the bench: still levelling, still offered by level-up cards, one tap away
in the wheel.

The class split is a mechanic, not a label. A defensive weapon costs you no thumb, which
is exactly why its slot is a real budget rather than a second set of guns.

### Loadout Mastery — how big the loadout is at all

Slot count and simultaneity are **meta progression**, bought in the Hub as two independent
Upgrades. A new save has one offensive position holding the sidearm and **no defensive row
at all**; everything past that is earned. `MASTERY` in `systems/loadout.js` is the table.

| rank | offensive | defensive |
|---|---|---|
| **0** | sidearm only, welded into its position | no defensive slots |
| **1** | a special slot opens — it **or** the sidearm is live, never both | one slot |
| **2** | both live at once; the second position is still the sidearm | two slots, only one live |
| **3** | the second position is freed — two specials, and the sidearm can be traded away | two slots, both live |

Read them as the same ladder offset by the sidearm: a slot, then simultaneity, then the
last restriction lifted. Rank 2 offensive looks smallest and is not — your thumb aims one
weapon either way, but at rank 1 switching to the special *silences* the sidearm.

**Where a rank caps how many may run, the mid-fight tap becomes a radio switch** rather than
an on/off. The gesture never changes and the cyan border always says which one won, so the
player never has to know it changed meaning. The offensive row is never allowed to reach
zero live weapons; defensive is "up to N", so zero is legal there.

**LIVE AND AIMED ARE DIFFERENT STATES, and the offensive row needs both.** Offensive
weapons share one fire button, so from rank 2 two of them run at once and exactly one is on
the trigger. Touching an offensive module mid-fight **aims** it; touching the one already
aimed switches it off and hands the trigger to the other. `GameScene.aimWeapon` is the only
thing that moves the trigger — `normaliseActive` cannot, because it only reacts when the
current weapon has stopped being firable. Without it a full offensive row still only ever
fired its first weapon, which is exactly how it played at rank 3. A **solid cyan bar along
the bottom of an offensive module** says which one the button is pointed at; the defensive
row never draws it, because every live defensive slot acts at once and none is aimed.

**Slots only change between fights.** Equipping is live from a boss going down until you
warp into the next arena (`GameScene.canRequip`). Outside that window the wheel still
opens, still reads, and still toggles what is running — switching a weapon on or off
cannot change what you are carrying, so it is never gated.

### The re-quip wheel — TWO modes, not one control

**DRAG-AND-DROP IS OFF THE LIST, by the owner's own call.** It was on it — "drag a weapon
off the ring onto a module", asked for by name — and after playing it they asked instead
to *"simply tap a weapon and then tap a slot or tap a slot and then tap a weapon"*. Two
taps in either order is what is built. Do not reintroduce a drag as the primary
interaction without them asking again.


The wheel was one control doing two unrelated jobs, and that is what made re-quipping
feel wrong. They are now separate modes with **inverse emphasis**, so the player never has
to be told which one they are in — the brightness says it.

| | **IN-SITU** (mid-fight) | **POST-BOSS** (between fights) |
|---|---|---|
| opens | RE-QUIP button / `Q` / `E` | by itself, once the death animation resolves |
| time | slow motion, HUD stays up | hard pause, HUD hidden |
| the ring | 0.16 alpha, **not touchable** | every unlocked benched weapon at **full strength** |
| you may | aim a slot, or toggle it on/off | change what you carry |
| the gesture | one tap, or one diagonal swipe | **two taps, in either order** |
| exits | RE-QUIP again · diagonal swipe · slot tap · tap off the wheel · 7s timeout | Esc / tap away |

**The RE-QUIP button can never open the between-fights wheel DURING A FIGHT.** In a fight it
opens the mid-fight wheel on contact and a second press puts it away. It used to do both — a
leftover from the era when tap and swipe were two ways into one control — so the second tap
closed the mid-fight wheel on the way down and then opened the *hard-paused* between-fights
wheel on the way up, in the middle of a live fight. A control resting under the player's
thumb during a fight must not be able to stop the game.

**Inside the boss room, with the window open, it does open it — and that is not an
exception to the rule above, it is the rule's own boundary.** In a sealed room whose boss
is dead there is no live fight to stop. The game opens this same wheel by itself at the
start of that window, so refusing to reopen it only meant that dismissing it once cost the
player the whole window. Anywhere else the between-fights wheel is still opened by
`promptRequip`, by an unresolved drop, and by nothing else.

**BOTH HALVES OF "IN THE BOSS ROOM" ARE LOAD-BEARING — `inRequipRoom`, not `canRequip`.**
The window alone runs until the next *arena warp*, so it covers the entire walk through the
overworld to the following door, and `DEV.requipAtStart` opens it on the first frame of a
dev run before any arena has existed. Gating on the window alone therefore gave the button
the hard-paused wheel for most of a run — which is the whole failure the rule above exists
to prevent, arriving by a different door. `arena` is what makes it a room.

**It opens once the room has gone QUIET, not on a stopwatch.** `promptRequip` records that
a wheel is owed and `stepRequipWait` opens it after a clear beat with nothing left
resolving — no death animation, no screen shake, no acquire banner. Waiting on the death
alone still landed the menu on the tail of the kill, which is what "popping up too early"
looks like from the outside. A new thing worth waiting for goes in `requipBlocked`, not
into a bigger delay. **Nothing that can fail to settle may go in there** — scattered EXP
was tried and rejected, because an orb falling into a pit never comes to rest and would
hold the gate shut for the rest of the run.

**The slowdown starts on CONTACT, not once a finger passes a deadzone.** Touching the
button IS the decision to look; waiting for travel meant the dangerous part — deciding —
happened at full speed. From that one touch the player picks a route without being told
they are choosing: keep moving into a diagonal and that slot toggles, or lift the finger
and the wheel stays up to be tapped. **Lifting is not a cancel.**

**The four diagonals map onto the 2×2 grid exactly as drawn** — up-left is the top-left
module. Both axes must be real, so a flat flick can never fire a slot nobody aimed at. The
keyboard mirrors the same shape: `Q` above `Z` on the left, `E` above `C` on the right.

**PER-VISIT SCENE STATE MUST BE RESET IN `create()`.** Phaser reuses the scene INSTANCE
across `scene.start()`, so a field still holding a destroyed object looks alive to every
guard that tests it. The dev menu's boss picker died exactly this way — picking a boss
started the game without nulling `this.picker`, and `openBossPicker` bails on a truthy
picker, so the row silently did nothing for the rest of the session. `tests/scenes.test.js`
now asserts the whole class (a field nulled anywhere must be set by something `create()`
runs) and **found five more the moment it was written**: the pause panel, the wheel's
cursor and selection, the re-quip wait, the acquire banner and the exit confirmation.

**LEAVING THE POST-BOSS WHEEL TAKES A TAP IN THE CONTROLS**, not a tap anywhere. Any
scrim tap used to close it, which made the whole screen an exit button sitting a few
pixels outside every disc — a missed grab shut the wheel. The movement strip (`z3`) and
the action pair (`z4`) are where a thumb goes when it is done with a menu, so those are
the exit; Esc, jump and the RE-QUIP button still work and nothing else does anything.

**THE DISCS' TOUCH TARGET IS BIGGER THAN THE DISCS, and the number is measured.** A 6px
disc is a 12px target on a 224px playfield. At full spread the tightest adjacent pair on
the arc is 19.78px apart, so 9.89 is where neighbours would touch; `ARC_TOUCH_R` is 9.
**The drawn disc stays at 6** — growing the art would crowd the ring to solve a problem
about fingers.

**The 7-second timeout is a dead man's handle.** Slow motion with no way out is a soft
lock for anyone who opened it by accident, and the player's hands are already full.
`closeWheel` restores time down every branch.

**The ring is an OVAL** (`RING_RX` / `RING_RY`), because the playfield is 224 tall and
320–480 wide. Arc positions **fan out from the centre as weapons unlock**, spreading at the
full arc's step so a weapon lands where it will eventually live. That trades absolute
position for **relative** position deliberately — the Blaze Wheel is always left of the
Volt Spark — and it only works because re-quipping is no longer done under fire.

**Nothing you have not earned is drawn** outside dev mode: no padlocks for un-unlocked
weapons, no modules past your mastery rank. At 0/0 the wheel is one module holding the
sidearm.

### The between-fights wheel — two taps, in either order

**Tap a weapon then a module, or a module then a weapon.** The first tap of the pair only
ever *selects* — a white ring on a weapon, white corners on a module, and the modules that
would take what you are holding outlined in gold — and the second does the swap. Tapping
the same thing twice puts it down; a tap on empty space puts down whatever is in hand
before it closes anything. **There is no press-and-hold anywhere on either wheel**, and no
timed gesture at all: a hold that meant one thing and a tap that meant another, on the same
disc, was two gestures told apart by feel with no feedback until after you had committed.

The old flow equipped a weapon the instant it was tapped, into whichever slot a
`landingSlot` heuristic chose, so "tap a weapon then tap a slot" was never a sentence you
could finish — the weapon had already gone somewhere by the time you reached for the slot,
and which somewhere depended on state the wheel never showed. That function is gone.

**The gold halo means NEW, and only new.** It rings the weapon the boss just dropped —
around its disc on the ring, or around its module if it auto-equipped — and nothing else.
It used to ring every unlocked weapon, which made it a second word for "you own this" that
the disc's own brightness was already saying, and left the one weapon the player had never
seen looking like the other sixteen. `run.freshWeapon` carries it for the whole re-quip
window; `justUnlocked` cannot, because the acquire banner clears that after 2.5 seconds.

The sidearm keeps a **fixed dot above the ring**, which is its *bench*, not a free weapon:
below rank 3 it is welded into a module so the dot never appears, and at rank 3 trading it
away makes the dot show up holding it, one tap from going back in. It stays off the arc so
it never shifts the eleven learned offensive positions.

Weapons whose tracker field is still `[wip]` are classified **provisionally** so the wheel
has somewhere to put them. That is not a design decision — it gets confirmed in that
weapon's own slice.

### Balance and ladders

**Balance invariant: every weapon deals identical DPS at level 1.**
`damage = dpsTarget × cooldown/60 ÷ projectiles`. The test asserting this is deliberately
skipped until the late tuning phase — these numbers are placeholders.
Weapon choice is about *utility*, not power. If you add projectiles or pierce,
**rebalance the cooldown** — do not just raise damage.

**NO WEAPON MAY BE THE META. Never gate world content behind one weapon.**
Hidden pathways, breakable terrain, unreachable ledges and secret rooms are all fair game
— but every one of them must be openable **more than one way**, and at least one of those
ways must need no particular weapon at all. The moment a shortcut opens only for the Quake
Hammer, that hammer stops being a choice and becomes equipment you bring, every run,
forever; the two slots collapse to one and the whole loadout decision dies with them.

This is why several `[wip]` rungs that promise "break certain floors" or "reveal hidden
paths" cannot be built as written. Reaim them at things that are already optional —
furniture, enemies, positioning — or make the path openable by any heavy hit, any
explosion, any fall from height. A weapon may be the *fastest* way through something. It
must never be the *only* way.

Real feature jumps at **Lv 1 / 3 / 6 / 10** per the design tracker; intermediate levels
are damage-only. `ladderAt(id, level)` merges every rung up to the current level, so a
rung only states what it *changes*. A weapon uses the flat placeholder step until it gains
a `WEAPON_LADDERS` entry, which happens in its element's slice — never ahead of it.

**A partial ladder is legal and expected.** Frost Guard, Quake Hammer and Swarm Caller all
stop short of Lv10 because the tracker leaves those rungs `[wip]`. Level 7 then plays as
the last written rung with more damage, which is the correct degradation — the weapon is
unfinished, not broken. Fill the rung in when the owner writes it; do not invent it.

---

## Design source of truth

**`design/TRACKER.md` is canonical.** Plain Markdown, readable and editable by both of us.
It holds the 17 element slices, the elemental attributes, the SYSTEMS section, a BUGS log
and a BRAINSTORM area.

### Which source wins — read this before "fixing" a disagreement

Four things describe this game and they do NOT rank equally. When two disagree, the
higher one is right and the lower one is the bug:

| | owns | when it is wrong |
|---|---|---|
| **`design/TRACKER.md`** | what the game SHOULD be — every boss, weapon, attribute and system, field by field | never. It is the design. A `[draft]` field beats working code |
| **the code** | what the game IS | when it disagrees with a `[draft]` field — then change the code |
| **`npm run status`** | which slices are built, derived live from both | never. It computes, it does not remember |
| **this file** | the RULES the code is written under, and why | often, and silently. It is prose maintained by hand |

So CLAUDE.md states rules and rationale — "no weapon may be the meta", "sprite box is not
collision box", "never derive a gameplay value from window size". It must not become a
second copy of the design or a progress report, because both drift and neither announces
it. Anything that is a COUNT, a ROSTER or a CURRENT STATE belongs in the tracker or in the
board; anything that is a CONSTRAINT belongs here.

**Where this file names a number, it is a rule with a reason** (the 3-colour palette, the
224px playfield, Lv 1/3/6/10). Where it names an inventory, treat it as a convenience copy
and verify against the code before relying on it — three separate inventories in this file
had gone stale by the time anyone checked.

The owner edits it either directly or through the **tracker web app** (`docs/index.html`,
served from GitHub Pages), which is a lens over the same file and autosaves straight into
the repo.

**TWO APPS, ONE PAGES SITE, ONE BOOKMARK.** Pages serves `docs/` from `main`, so the
tracker is the site root and the sprite editor is `sprite-editor.html` beside it. They
share the token, the save engine and the marker vocabulary, and each links to the other in
its header — so neither has to be remembered as a URL, and adding a third tool means adding
one file plus one link.

**WHAT YOU TYPE GOES STRAIGHT TO `main`, BY ITSELF.** There is no Publish button, no
branch dropdown and no draft branch. A change is copied into the browser's own storage
the instant it is made, and written to `main` a few seconds after you stop. The status
line always says which of those two has it.

**THE BROWSER COPY IS DELETED THE MOMENT GITHUB CONFIRMS THE WRITE**, which makes one
sentence true and load-bearing: IF A BROWSER COPY EXISTS, THERE IS WORK GITHUB HAS NOT
GOT. So a page that opens and finds one knows the last session ended with something
unsent, and puts it back rather than loading the older copy over the top of it. That is
the recovery the old design had no answer for — a closed tab, a lift with no signal, a
flat battery.

**This replaced an autosave-to-a-draft-branch scheme plus a manual Publish**, which the
owner asked to be redone after losing work to it repeatedly. All three of its failures
were one root cause — A SECOND PLACE THE WORK COULD BE — so the second place is gone:

| went wrong | why |
|---|---|
| forgetting **Publish** | the work sat on `tracker-draft/<branch>`, which nothing reads. The app said "saved", and it was, just not anywhere useful |
| the **branch dropdown** | it remembered what you last picked, and the sprite editor had no picker at all — so the two apps could write to different branches with nothing on screen saying so |
| unexplained **409s** | moving work between two branches is a merge, and a merge can fail |

**Do not reintroduce a second branch, a Publish button or a branch picker** without the
owner asking for one by name. Cutting autosave noise out of `main`'s history was the
draft branch's only real argument, and it never actually did that — a fast-forward
carried every commit across, so publishing 100 autosaves put 100 commits on `main` at
once. The noise is now cut at the source instead: a save waits several seconds after
typing stops, so a writing session is a handful of commits rather than hundreds. Count
them with `git log --oneline --grep=autosave` rather than trusting a number here.

**WHEN THE OWNER IS TYPING AND YOU COMMIT, BOTH SIDES SURVIVE.** Every write from these
apps replaces the whole file, so a tab holding an older copy does not conflict — it
silently reverts. That ate seven tracker fields on 3 Sep 2026. Each write now names the
exact version it believes it is replacing, GitHub refuses it if the file has moved, and
the app combines the two: `mergeTracker` field by field, `mergeSprite` frame by frame.
**Do not remove either, and do not "simplify" a write into one that sends no version.**
`mergeSprite` earns its place for a specific reason — `npm run sprites:ship` moves
finished frames from `draft` to `ready`, and without it a sprite open in the editor
would write `draft` straight back over that.

**There is no export step and no download** — that friction was the whole problem with
the old HTML tracker, along with a JSON export built on the false premise that Claude
needed structured data to read a design doc. Both are gone.

`docs/tracker-md.js` is the ONE parser, imported by both the web app and the repo tooling.

**`docs/gh.js` is the ONE GitHub client, and `docs/autosave.js` the ONE save engine,
on the same terms.** Both apps talk to the same repo with the same token, and both used
to carry their own copy of the plumbing AND their own saving code. The copies drifted
and each ended up holding half a lesson the other needed: the tracker knew a rejected
token must not stop a READ, the editor knew a 204 has no body, and neither knew the
other's. The editor's copy of the publish dance was missing two of its four steps,
which is what produced the 409s the owner kept hitting. **Do not inline a second copy of
either** — `tests/gh.test.js` pins the read-only degradation, which is the one that
takes a whole app down when it regresses, and `tests/autosave.test.js` pins the promise
the save engine makes: work that has not reached GitHub is still there when you come
back. `tests/tracker.test.js` asserts `serialize(parse(x)) === x` byte for byte, so the
app cannot silently rewrite or drop prose it did not understand.

**The split is WHEN versus HOW.** `gh.js` is the talking-to-GitHub part and knows
nothing about timing. `autosave.js` decides when to write, keeps the browser copy until
the write lands, and combines two versions that both moved on. A change about
authentication or a status code belongs in the first; a change about losing work belongs
in the second.

**LINE ENDINGS ARE LOAD-BEARING, AND `.gitattributes` IS WHY.** Git for Windows sets
`core.autocrlf=true` in its SYSTEM gitconfig, so before that file existed every Windows
clone checked out CRLF while the index stayed LF. `\r` is a line terminator in JavaScript
— `.` will not match it and `$` will not sit before it — so `FIELD_RE` matched **nothing**,
and the whole tracker toolchain went quietly wrong rather than failing:

| | reported | actually |
|---|---|---|
| `npm run status` | `0/13` for all 17 bosses, five of them `DONE`, `[draft]: 0` | 126 fields `[wip]` |
| `npm run sync` | `boss-data.json: 17 bosses` and exit 0 | `attackName`, `weaponName`, `weaponClass` blanked on all 17 |
| `npm test` | 3 failures | — |

CI runs on Ubuntu and therefore always had LF, so none of it could ever go red there.
`.gitattributes` pins `* text=auto eol=lf`, `parse()` normalises defensively the way
`docs/sprite-fmt.js` already did, `sync-tracker.js` refuses to write when a field line
fails to parse, and `tests/tracker.test.js` asserts CRLF and LF parse identically.
**Do not remove `.gitattributes`, and do not "simplify" that normalise away.**

### Everything describable is a FIELD — the audit surface

`design/TRACKER.md` has five editable sections, and the app renders **every**
field an item carries, generically. Making something editable is therefore not a
parser change or an app change — it is writing the line in field shape:

```
- **label** `[marker]` prose
```

**`# SYSTEMS` is the home for everything that is not one boss's slice** — the
player, the loadout, the wheel, minions, HUD and controls, meta progression and
run structure. It exists because the biggest creative decisions in the project
were the only ones that could not be audited or edited from the app: the
protagonist going from blue to white, and equipment being hardware drawn ON him
rather than a palette swap, are both real design calls that lived only in code
and in this file. Most of its fields start `[ready]`, which is the honest marker
for "built and untouched since" rather than a claim they are settled forever.

**A slice's palette, scale and display names are fields too.** They were a raw
`palette ... scale ... id` strip, readable in the app and editable only by
committing. A weapon RENAME is now the `weapon name` field, not a meta-line edit.

**The `id` stamp stays raw on purpose.** It is the join key that boss-data.json,
the status board and every save depend on — so it stays readable and not
editable rather than becoming a footgun with a textbox around it. **Every id
now matches its display name, and that is exactly why it must not be DERIVED
from one**: a derivation would pass on all seventeen today and break silently
the day a name moves again. It is already wrong for Proto Mk0, whose name
slugs to `proto_mk0` and whose id is `proto`. `tools/sync-tracker.js` reads the fields and
no longer falls back to the old meta line: all seventeen slices have been in the
field shape for a while, and the fallback's only remaining effect was to make a
total parser failure look like a successful run.

**`npm run status` deliberately does NOT count the identity fields.** Its board
measures whether a boss's FIGHT is designed; folding palette and names into the
denominator would make every boss read 19/19 and destroy the signal. `DESIGN_FIELDS`
in `tools/status.js` is that list, and it stays the thirteen fight fields.

### Status markers — the implementation gate

**ONE LADDER, FOUR RUNGS, SHARED BY THE TRACKER AND THE SPRITE EDITOR.** `docs/marks.js`
is the one copy — the two apps had drifted into dialects (`todo`/`na` on one side,
`deferred` on the other) so a rule written about one did not obviously apply to the other.

| marker | meaning |
|---|---|
| `[deferred]` | The thing exists but nothing has been written or drawn for it. |
| `[wip]` | Being written or drawn. Not ready, and not to be built from. |
| `[draft]` | The owner is satisfied. **Find it and build it.** The only green light. |
| `[ready]` | Built, deploys clean, untouched since. |

**THE ASSERTION RULE: an edit moves the marker, and how far depends on how much changed.**
`markAfterEdit` in `docs/marks.js`, applied by both apps:

| you edit | it becomes |
|---|---|
| `ready`, under 50 changed | `draft` |
| `ready`, 50 or more | `wip` |
| `draft` or `deferred` | `wip` |

**The small-edit case is the whole point.** Fixing one word in a finished field used to
drop it to `wip`, where nothing looks at it — so a one-character correction could sit
unbuilt indefinitely. Under the threshold it goes back in the queue instead.

**50 is a THRESHOLD, not a measurement**, and the unit differs by medium: characters for
prose (`changedChars`, the length of the span that actually differs), pixels for a sprite
frame (`changedPixels`, cells whose ROLE changed — a palette re-tune changes every colour
and no meaning). The two are each comparable to themselves and never to each other.

**The baseline is the state when the thing was OPENED, never since the last autosave.**
Autosave fires every couple of seconds; re-baselining on it would make a long redraw read
as a hundred tiny edits. Setting a marker by hand re-baselines, because a deliberate choice
is an assertion about the current content.

**`[na]` is retired.** "Deliberately not applicable" was a fifth state off the side of the
ladder that three fields used, and each was a settled answer — which is what `[ready]`
means. **Where a field genuinely has no answer, the prose says so and the test checks it**:
Proto Mk0's weakness reads "Typeless — no elemental weakness", and
`tests/typechart.test.js` now validates that claim against the chart rather than skipping
the field. Meaning in the text beats meaning in a status, which is invisible in the app.

**Do not build from `[wip]`, and do not ask to.** Claude writes `[ready]` and never
`[draft]`.

**This is the reverse of the original scheme**, where `[ready]` was the go-ahead and
`[draft]` meant Claude-generated prose awaiting review. The owner rewrote the design in
their own words, so the "generated draft" state no longer exists and the marker was
repurposed. Comments in older code may still describe the old direction — the table above
wins, and fix the comment when you touch that file.

The BUGS table uses the same three markers: fix `[draft]` bugs, leave `[wip]` alone, and
`[ready]` means already fixed.

### Comment threads on a design artifact — the `[wip]` protocol

The owner runs design conversations as **comment threads on a published artifact**, and
those threads are how an unwritten field becomes a written one. The standing loop:

1. The owner comments on a cell, **tagging Claude** so the thread is activated.
2. Claude replies in that thread — `Artifact` with `action: "reply"`.
3. They reply, Claude replies, for as long as it takes.
4. The owner's final comment is **"move to WIP"**.
5. Claude then takes **the cell the thread is anchored to** plus **everything settled in
   the dialogue**, writes it as actionable prose into the matching `design/TRACKER.md`
   field, and marks that field **`[wip]`**.
6. The owner reviews it and moves it to `[draft]` **themselves**, in their own time.

**CLAUDE NEVER WRITES `[draft]`.** That is the whole point of the handoff. `[draft]` stays
exactly what it is everywhere else in this file — the owner's green light, applied by the
owner — so a transcription can never be mistaken for permission to build it. `[wip]` is
also the honest marker for what Claude is producing: prose that is still being written and
has not been approved. The tracker web app already drops any edited field to `[wip]`, so
this agrees with what the app would do anyway.

**One commit per "move to WIP"**, naming the field, so a bad transcription is one revert.

**Threads map to fields by their anchor.** An artifact card is a weapon and a row is a
rung, e.g. `FROST GUARD / Lv 10` → `## Frost Man — Ice` → `- **weapon Lv10**`. Verify the
anchor rather than guessing from the comment text: the anchor is a CSS path, so resolve it
against the artifact HTML before writing anything. A slice has exactly fourteen fields —
`arena`, `hazard L1/L2/L3`, `attack L1/L2/L3`, `weapon class`, `weapon`,
`weapon Lv1/Lv3/Lv6/Lv10`, `silhouette`. **A weapon RENAME is not one of them**: display
names live in the slice's meta line, which is what `npm run sync` reads.

**CLAUDE IS NOT NOTIFIED OF NEW COMMENTS** from a remote Claude Code session — nothing
arrives on its own. Either the owner says "check the comments" and Claude polls with
`action: "comments"`, or they run `claude --watch-artifact <url>` from Claude Code on their
own machine, which does deliver them. Do not promise to notice a comment as it lands.

### BRAINSTORM is off-limits

Read it for context — it says where the game is heading and stops you building something
that contradicts it. **Implement nothing from it, and never suggest promoting an idea out
of it.** The owner moves ideas into a slice themselves when they are ready to be real.

### The generated data file

`design/boss-data.json` holds only the mechanical values (palette hexes, sprite scale,
names) extracted from the tracker's meta lines by `npm run sync`. The owner never edits or
sees it. `tests/data.test.js` uses it to assert `bosses.js` has not drifted from the
design. Each slice's meta line carries an `` `id` `` stamp — that is the join key, and it is
stamped rather than derived because a derivation is wrong for Proto Mk0 today (`proto_mk0`
against a real id of `proto`) and would go wrong silently for anyone else the day a
display name changes.

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

1. **Design marked `[draft]` by the owner.** That marker is the gate, not a formality —
   a slice does not begin until the owner has written that boss's fields and moved them
   to `[draft]`. Anything still `[wip]` is not ready and is skipped, even mid-slice.
2. **Attack layers** — every layer the tracker defines, in `systems/bossFights.js`.
3. **Arena** — theme, backdrop shapes, and the furniture its hazards need.
4. **Hazard layers** — every layer the tracker defines, layer-synced with the attacks.
5. **Elemental attribute** — terrain form and character form, in `systems/attributes.js`.
   These live in the tracker's own ELEMENTAL ATTRIBUTES section, not in the slice: the
   pairs are shared across bosses and weapons, so duplicating them per slice only let the
   two copies disagree.
6. **Weapon** — the real Lv 1/3/6/10 ladder, registered in `WEAPON_LADDERS`. This is what
   flips the slice from "in progress" to DONE.
7. **Sound** for its attacks and its weapon.
8. **Overworld terrain theme** for its approach (a first pass already exists for all 17).
9. **Playtested on device, pushed to a branch.**

Art is NOT in the slice. Sprites and arena backdrops are the owner's to draw and land
whenever they land, per actor, via `MANIFEST` — the game stays playable without them.

**The player's sheet has landed** (`public/sprites/player.png`, 336×24, fourteen 24×24
frames — twelve at the handoff, and a slide that has since grown from two poses to three). It is the first real art in the game and the proof the abstraction works: landing
it changed no gameplay code. Two things it did need, and both are general rather than
player-specific — an `ActorLayer.gAboveSprites` graphics that stays above the layer's sprites (a
status flash drawn on `g` goes *behind* the art), and the jump registered as three
one-frame clips so `playerClip()` can pick the pose from `vy` instead of looping.

### Order

Proto → Blaze → Tempest first: they were the first fields the owner wrote in their own
words, and the first three establish the template. Proto Mk0 is deliberately first as the
simplest — he is Typeless, so he carries no attribute.
He is also the only boss SMALLER than the player, at 0.8x rather than the 1.75x average.

After those three the order is the owner's call. Nothing technical forces it.

## THE ROADMAP — three tracks and one convergence

**There are no phases and there is no schedule.** The dozen-phase plan is gone for the
reasons above, and a dated one would rot the same way. What does NOT go stale is the
DEPENDENCY SHAPE — what blocks what — so that is what this section is, and it is the thing
to re-read when it is unclear what to do next. **`npm run status` says where you ARE; this
says what is reachable from there.**

The work runs on three tracks. Two of them are the owner's and one is Claude's, and the
important property is that **only one of the three can block the others.**

### Track 1 — DESIGN. The owner writes fields. This is the pacing constraint.

Everything downstream of a boss's fight waits on his fields reaching `[draft]`. Nothing
Claude can do shortens this track: `[wip]` means "still being written", and building from
it would be inventing the game rather than making it.

**This is the live bottleneck and it is worth being blunt about.** When `npm run status`
reports `[draft]: 0`, Claude has nothing to build on the slice track and every code-shaped
suggestion is make-work. The honest answer at that moment is "write a field", not "let me
refactor something".

The comment-thread protocol is the pressure valve: a conversation on the artifact settles
one field, the owner says **move to WIP**, Claude transcribes, and the owner promotes it
when they are happy. That turns a blank field into a `[draft]` without the owner having to
compose prose cold.

### Track 2 — BUILD. Claude implements `[draft]`, one element end to end.

One element, built through, playtested, pushed — the slice contents are listed above. This
track is always exactly as far along as Track 1 lets it be. It is also the only track with
a hard quality gate: `hasFight` decides whether a boss is in a playtester's bag at all, so
an unfinished slice cannot leak into a playtest.

### Track 3 — ART. Fully parallel. Blocks nothing and is blocked by nothing.

This is the track most easily forgotten, because it is the one that never appears in
`npm run status`. It does not need a single design field: the `MANIFEST` abstraction means
a finished sprite drops into a game that was already playable without it, and landing the
player's sheet changed no gameplay code at all.

The pipeline is built and proven end to end — `docs/sprite-editor.html` to a `.sprite`
file to `npm run sprites:build` to the PNG the game loads. **One actor of roughly twenty is
drawn.** Bosses stay honest rectangles until their art lands, which is a deliberate look,
not a gap: silhouette design follows attack and arena design.

### Where the three converge

Only after enough slices exist to have something to tune:

| | why it waits |
|---|---|
| **Balance** | weapon damage, boss and minion HP, the ramp. `npm run sim` is the instrument and `--save` starts a history whenever the loop is worth keeping, so this is a measure-change-measure loop rather than a feel. Meaningless before there are fights to compare |
| **Physics overlay** | `FEEL_GROUPS` exists to drive it; deliberately not built early, because the motion constants are a known-good NES reference to tune AWAY from and there is nothing yet to tune them against |
| **Palette spacing** | re-run the optimisation LATE, with sprites to judge it against — see the palette rule |
| **Handing someone a build** | one switch, whenever it is wanted. `DEV.available = false` takes the launch dialog, the dev menu and every perk out together. Not a milestone — see below |

### THERE IS NO SHIP GATE. This is a personal hobby project.

Stated plainly because the absence changes how everything above should be read. There is
no release, no deadline, no minimum content bar to clear, and **no version of "behind"**.
Seventeen is the roster because seventeen is the type chart, not because seventeen is owed.

So the roadmap is a map of what is REACHABLE, never a list of what is outstanding. A boss
with no fight is not a debt; the twelve `[wip]` slices are not a backlog. Claude should
never frame them as one, never suggest a slice to "catch up", and never treat the board's
4/17 as a shortfall — it is a position, and the only thing that makes one position better
than another here is whether the owner enjoyed getting to it.

`DEV.available = false` still exists and still works as one switch. It is there for the
day the owner wants to hand someone a build, not a milestone anybody is walking toward.

**The one number still worth being curious about** is how many distinct bosses a run meets
before it starts feeling like a rotation — the bag never repeats within a run, and a late
run is 4–6 bosses, so five built fights may already be enough to notice. That is a
playtest observation to enjoy, not a gate to pass.

### Already complete (the foundation)

**Engine** — Phaser port, fixed timestep, hand-rolled physics, classic NES motion
constants, procedural terrain with traversability guarantees, themed overworld.

**The run** — sealed arenas and warp transitions, the dual boss loop, minions and the
time-keyed ramp, pickups, EXP and level-up cards, Chips and meta upgrades, the 2+2+sidearm
loadout and the RE-QUIP wheel, the per-weapon runtime, the elemental attribute framework.

**Presentation** — the sprite path (`MANIFEST`), the hand-authored bitmap font, procedural
sound, boss death animations, touch controls.

**The workshop** — and this is the part that grew most recently, because it is what makes
the three tracks above independently runnable:

| | |
|---|---|
| `design/TRACKER.md` + the tracker app | the design, editable from a phone, saving itself to `main` |
| `npm run status` | the board, derived from live code and the tracker so it cannot go stale |
| `npm run sim` | headless difficulty measurement; `--save` keeps a run and diffs it against the one before |
| `npm run smoke` | the real bundle, played in a browser, against every built fight |
| the sprite editor + `npm run sprites*` | pixel-exact templates and a role-based sprite format that survives a palette change |
| the in-app updater + per-branch CI | every push becomes an installable build; iterating costs one tap |
| the playtester content gate | derived from `hasFight` and `hasLadder`, so unfinished content cannot reach a playtest |

### What the numbers in `config/feel.js` actually are

**Two different kinds of number live in one file, and they are not equally precious.**

The core MOTION constants — walk, jump, gravity, terminal velocity, slide speed and
duration — are the classic NES Mega Man values, converted from that game's 8.8
fixed-point. They are a known-good reference feel to tune *away from*, and changing one
should be a decision rather than a nudge.

**Everything else in that file is an off-the-cuff prototype number that has never been
playtested.** Damage, HP, cooldowns, drop rates, the ramp. Treat them as a starting point,
not as data — and see the testing note on why no test asserts one.

### Run progression — as built

**Weapons are earned.** You start with the sidearm only. A special unlocks by killing the
boss that carries it (`BOSSES[].dropWeapon`). `starter_arsenal` / `twin_arsenal` are the
only head start and they cost Chips — they unlock 1 / 2 random specials at run start,
auto-slotted where Loadout Mastery leaves room, because a head start you have to go and
equip is not a head start.

**Room to put them is separately earned.** At Loadout Mastery rank 0 a special unlocks,
levels and benches with nowhere to go — the weapon is real, the slot is the purchase. A
drop into a class with no tradeable position at all does NOT open the picker; being asked
to choose a slot you do not own is worse than not being asked.

**A drop with no free slot becomes a decision.** If its class is full but tradeable, the
acquire banner is followed by the re-quip wheel opening on that choice with the new weapon
named and its class pulsing. Closing without picking benches it — a real third option,
since it keeps its level and stays one tap away.

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

### Controls — as bound

| | keyboard | touch |
|---|---|---|
| walk | `A` / `D`, arrows | left pads |
| aim up | `W` | the ↖ ↗ pads |
| jump | `SPACE` | jump pad |
| slide | **double-tap jump** | **double-tap jump** |
| fire | `RSHIFT` (either shift) | fire pad |
| pause | `ESC` / `ENTER` | the `||` plate |
| mid-fight wheel | `Q` / `E`, then `Q`/`E`/`Z`/`C` | RE-QUIP, then swipe a diagonal or tap a slot |
| close a wheel | `ESC`, or jump | tap off the wheel |

**The slide has no key of its own on either surface.** Both get it from the double-tap,
which is why the jump key has to be one a person will actually double-tap — the tracker's
`keyboard` field puts jump on space for exactly that reason.

**The jump always wins the first tap.** Detecting a double-tap before jumping would put
latency on every jump in the game, which this genre cannot afford — so the jump fires
immediately and a second tap inside `FEEL.slideTapFrames` (8) puts the player back at the
height he launched from and slides instead. It refuses when a slide could not start anyway
(Slide Mastery rank 0), falling through to the double jump. Never a dead input.

**The cancel accepts a jump that is rising OR one the player has already released.**
`FEEL.jumpCutMult` is 0, so letting go mid-rise zeroes the velocity — and a double TAP is
press, release, press, so a "still rising" test could only ever fire for someone holding
the button down through both taps. The 8-frame window is what protects the apex case: you
cannot be near the top of a nineteen-frame rise inside eight frames, and a HELD jump at
its apex has not been cut, so it still gets its double jump.

### Reporting a playtest — read this before asking the owner to describe a bug

The owner playtests on a phone with no debugger attached, so anything the game does not
draw on screen does not exist. Three things exist to make a playtest note actionable
instead of anecdotal. **Ask for them before guessing.**

**The dev HUD's third line** — `b1035 s4821 5x 412x392 dpr2.75`

| | |
|---|---|
| `b1035` | CI build. Pins an observation to a build, so "it felt better before" has a before. |
| `s4821` | the run's **world seed** |
| `5x …` | render density, the viewport it was picked from, and DPR |

That last group is not decoration. `RENDER_SCALE` is chosen once at startup from the
reported viewport (`config/display.js`), and a platform behaviour change can move it with
no code change at all — 4x to 5x is **56% more real pixels every frame**, which reads as
"it feels sluggish now" with nothing visibly different. Android 15's forced edge-to-edge
does exactly this, which is why `targetSdk` sits at 34. Ask for this line before
investigating any performance complaint.

**The crash overlay** — `systems/crash.js`. An exception in the update loop used to kill
the loop and show a frozen picture. Now it paints a full-screen report with the message, a
trimmed stack, the build, the seed and where the run had got to, and **a tap copies it to
the clipboard**. Raw DOM importing nothing from the game, installed as a side effect of
being the first import in `main.js` — imports are hoisted, so a call in `main.js` would run
after every other module had already been evaluated, too late to catch a load-time error.
Only the first error takes the screen; a dead loop throws 60 times a second.

**Seeded worlds** — `systems/rng.js`. `?seed=1234` pins one in a browser, and a reported
seed rebuilds that exact world here, so a bad gap becomes a regression test instead of a
statistical argument. Seeds are keyed on **area index**, so using the boss selector cannot
shift the worlds after it. Scope: this seeds the WORLD only. Minion spawns, drops and boss
attack choices still use `Math.random`. Full replay needs recorded input — a separate job,
and the fixed timestep already makes it reachable.

Text in the HUD goes through a 5×7 bitmap font whose `fold()` **substitutes `?` for any glyph
it lacks** — `@` is not in it. Check `FONT_CHARS` before adding punctuation to a HUD string.

### Losing a save is NORMAL. Announce it; never carry a shim to avoid it.

**By the owner's call: this game will be in development for a long time, so wiping
save data is an ordinary cost of a change, not a disaster to engineer around.** What
is NOT acceptable is losing it silently, or paying for it forever in compatibility
code that makes every later change more expensive than the save ever was.

`SAVE_BREAK` in `systems/save.js` is the whole mechanism. **Bump `n` whenever a change
makes existing saves wrong**; a save carries the number it was written under, a
mismatch is wiped on the spot, and the title screen shows `SAVE_BREAK.note` in gold on
the first launch afterwards — which is the launch right after the update that did it.

**There is no migration path and there is deliberately not going to be one.** Do not
write one, do not add a shim that reads an older shape, and do not keep a name or an id
"so saves survive" — check first, because that claim has already been wrong once. The
save holds scores, lifetime totals, boss kills, chips and upgrades. It has never held a
weapon id, and unlocks and weapon levels are run-scoped by design.

**The note is one line of at most 44 characters** and the reasons are in the constant's
own comment — read it before writing one. **If a build needs a full uninstall and
reinstall rather than a wipe, say so THERE**: it is the one line anybody reads about it.

**What this does NOT license.** The keystore and its `keyAlias` still never change — a
forced reinstall being announceable does not make one worth causing, and that rename buys
nothing. An id that is a live code-to-code join key (`BOSSES[].dropWeapon`, a slice's
`` `id` `` stamp) still stays put, because that is a real dependency rather than a save
one. The rule retires compatibility with OLD DATA, not the joins inside the current code.

### Dev mode — `src/config/dev.js`

**THE GAME OPENS ON A LAUNCH DIALOG: DEV MODE or PLAYTESTER.** That answer sets
`DEV.enabled` for the session and nothing else does. A PLAYTESTER launch is the shipped
game — `dev()` answers false to everything, the HUD carries no marker, the title screen
has no dev button, the pause menu is RESUME and ABORT RUN, and the run starts with the
sidearm at mastery 0. **The answer is deliberately not remembered**: a stale one is a whole
playtest misread as balanced while unkillable, and re-picking costs one tap.

#### A PLAYTESTER ONLY ENCOUNTERS CONTENT THAT HAS BEEN DEVELOPED

**Placeholder bosses, arenas and weapons must never reach a playtester run.** Most of this
game is unbuilt: twelve of the seventeen bosses have no attack loop and would stand still
while you shot them, and five weapons have no ladder and play as a flat damage step at every
level. A door that opens onto a motionless rectangle costs a minute of a playtest session,
teaches nothing, and reads as a BROKEN fight rather than an unfinished one — which is the
worst outcome, because it puts a bug in the notes that was never a bug.

**Dev mode still sees all of it. That is what dev mode is for.** The split is `DEV.enabled`,
so `DEV.available = false` at ship makes the gate permanent.

| | shipped path | derived from |
|---|---|---|
| **boss bag** | `PLAYABLE_BOSSES()` — only bosses with an attack loop | `hasFight` in `systems/bossFights.js` |
| **head-start arsenal** | only weapons with a real ladder | `hasLadder` in `data/weapons.js` |
| **boss drops** | need no filter — a boss you can reach is a boss that fights, and every one of them carries a laddered weapon | asserted in `tests/fights.test.js` |

**Both gates are DERIVED, never listed.** A boss joins the shipped roster on the day his
attack loop lands and a weapon becomes grantable on the day it gains a ladder, with no edit
anywhere — the same derivation `npm run sim`'s catalogue uses to refuse to score incomplete
pairings. Do not replace either with a hand-maintained list; that list is what goes stale.

`hasFight` asks about **layer 1** deliberately. `fightFor` falls back downward, so a boss
with a layer-1 attack has one at every layer — checking the floor checks all three, and it
is also the layer a new save actually meets.

**Two switches, and they are not the same switch.**

| | |
|---|---|
| `DEV.available` | compile-time. **This is the ship switch** — set it false and the launch dialog, the dev menu and every perk go with it, and `enabled` can never become true. It replaced `enabled` in that role |
| `DEV.enabled` | the launch dialog's answer, for this session only |

`?dev=1` on the URL skips the dialog and `?dev=0` forces the clean branch. That exists for
`tools/smoke.mjs`, which drives the real bundle through the keyboard and has no business
clicking through a menu to reach what it came to test.

**EVERY DEV CONTROL LIVES IN THE DEV MENU** — title screen, gold DEV plate in the corner,
present only on a dev launch. The pause menu's **DEV PANEL and BOSS SELECT are gone**; so
is the "ALSO ON" list of perks that needed a rebuild to change, because every one of them
is now a live row. A dev tool reachable by a thumb mid-fight is a dev tool that gets
pressed mid-fight, and the pause menu a playtester sees should be the one the game ships.

**Every row is one tap** — name, current value, tap anywhere on the row to advance it,
wrapping. Not steppers: a stepper is two targets and a value between them, three times the
width for the same information, and this screen fits twenty rows into 224 virtual pixels.
Row pitch is set by the thumb rather than the glyph, so a row is a 52–65 real-pixel band.

**Touching a row describes it**, two lines in the band under the left column: what the
setting does, then what its values mean. Every name here is an abbreviation — NO LOCKS,
FREE CARDS, LOADOUT NOW mean nothing to anyone who has not read the code behind them, and
a settings screen you have to be told about is one nobody uses past the rows they already
know. Reading costs nothing because every row wraps, so a tap to find out is always a tap
from where you were.

**The three WIPE rows ARM instead** — the first tap turns the row gold and reads `SURE?`,
the second does it, and a tap on any other row disarms. They delete save data that cannot
be recovered, and "tap it to see what it says" would otherwise be the most natural way in
the world to lose a save.

| row | does |
|---|---|
| **WEAPONS** | ALL / EARNED — `startUnlocked` |
| **START LV** | the rung the arsenal arrives at, 1–10. Replaces the old WEAPON LV stepper |
| **OFF / DEF RANK** | either Loadout Mastery rank, AUTO or 0–3. AUTO means `maxMastery`'s blanket 3; the numbers are the only way to feel ranks 0–2 |
| **BOSS LAYER** | AUTO / L1 / L2 / L3. An override consulted by `layerFor()`, which every `bossLayer` caller goes through — deliberately **not** a write to `save.bossKills`, because faking clears to reach layer 3 would permanently raise that boss's shipped layer on the device with no way back |
| **LAYER WRAP** | `cycleLayers` |
| **LOADOUT NOW** | `requipAtStart` — see below |
| **HP FLOOR · NO LOCKS · FREE CARDS** | `hpFloor`, `unlockAnyWeapon`, `cardsFromAllWeapons` |
| **DEBUG HUD** | the diagnostic line only. The `[DEV]` marker beside the score is **not** switchable — a playtest note that does not say it came from a dev build gets misread as balance data |
| **META rows** | CHIPS +250, WIPE CHIPS, MAX UPGRADE, WIPE UPGRADE, WIPE KILLS. These write to the save, which nothing else on the screen does |
| **BOSS PICKER** | any of the 17 — starts a run with his door a short walk ahead |

Settings persist in their own `megadash_dev_v1` key, **not in the save**, so a playtester's
save can never be shaped by a setting they cannot see. `fullReset` clears both.

**THE LOADOUT WHEEL IS GRANTED AT RUN START** (`requipAtStart`, the LOADOUT NOW row). Dev
mode still does **not** bypass `canRequip` — a loadout change is an event you earn, and a
playtest that could re-quip at will was never testing the thing being designed. So instead
the run *opens* on the real between-fights wheel: same control, same window, same rules, granted
rather than skipped, and it shuts on the first arena warp like any other. **That is also
the answer to re-quipping mid-run — abort the run**, which is the trade the owner asked
for. Esc or a tap off the wheel dismisses it.

**Boss picker** — dev menu → BOSS PICKER → any of the 17. It starts a run with that boss's
door a short walk ahead, deliberately outside the door rather than inside the arena: the
warp, the fade and the room building on the far side all need testing too. The choice is
**consumed**, so a plain START from the title is never quietly redirected to a boss picked
twenty minutes ago. This exists because element-slice development means fighting one boss
repeatedly, and reaching him normally costs a 60-second door timer plus a shuffle bag that
might not offer him for sixteen doors.

**Level 1, not level 10, by default.** The whole arsenal is on the table so it can be
slotted and compared; the ladders still have to be climbed, because a weapon handed over
at its top rung says nothing about whether the rungs below it are worth having. START LV
is there for when a specific rung *is* the thing being tested.

`maxMastery` is a genuine bypass of meta progression rather than a shortcut around grind,
and it earns that because every weapon in the game is reached through the loadout — a
rank-0 playtest can only ever see one weapon at a time, which would gate the slice loop
behind a Chip grind unrelated to the slice being built. The cost is that it cannot tell you
how ranks 0–2 feel; set OFF/DEF RANK to a number when balancing the ladder itself.

`startUnlocked` also hides the acquire sequence: a boss only grants a weapon you do not
already have, so nothing ever fires the acquire banner or the slot-choice picker. Switch
it off to test that.

**Layer cycling** — `bossLayer(save, id, cycle)`. Shipped behaviour clamps at layer 3
forever, because a boss beaten five times must not become easy again. Dev mode wraps
instead: encounter 4 is encounter 1 again (4=1, 5=2, 6=3), so every layer stays reachable
however many times you have already won. Each tile in the picker shows the layer you will
actually get. **The game logic is written as if none of it exists** — weapons are genuinely
gated, spikes genuinely kill.

### The dual boss loop — as built

The dual-loop plumbing is live: `GameScene.stepBoss()` drives an attack loop and an
ambient hazard loop side by side every frame, both layer-synced, both fed from
`systems/bossFights.js`. Sealed arenas, warp in/out, screen shake and enemy projectiles all
work.

**Which bosses are built, and to which layers, is `npm run status`.** It reads
`systems/bossFights.js` and the tracker directly, so it cannot go stale — unlike the table
that used to sit here, which said Strike Man had no attacks for a third of a year after
they were built. This file states RULES; the board states STATE. Do not put a progress
table back.

**A ROOM MAY HAVE A BEAT, and Volt Man's does.** `arena.beat` / `arena.beatN` are derived
from the room's own clock (`arena.t`) rather than counted separately, so a second timer can
never drift from the first, and every arena carries them at no cost to a room that ignores
them. Volt Man's field asks that "all furniture, hazards, and boss layer attacks shall be
synched to a common 1s beat": his platform sets, panel sweep, speaker membranes and attack
wind-up are all whole multiples of it. **State a beat-locked duration in beats, not frames**
— the tracker states them in seconds and a beat is a second, so the two then agree by
construction instead of by arithmetic someone has to redo.

**The speakers are the beat made visible, and that is not decoration.** A room where
everything happens on a rhythm is only fair if the rhythm is something you can see without
reading the hazard that is trying to kill you.

**`arena.dim` is the room losing power; `arena.flash` is something in it going off.** They
are opposite gestures and must stay separate — one subtracts light and holds, the other adds
it and clears. **Anything that EMITS light draws after the dim**, which is why
`drawArenaBolts` is exported and called from `GameScene.draw` rather than living inside
`drawArena`: a bolt drawn with the rest of the room was the one thing in the scene being
dimmed hardest, and "luminous" then meant nothing.

### Boss weaknesses — the Gen 3 type chart, and it must be the Gen 3 one

Every slice carries **`boss weakness A`** and **`boss weakness B` (optional)**: the one or
two elemental types that this boss's ARENA reacts to in a way no other type does. They are
dropdowns in the tracker app, and they are design, not combat maths — nothing multiplies
damage. Two are already built and both fall straight out of the chart: Thorn Man (Grass) is
weak to **Fire** and **Bug**, so Hot burns his ground cover down for three times as long and
a Swarm Caller bug never expires in his greenhouse; Strike Man (Fighting) is weak to
**Psychic**, so a psychic hit lifts a training bag and drops it on him.

**`src/data/typechart.js` is the chart, and the GENERATION is load-bearing.** Gen 2 through
Gen 5 share one table; Gen 1 and Gen 6 do not. The rows that differ are exactly the rows a
reconstruction gets wrong, so `tests/typechart.test.js` asserts them by name — **Steel
resists Ghost and Dark** (dropped in Gen 6), **no Fairy**, **Poison beats Grass and nothing
else**, **Bug is resisted by Poison** (reversed from Gen 1), **Ghost beats Psychic** (a Gen 2
fix). A test also checks every pick in the tracker is a real weakness of that boss and that
the app's copy of the type list has not drifted. Do not hand-edit the chart to match a
modern one; the tests will name the generation you just moved to.

**The seventeen bosses are this chart's own type list with Normal swapped for Typeless.**
Normal is super effective against nothing, so nothing can be weak to it — which is why it is
absent from the dropdown, and why Proto Mk0 carries no weakness at all.

**`npm run status` does not count these fields.** Its board measures whether a boss's FIGHT
is designed; the weakness is identity, like the palette and the scale.

**Arena furniture is a tracker field.** Every slice carries `arena furniture` beside its
`arena`, because furniture is design — it varies per boss and can vary per layer (Blaze
Man's lift exists only at L3, Volt Man's conductors only fire from L2) — and it belongs
next to the hazards and attacks that need it rather than in a list over here. `FURNITURE`
in `systems/arena.js` is what builds it.

**Several entries have been rewritten rather than extended, and they matter as
precedent — where working code and a `[draft]` field disagree, the field wins.** Tempest
Man's attack had been a patrolling water cannon; the tracker's attack layers describe a
Queen B flight pattern with no projectile at all, so the cannon went. Blaze Man's layer-3
flood ran for 30 seconds and cancelled the rockfall; the tracker says 20 seconds and
"rocks shall fall, but not from right above the platforms". Volt Man's sweep had been
speeding up at L2; the field says "same sweep", so it no longer does. The **Astral
Cloak** went further and changed class outright — a provisionally-offensive boomerang
became a defensive cloak, because that is what its field now describes.

**A revision can force a change in a neighbouring `[ready]` field.** Blaze Man's L1 went
from "several" fireballs to "a couple", which makes L2's "fewer fireballs" false unless L2
drops too — so L1 is 2 and L2 is 1. That number is an inference, flagged at the constant.

`systems/attributes.js` implements the elemental attribute layer. Hot (terrain) / Burn
(character) are live on Blaze Man and the Blaze Wheel; **Stun** is live on Volt Man's
panels and conductors, the Volt Spark and the Quake Hammer's impact; **Freeze** is live on
Frost Guard; **Constrict** is live on Simon's Whip (id `simons_whip`) from Lv3, where it holds a minion through its own toss. Wet and Poisoned are defined
and tested but nothing applies them yet, because their sources are weapons whose slices
have not happened.

`cloakHold` is in the ATTR table but is **not** an elemental attribute and is deliberately
not in the tracker's list — it is the Astral Cloak's aggro pause, which is mechanically a
hold and nothing else. It reuses the hold machinery so every consumer already honours it
and carries no tint, because there is nothing elemental to show.

**Stun, Constrict and Freeze are ONE mechanic in three colours.** All three are a stacking
multiplicative slow — 15% per stack off the player, 30% off an enemy, duration reset by
every re-application, cutting attack speed as well as movement. Constrict and freeze used
to be the "cannot act" pair and the tracker reversed that: they are now "functionally the
same as stun", differing only by an elementally correct tint.

**Nothing elemental holds any more.** `cloakHold` is the only remaining hold, and it is
deliberately not an elemental attribute.

---

## Hooks left deliberately empty — fill, don't delete
- `bossFights.js` `hazard:` / `attack:` entries set to `null` → per-boss, per-layer content
- `WEAPON_LADDERS` rungs a weapon does not have → the tracker leaves them `[wip]`
- `player.diagInput` (`'ul'` / `'ur'`) → reserved diagonal special moves
- `MANIFEST` in `systems/assets.js` → real art
- `silhouette: null` in `bosses.js` → deferred by design

---

## Where a file goes

**`data/` is TABLES. `systems/` is BEHAVIOUR. `config/` is TUNING. `scenes/` ORCHESTRATES.**
The codebase already had this pattern and stated it nowhere, so it drifted.

Minions are the model: `data/minions.js` is the two rows, `systems/minions.js` is the
spawning and the ramp. Weapons the same — `data/weapons.js` is the roster and the ladders,
`systems/weaponry.js` is what each one does per frame.

**`bossFights.js` broke it and has been moved to `systems/`.** It is 2,100 lines with
twenty-four behaviour functions and one table; every other file in `data/` is the reverse.
A reader who opened `data/` expecting tables found the largest state machine in the game.

**A scene should read as a list of the things it coordinates**, not as the place the work
happens. `GameScene` is the biggest file in the project and that is a smell rather than a
rule violation — much of it is genuinely per-frame orchestration — but new pure logic goes
in a system and gets called from the scene, never added to it.

**An export is a promise.** A helper only its own module uses must not be exported: the
export list is how a reader tells the module's API from its plumbing, and twenty-nine
helpers were exported for no reason before anyone looked. Un-export by default; export when
a second file genuinely needs it.

## Conventions

**WHEN TOUCHING WHEEL OR MENU LAYOUT, RENDER IT — DO NOT COMPUTE IT.** Pixel arithmetic off
assumed glyph metrics has put things on top of each other three times in this project's
history. The font's advance is ~7px, not the 5px the glyph suggests, and the rendered line
box is taller than 7px. `tools/smoke.mjs` already serves `dist/` in Chromium; a throwaway
script that opens a panel and screenshots it at both 320 and 480 virtual width costs a
minute and settles it.

**Two knobs the owner expects to tune after playing:** `FEEL.slideTapFrames` (the
jump→slide cancel window, currently 8) and `MID_FIGHT_TIMEOUT_MS` in UIScene (currently 7000).


- **Held touch inputs are tracked at scene level, never via a zone's `pointerout`.** A
  thumb drifting outside a 44px pad is normal on a phone; cancelling on it made movement
  die in mid-air. A held input ends when the finger lifts, not when it wanders.
- **Every scene calls `fitCamera()`** (`systems/text.js`). Text legibility comes from
  RENDER_SCALE giving the canvas real pixels to draw into, and from the font being a
  BITMAP — a bitmap glyph has no resolution to raise. This entry used to describe a
  `TEXT_RES` that HUD text set as `resolution:`; that was true of the Phaser `Text`
  objects the HUD used before the hand-authored font landed, and nothing has set
  `resolution:` since. The constant outlived its callers by months and has been removed.
- A hand-authored **bitmap font** is the eventual answer for a pixel game and is on the
  art list. The density fix holds until it lands.
- Comments explain **why**, not what. Phase-boundary and deliberate-stub comments exist
  so future sessions don't "fix" intentional placeholders — keep that habit.
- Boss/weapon ids are lowercase snake (`astral_cloak`); display names UPPERCASE.
- Colours are `#RRGGBB` strings in data, converted with `hexNum()` at draw time.
- Run `npm test` before committing. The whole suite is ~0.1s.

### Fixing a bug: check its history before you size the fix

Lazy but not wrong. Before writing fix code, find out whether this bug has
happened before and whether it can happen again — `git log -S` the symptom,
read the comments around the code, check whether a sibling caller has the same
hole. That answer sizes the fix. A one-off with no path back needs the smallest
correct change and no scaffolding; a bug that has already bitten twice, or that
a whole class of callers can hit, earns the guard AND the check that fails if it
returns. Deciding that from the history is the difference between a proportionate
fix and an elaborate one defending against nothing.

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
