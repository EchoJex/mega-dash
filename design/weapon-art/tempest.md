# Tempest Man — art brief

Read `design/weapon-art/README.md` first: it says how drawn art with its own timing works in
this game, what you may change and what to hand back. This page is Tempest Man himself, the
Water boss.

**His sheet is a placeholder.** The plain block he is drawn as today, with one white eye
added, has been painted into it. The sheet, its size, its pivot, every clip and every hold
are real: the game plays them exactly as drawn. To see him, play a dev build and pick
TEMPEST in the dev menu's BOSS PICKER. BOSS LAYER L2 and L3 show two and three dives in a row.

## What he is, in the owner's words

"Blue yellow guy with a large grey hydro jet pack. The grey is NOT one of his three palette
colours — blue, yellow and the shared outline spend all three. The jetpack is a separate
object attached to his back, carrying its own greys, drawn whether or not he is thrusting."

His attack: "Boss flies around the stage just like the attack pattern of Queen B from DKC
at full health. Player takes moderate damage from contact with boss. Jetpack pushes the
player in the direction of the water's travel and blocks player bullets." Layers 2 and 3 are
the same flight, like Queen B damaged and at critical health: faster, with less rest, and
two and then three dives in a row.

Inspired by that flight pattern, not a copy: draw an original character, not any existing one.

As built, he never shoots. He cruises high up, side to side; stops and sinks a little (the
warning); crosses the room at the height the player was at; then climbs back. Touching him is
what hurts. The water from his pack pushes the player and stops the player's shots, so the
safe place is behind him.

His room is a storm: dark cloud banks, lightning, heavy rain that changes direction, steel
pipes in the upper corners pouring into ankle-deep water, and a central drain with a spike
ball. It is dark blue and grey all over, so **he has to stand out against dark blue**: his
own blue is close to the room's. Lean on his yellow, a light rim, or bright shades.

**Every boss has a single eye.** The owner's rule, in their words: "all bosses will have a
common theme of a single 'eye'. This theme should be interpreted with very wide creativity."
Strike Man's and Thorn Man's are the examples they liked (Thorn Man's is one glowing slit in
his hood).

**The game draws the jetpack and its water**, in plain shapes, over this sheet. Its two
nozzles swing to point where the water is really going: straight down when he hovers, out
behind him when he flies. Whether the pack gets a drawn sheet of its own, and how it turns, is
for the owner to settle on the canvas.

## Every move, and the clip that shows it

| clip | when the game plays it |
|---|---|
| `idle` | as he beams in, before the fight starts; also the picture his death flashes |
| `fly` | cruising high up, drifting from wall to wall with a slow bob |
| `tell` | the warning before a dive: he stops dead, sinks a little and looks at the player |
| `dive` | crossing the room at the player's height |
| `climb` | rising back to cruising height after the last dive |

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
| [`boss-tempest-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-tempest-body.sprite) | 64×64 | 32, 56 — the point under the middle of him (under his feet as he flies) | in place of the boss | idle, fly, tell, dive, climb |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**boss-tempest-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| idle | loop | 30 · 30 | 60 | — | — | — |
| fly | loop | 12 · 12 | 24 | — | — | — |
| tell | once | 18 · 12 | 30 | — | — | — |
| dive | loop | 4 · 4 | 8 | — | — | — |
| climb | loop | 8 · 8 | 16 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit; **travel** loops while the move carries him; exactly one frame carries hit=x,y,w,h — from the step that frame first shows, that area hurts until the move ends.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **he hangs on the pivot**, the point under the middle of him. His collision box (what the player's shots hit, and what hurts to touch) is 27 wide and 36 tall, centred on the pivot and standing on it; draw his body to fill about that. Touching him is the only way his own moves hurt, so what looks solid should be inside that box and what sticks out of it (the pack, spray, a scarf) should look like it would not hurt.
- **`tell` is the dive's warning, and its length is how long the warning lasts**: he stops dead and sinks a little before he crosses the room at the player's height. He has no shot to watch for, so this clip is all the warning there is; it has to read at a glance. A second or third dive in a row (layers 2 and 3) plays only its first six-tenths, so put the readable part first.
- **nothing on this sheet hits or spawns**: no `hit=` and no `spawn=` on any frame.
- **the jetpack is not on this sheet.** The game draws it over him in plain shapes, because its two nozzles swing to point wherever the water is really going (straight down when he hovers, behind him when he dives), and the water pushes the player and stops his shots. Draw his body so a large pack on his back belongs there. Whether the pack gets its own drawn sheet is the owner's to settle.
- **he has a single eye** (the owner's rule for every boss, to be interpreted with very wide creativity).
- **colours**: Tempest Man's blue `#145DBD` and yellow `#F5C518` with shades built from them and the near-black outline. Grey belongs to the jetpack, not to him.
<!-- /generated:contract -->

## Handing this boss to Claude Design

<!-- generated:prompt -->
Paste this into Claude Design, with the repository linked:

```text
Draw the art for MEGA DASH's TEMPEST MAN, replacing the placeholder pictures in its 1 sprite sheet.

Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the design/ and docs/ folders are enough) and read, in this order:
1. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/README.md — how drawn art with its own timing works in this game (weapons and bosses alike): the .sprite format, what you may change, how it is checked, and what to hand back.
2. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/tempest.md — this boss: what it is, every move he makes, every clip with its timing and hit areas, and the rules the code holds the drawing to.
3. The sheet to draw, already in the game and playing exactly as your art will:
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-tempest-body.sprite
4. https://github.com/EchoJex/mega-dash/blob/main/design/DESIGN-BRIEF.md (the game's look and limits) and https://github.com/EchoJex/mega-dash/blob/main/design/sprites/player.sprite (the 16-bit player: the reference for style and for scale).

Redraw every frame of those sheets in the same files: same file names, same sheet sizes, same clip names, drawn facing right (the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game as soon as they pass the checks, so say what you changed and why.

Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its hold), facing both ways, beside the player, with the hit areas drawn on.

When the owner approves, give the owner ONE zip file to download, holding the .sprite files you drew and a HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and anything you would like the code to change. (If your menu has Export, then Hand off to Claude Code, that makes the same bundle.) The owner gives that zip to Claude Code.
```
<!-- /generated:prompt -->
