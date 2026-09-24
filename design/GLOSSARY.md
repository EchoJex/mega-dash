# MEGA DASH — GLOSSARY

The vocabulary the tracker, the sprite editor and the code all use. If a word here
means something different in a field you are writing, the word is wrong, not the field.

**If you meet a word in the code, in CLAUDE.md or in a tracker field that is not on this
page, that is a bug in THIS FILE.** Say so and it gets added. Nothing in this project is
allowed to need a word only its author knows — a name that has to be explained in person
is a name that will be wrong in six months and nobody will notice.

---

## FRAMES ARE STEPS. This is the alias, and it is the important line on the page.

**When you write "hold for 10 frames" in a tracker field, you mean 10 STEPS**, and the
code will read it that way. Both words point at the same unit: **one 1/60th of a second
of the game's simulation clock.**

They are aliases because the game must play identically at any refresh rate. A 120Hz
phone paints twice as often as a 60Hz one, and if "frame" ever came to mean "one repaint"
the same animation would run at half speed on half the devices. So the game has exactly
one clock, every duration is counted in it, and the screen just shows whatever the clock
has reached.

| you might write | it means |
|---|---|
| 10 frames | 10 steps = 1/6 second |
| 30 frames | 30 steps = half a second |
| 60 frames, 1 second, 1 beat | 60 steps |

The only place the distinction matters is **screen refresh**, and nothing you write
should ever mean that. Say "steps" when you want to be unambiguous; say "frames" when
it reads better. Nobody has to translate.

---

## Timing

| term | meaning |
|---|---|
| **step** *(alias: frame)* | 1/60s of the simulation. Every duration in the game is a whole number of these. |
| **screen refresh** | One repaint of the display — 60 or 120 a second depending on the phone. Never a unit for design. |
| **hold** | How many steps one drawn picture stays on screen. Your slide is 3 then 23. |
| **fps** | The old way of spelling hold: one number for a whole sheet. 12fps means every picture holds 5 steps, because 60 ÷ 12 = 5. It is the same idea with less control. |
| **cycle** | One pass through an animation. The run is 6 pictures × 5 steps = 30 steps. |
| **beat** | One second — 60 steps. Volt Man's room runs on it. |

## Pictures

| term | meaning |
|---|---|
| **sprite** | One drawable thing: the player, a boss, a bullet. |
| **drawn frame** | One picture. `[run 3]`. (Here "frame" means a picture, not a unit of time — the two senses never appear in the same sentence.) |
| **pose** | A picture meant to be held still rather than cycled. The three jump pictures are poses, chosen by how fast you are falling. |
| **action** | A named group of pictures: `run`, `idle`, `slide`. One plays at a time. |
| **index** | Which picture within that action, starting at 1. |
| **clip** | The name the game asks for when it wants an animation. "Play his `slide` clip." |
| **sheet** | All of a sprite's pictures in one PNG strip. |
| **grid / cell** | The fixed box each picture is drawn in. Player 24×24, bullet 16×16. |
| **anchor** | Which part of the picture sits at the character's position. Feet on the ground for actors, middle for bullets. |
| **role** | A pixel is stored as *primary / secondary / outline*, never as a colour. Re-tune the palette and every sprite recolours. |
| **silhouette** | The drawn shape, ignoring transparency. |
| **collision box** | The invisible rectangle the game uses for hits. Deliberately not the same as the drawing. |
| **fudge factor** | The ratio between the two. 0.70 wide, 1.00 tall. |

## A run, start to finish

