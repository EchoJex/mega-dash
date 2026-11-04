# Thorn Man — art brief

Read `design/weapon-art/README.md` first: it says how drawn art with its own timing works in
this game, what you may change and what to hand back. This page is Thorn Man himself, the
Grass boss.

**His sheet is a placeholder.** The plain block he is drawn as today, with his two shuriken
added, has been painted into it. The sheet, its size, its pivot, every clip, every hold
and every spawn point are real: the game plays them exactly as drawn. To see him, play a dev
build and pick THORN in the dev menu's BOSS PICKER. BOSS LAYER L2 and L3 show the tile
grapple and the kunai.

## What he is, in the owner's words

"Looks: a tall, skinny ninja with coiled grassy vines for arms, which end in 2 very large
shuriken which stretch it to stack the player from afar."

His attack: "Shoots a pair of large straight vines directly at the player's current
location. On hit: constrict for several seconds, reel the player in, then toss diagonally
to the far wall — heavy damage on wall contact. On miss: pulls the boss to that point and
fires again, up to 3 times before a cooldown." At layer 2 he also "uses a random foreground
Phillips head tile to grapple onto, rapidly pulling himself to it, and throwing a spread of
3 leaf-like kunai toward the player".

Inspired by the ninja idea, not a copy: draw an original character, not any existing one.

His room is an overgrown greenhouse with a shattered glass roof. Its floor is thick with
thorny ground cover that grows taller than the player and stands in front of him. Small
square Phillips-head tiles sit in the background; one comes forward when he grapples to it.
At layer 3, two seed pods grow in the floor corners.

**The game draws the vines themselves**, from the spawn point to wherever they reach. It
also draws his two weakness deaths in plain shapes for now: ash and grey petals for Fire,
dry leaves and a thin trunk for Poison. Neither is on this sheet.

## Every move, and the clip that shows it

| clip | when the game plays it |
|---|---|
| `idle` | standing on the floor between attacks, and as he beams in; also the picture his generic death flashes |
| `aim` | the vine grab's warning: arm drawn back, then thrust out. The vines leave from its spawn point |
| `shoot` | arm out while the pair of vines flies |
| `zip` | pulled along his own vine to where it struck (the floor, a wall, the ceiling or a tile) |
| `cling` | clinging to a wall or the ceiling before he fires again; its length is how long he clings |
| `hold` | holding the player on the vine, then reeling him in |
| `toss` | throwing the player diagonally into the far wall |
| `throw` | layer 2 and 3: the leaf-kunai throw from a tile; the kunai leave from its spawn point |
| `fall` | dropping back to the floor after the last try |

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- His colours: primary `#2AAB1C` (green), secondary `#5C4033` (brown). Shades come from
  those two. Steel-grey shuriken.
- About 1.8 times the player's height (the player is 24 pixels tall), tall and skinny.
- **He replaces his plain block**, standing on the pivot. Draw him facing right; the game
  mirrors him to face the player.

## The contract

Everything below is generated from the sheet by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`boss-thorn-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-thorn-body.sprite) | 64×64 | 32, 60 — the floor under the middle of him | in place of the boss | idle, aim, shoot, zip, cling, hold, toss, throw, fall |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**boss-thorn-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| idle | loop | 30 · 30 | 60 | — | — | — |
| aim | once | 18 · 12 | 30 | — | — | 56, 29 |
| shoot | loop | 6 · 6 | 12 | — | — | — |
| zip | loop | 4 | 4 | — | — | — |
| cling | once | 30 | 30 | — | — | — |
| hold | loop | 8 · 8 | 16 | — | — | — |
| toss | loop | 6 | 6 | — | — | — |
| throw | once | 12 · 8 | 20 | — | — | 54, 27 |
| fall | loop | 6 | 6 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit; **travel** loops while the move carries him; exactly one frame carries hit=x,y,w,h — from the step that frame first shows, that area hurts until the move ends.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **he stands on the pivot**, the floor under the middle of him. His collision box (what the player's shots hit, and what hurts to touch) is 32 wide and 43 tall, centred on the pivot and standing on it; draw his tall, skinny body to fill about that.
- **`aim` has exactly one spawn point**: the shuriken the pair of vines leaves from, on its last frame. The vines fly from there straight at the player, so it can be anywhere on his front arm.
- **`aim` is the vine grab's warning**: it has to read at a glance — the arm drawn back, then thrust out — because a catch costs the player two seconds held and a throw into the wall. Its length is how long the warning lasts, and at layer 3 the game plays it faster with each try.
- **the vines are fast, so `aim` carries the fight**: each vine lands at the player's feet just after a player walking at base speed could have stepped clear (owner, bug of build 1217). The first vine of a set can be outrun on foot, only just; the later ones lead the player. Reacting to `aim` is the only way out, so it must be unmistakable.
- **`throw` has exactly one spawn point**, the hand the leaf kunai leave from; they leave on that frame's first step.
- **`cling` is how long he clings** to a wall or the ceiling before he fires again.
- **the vines themselves are not on this sheet**: the game draws them from the spawn point to wherever they reach. Draw his arms so a vine leaving the shuriken looks like it belongs to them.
- **colours**: Thorn Man's green `#2AAB1C` and brown `#5C4033` with shades built from them, the near-black outline, and steel-grey shuriken.
<!-- /generated:contract -->

## Handing this boss to Claude Design

<!-- generated:prompt -->
Paste this into Claude Design, with the repository linked:

```text
Draw the art for MEGA DASH's THORN MAN, replacing the placeholder pictures in its 1 sprite sheet.

Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the design/ and docs/ folders are enough) and read, in this order:
1. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/README.md — how drawn art with its own timing works in this game (weapons and bosses alike): the .sprite format, what you may change, how it is checked, and what to hand back.
2. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/thorn.md — this boss: what it is, every move he makes, every clip with its timing and hit areas, and the rules the code holds the drawing to.
3. The sheet to draw, already in the game and playing exactly as your art will:
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-thorn-body.sprite
4. https://github.com/EchoJex/mega-dash/blob/main/design/DESIGN-BRIEF.md (the game's look and limits) and https://github.com/EchoJex/mega-dash/blob/main/design/sprites/player.sprite (the 16-bit player: the reference for style and for scale).

Redraw every frame of those sheets in the same files: same file names, same sheet sizes, same clip names, drawn facing right (the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game as soon as they pass the checks, so say what you changed and why.

Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its hold), facing both ways, beside the player, with the hit areas drawn on.

When the owner approves, give the owner ONE zip file to download, holding the .sprite files you drew and a HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and anything you would like the code to change. (If your menu has Export, then Hand off to Claude Code, that makes the same bundle.) The owner gives that zip to Claude Code.
```
<!-- /generated:prompt -->
