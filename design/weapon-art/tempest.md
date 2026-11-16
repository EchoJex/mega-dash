# Tempest Man — art brief

Read `design/weapon-art/README.md` first: it says how drawn art with its own timing works in
this game, what you may change and what to hand back. This page is Tempest Man himself, the
Water boss.

**His sheet is a placeholder.** The plain block he is drawn as today, with one white eye
and his grey jetpack added, has been painted into it. The sheet, its size, its pivot, every clip and every hold
are real: the game plays them exactly as drawn. To see him, play a dev build and pick
TEMPEST in the dev menu's BOSS PICKER. BOSS LAYER L2 and L3 show two and three dives in a row.

## What he is, in the owner's words

"Blue yellow guy with a large grey hydro jet pack. The grey is NOT one of his three palette
colours — blue, yellow and the shared outline spend all three. The jetpack is a separate
object attached to his back, carrying its own greys, drawn whether or not he is thrusting."

His attacks, rewritten by the owner on 14 Nov 2026 (the tracker's `attack L1` to `attack L3` have the words):

- **Layer 1.** He hovers around the room, dropping spike balls that splash into the water and drift to
  the drain. His tank drains while he is in the air. When it is empty he goes to the nearest wall,
  sets down slowly on his jets, stands while the tank refills, then hops and rises again.
- **Layer 2.** The same, and sometimes, instead of the hop, he squats and charges across the floor
  first.
- **Layer 3.** The same as layer 1, except that on an empty tank he goes to the nearest corner, waits
  1.5 seconds, and divebombs onto where the player was. The divebomb throws up a wave each way, three
  times his height.

Touching him hurts. The water from his pack pushes the player and stops the player's shots. The game
draws the water, the waves, the spike balls and, for now, a plain tank bar over his head: blue for
what is left, black with a red X whenever it is empty.

His room is a storm: dark cloud banks, lightning, heavy rain that changes direction, steel
pipes in the upper corners pouring into ankle-deep water, and a central drain with a spike
ball. It is dark blue and grey all over, so **he has to stand out against dark blue**: his
own blue is close to the room's. Lean on his yellow, a light rim, or bright shades.

**Every boss has a single eye.** The owner's rule, in their words: "all bosses will have a
common theme of a single 'eye'. This theme should be interpreted with very wide creativity."
Strike Man's and Thorn Man's are the examples they liked (Thorn Man's is one glowing slit in
his hood).

**The jetpack is part of his body**, the owner's answer of 11 Nov 2026 ("Part of his body"):
draw it into every frame, with its two nozzles pointing where the water goes in that move.
**The game draws only the water**, in plain shapes for now, over him: about 30 pixels of it,
going the way he is not.

## Every move, and the clip that shows it

| clip | when the game plays it |
|---|---|
| `idle` | as he beams in, before the fight starts; also the picture his death flashes |
| `fly` | hovering high up, drifting from wall to wall with a slow bob, and heading for the wall on an empty tank; the water goes out behind him |
| `land` | layers 1 and 2, tank empty: setting down slowly by the wall; the water goes straight down |
| `refill` | standing on the floor while the tank fills; the water is off |
| `hop` | the wind-up before he lifts off; its length is how long the wind-up lasts; the water goes straight down |
| `climb` | rising to cruising height after the hop; the water goes straight down |
| `squat` | layer 2: the crouch before his charge; its length is how long the crouch lasts; the water is off |
| `dash` | layer 2: the charge across the floor; the water goes out behind him |
| `tell` | layer 3, tank empty: hanging in the corner, looking at the player, for 1.5 seconds before the divebomb; its length is the wait; the water goes straight down |
| `dive` | layer 3: the divebomb onto where the player was; the water goes out behind him |

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- His colours: primary `#145DBD` (blue), secondary `#F5C518` (yellow). Shades come from
  those two. Grey is the jetpack's.
- About 1.5 times the player's height (the player is 24 pixels tall), a below-average build.
- **He replaces his plain block**, hanging on the pivot. Draw him facing right; the game
  mirrors him to face the way he flies, and during `tell` to face the player.
- **Nothing is picked yet.** The owner picks his look from variants on a design canvas, part
  by part, as they did for Thorn Man, before the sheet is drawn in full.

## The contract

Everything below is generated from the sheet by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`boss-tempest-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-tempest-body.sprite) | 64×64 | 32, 56 — the point under the middle of him (under his feet as he flies) | in place of the boss | idle, fly, tell, dive, climb, land, refill, hop, squat, dash, slam |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**boss-tempest-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| idle | loop | 30 | 30 | — | — | 7, 27 |
| fly | loop | 12 | 12 | — | — | 7, 27 |
| tell | once | 45 · 45 | 90 | — | — | 7, 27; 7, 25 |
| dive | loop | 4 · 4 | 8 | — | — | 7, 27; 7, 28 |
| climb | loop | 8 | 8 | — | — | 7, 28 |
| land | loop | 8 | 8 | — | — | 7, 27 |
| refill | loop | 30 | 30 | — | — | 7, 27 |
| hop | once | 10 · 10 · 10 · 10 · 10 · 10 | 60 | — | — | 7, 27; 7, 24; 7, 27; 7, 27; 7, 27; 7, 28 |
| squat | once | 2 · 2 · 8 · 12 | 24 | — | — | 7, 29; 7, 29; 7, 29; 7, 30 |
| dash | loop | 4 · 4 | 8 | — | — | 7, 29; 7, 30 |
| slam | once | 8 · 14 | 22 | — | — | 7, 33; 7, 30 |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit; **travel** loops while the move carries him; exactly one frame carries hit=x,y,w,h — from the step that frame first shows, that area hurts until the move ends.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **he hangs on the pivot**, the point under the middle of him. His collision box (what the player's shots hit, and what hurts to touch) is 27 wide and 36 tall, centred on the pivot and standing on it; draw his body to fill about that. Touching him is the only way his own moves hurt, so what looks solid should be inside that box and what sticks out of it (spray, a scarf) should look like it would not hurt.
- **three clips are waits, and their lengths are how long he waits**: `hop` is the wind-up before he lifts off the floor, `squat` the crouch before his layer-2 charge, and `tell` the 1.5 seconds he hangs in a corner before the layer-3 divebomb. `tell` is all the warning the divebomb gets, so it has to read at a glance.
- **what each clip shows**: `fly` hovering and drifting; `land` setting down slowly on his jets; `refill` standing on the floor while the tank fills; `hop` then `climb` lifting off and rising; `squat` then `dash` the charge along the floor; `tell` then `dive` the divebomb, which ends on the floor and throws up a wave each way.
- **nothing on this sheet hits or spawns**: no `hit=` and no `spawn=` on any frame.
- **the jetpack is part of his body** (owner, 11 Nov 2026), drawn in every frame: "a large grey hydro jet pack", grey that is not one of his colours, with two nozzles. In each clip the nozzles point where the water goes in that move: down in `idle`, `tell`, `land`, `hop` and `climb`, out behind him in `fly`, `dive` and `dash`, and shut off in `refill` and `squat`.
- **the game draws the water, not the pack.** It starts at 32, 47 in the sheet's pixels (the middle of him, three quarters of the way down) and runs about 30 pixels the way he is NOT going. It pushes the player and stops his shots, so it has to look like it comes out of the drawn nozzles: keep them within a few pixels of that point.
- **he has a single eye** (the owner's rule for every boss, to be interpreted with very wide creativity).
- **colours**: Tempest Man's blue `#145DBD` and yellow `#F5C518` with shades built from them and the near-black outline. Grey belongs to the jetpack only.
<!-- /generated:contract -->

## Handing this boss to Claude Design

<!-- generated:prompt -->
Every sheet of the TEMPEST MAN is finished art, so there is no prompt to paste.
<!-- /generated:prompt -->