| term | meaning |
|---|---|
| **run** | One playthrough — title screen until you die or quit. Almost nothing survives it: you keep Chips and boss layers, and lose weapons, levels and EXP. |
| **area** | The scrolling outdoor stretch between boss doors. Built fresh every run, so no two walks cover the same ground. |
| **door** | What you walk into to start a boss fight. It turns up on a timer as the area scrolls. |
| **arena** | The boss room. Exactly one screen wide, walls both sides, no ordinary enemies — so the whole fight stays in view and the camera never has to choose. |
| **warp** | How you get into the arena. The screen freezes and fades rather than you walking through the door, so the room is never seen half-built. |
| **layer** | How hard one particular boss fights, 1 to 3. It rises with how many times you have beaten **him**, and never falls back. |
| **the bag** | How the next boss is picked. All seventeen go in, one comes out, and none repeats until the bag empties. Borrowed from how Tetris picks pieces. |
| **ramp** | Difficulty rising with how long the run has lasted. Keyed to TIME, not distance — standing still does not pause it. |
| **slice** | One boss built all the way through: his fight, his room, his hazards and his weapon. The unit of work on this project, and why the plan is "one element at a time". |

## Hitting, and being hit

| term | meaning |
|---|---|
| **hurtbox** | The invisible rectangle where a character CAN BE hurt. |
| **hitbox** | The invisible rectangle that DOES the hurting. Two words one letter apart, which is unhelpful and is what the industry calls them. |
| **i-frames** | Short for *invulnerability frames*: the moment after taking a hit where nothing can hit you again. It is why you flicker. |
| **flinch / knockback** | The stagger and the shove that every hit causes. Present on every hit regardless of element — they are NOT status effects. |
| **beam out** | What a pit or a spike bed does to you: massive damage, then lifted off the screen and set down at the nearest safe spot. Never an instant death, and it is what stops spikes being walkable. |
| **projectile** | A bullet — a thing that travels and can be dodged. |
| **hitscan** | A weapon with no bullet at all: it hits instantly wherever you aimed. The Volt Spark is one. |
| **puff** | The little burst drawn where something landed. A hitscan weapon has no bullet to draw, so its art hangs off a puff instead. |
| **attribute** | An elemental status — Burn, Wet, Stun and so on. Each has a **terrain form** (the ground is Hot) and a **character form** (you are Burning). |

## Enemies

| term | meaning |
|---|---|
| **minion** | An ordinary enemy. There are exactly two, and they are weather rather than events: SPIGLET walks the ground, DRIFTER floats. |
| **elite** | A tougher version of a minion, same size and shape, told apart by a gold outline. |
| **boss** | One of the seventeen, one per element. An event, met behind a door. |
| **hazard** | The room hurting you on its own timer, separately from the boss. Every arena runs both at once. |
| **furniture** | The things built into a boss room that its hazards need — platforms, turrets, conveyors. |

## Weapons, and what you are carrying

| term | meaning |
|---|---|
| **sidearm** | The gun you always start with. It takes up one of your offensive slots rather than riding above them for free. |
| **special** | Any of the seventeen boss weapons. You get one by beating the boss who carries it. |
| **slot** | A position in your loadout that a weapon sits in. You have at most two offensive and two defensive. |
| **bench** | Where an unlocked weapon sits when it is not in a slot. It still gains levels there and is one tap from going in. |
| **class** | Whether a weapon is **offensive** (shares the fire button, you aim it) or **defensive** (runs by itself — a drone, a shield, a jetpack). |
| **live / aimed** | Two different things. Several weapons can be *live* (running); exactly one offensive weapon is *aimed* (on the fire button). |
| **ladder / rung** | A weapon's list of upgrades by level. Each **rung** — levels 1, 3, 6 and 10 — adds a real feature; the levels between just add damage. |
| **mastery** | The meta upgrade that decides how many slots you own at all, and how many run at once. Rank 0 to 3, bought separately for each class. |
| **re-quip** | Changing which weapons are in your slots. Coined here; it just means re-equip. |
| **the wheel** | The screen where you do it. Two modes: the **mid-fight wheel** (slow motion, aim or switch off a slot, nothing else) and the **between-fights wheel** (hard pause, actually swap weapons). |
| **in-situ** | RETIRED. It was the code's name for the mid-fight wheel — Latin for "in place" — and you will still meet it in commits before the rename. It means `midFight`, and its timeout is now `MID_FIGHT_TIMEOUT_MS`. |
| **post-boss** | RETIRED, same way. The between-fights wheel, `betweenFights` in the code. |

## What you earn

| term | meaning |
|---|---|
| **EXP** | Dropped by enemies, and you have to walk over it to collect it. 100 makes a level. |
| **level** | Your level THIS RUN. It buys a weapon upgrade from a card screen, and it is gone when the run ends. |
| **weapon level** | Separate, per weapon, 1 to 10. What climbs a ladder. |
| **Chips** | The currency that SURVIVES a run, earned from score and boss kills. Never called Bolts. |
| **Upgrade** | A permanent boost bought with Chips in the Hub. Twenty-five of them. |
| **meta** | Anything that outlives a single run — Chips, Upgrades, boss layers. The opposite of *run-scoped*. |
| **E-Tank** | A health refill. A pickup, and also one of the level-up cards. |

## The pipeline

| term | meaning |
|---|---|
| **source** | The file you edit: `design/sprites/player.sprite`. Text, diffable. |
| **build output** | The file the game reads: `public/sprites/player.png`. Never edit directly. |
| **build** | `npm run sprites:build`. Turns sources into outputs. |
| **MANIFEST** | The game's list of what art exists. Generated for you now. |
| **promote** | Move a marker up: `draft` → `ready`. What `npm run sprites:ship` does. |
| **gate** | A rule deciding whether something reaches the game. `wip` frames are gated out. |

## Markers

The ladder, in both tools: **deferred → wip → draft → ready**.

| marker | meaning |
|---|---|
| **deferred** | The field exists; nothing written or drawn yet. |
| **wip** | Being written or drawn. Not to be built from. |
| **draft** | You are satisfied. **Find it and build it.** |
| **ready** | Built, deploys clean, untouched since. |

Editing moves the marker: a small change to `ready` (under 50 characters, or under 50
pixels) drops to `draft` so it gets re-checked; anything larger drops to `wip`.

## Words from the engineering side

| term | meaning |
|---|---|
| **derived** | Worked out fresh from the real source every time, never typed by hand — so it cannot go stale. |
| **drift** | Two copies of one fact disagreeing because someone updated one. Most rules in CLAUDE.md exist to prevent it. |
| **invariant** | A relationship that must always hold whatever the numbers are. "The slide's holds sum to the slide's duration" is one. |
| **guard** | A check that refuses to proceed when something is wrong. |
| **regression** | Something that worked and broke. A *regression test* fails loudly when it does. |
| **mutation test** | Deliberately breaking code to confirm the test catches it. A test that cannot fail protects nothing. |
| **round-trip** | Read a file, write it back, check it is byte-identical. Proves nothing was quietly mangled. |
| **fallback** | What happens when something is missing. Good: a boss with no art draws a rectangle. Bad: the page goes blank. |
| **whole-file PUT** | Every save replaces the entire file — so an old browser tab saving over new work is a silent revert, not a conflict. Reload before you draw. |

---

## Where these live in the apps

Both shots are the real apps with the glossary's words laid over the controls they name.
They are regenerated by `tools/glossary-shots.mjs`, so they cannot drift from the UI.

**The tracker** — a field, its marker and its prose. Whichever field the shot lands on, the
three parts are always the same: the label, the dropdown holding its marker, and the text.
The caption used to name one field and one marker; the generator picks the row itself, so
the caption was wrong the moment that field moved on.

![the tracker, labelled](glossary-tracker.png)

**The sprite editor** — sprite, action, index, marker and hold across the header, with the
cycle cost along the bottom. The hold box reads in **steps**; write "frames" in a field if
you prefer, it is the same unit.

![the sprite editor, labelled](glossary-editor.png)
