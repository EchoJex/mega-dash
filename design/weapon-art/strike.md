# Strike Man — art brief

Read `design/weapon-art/README.md` first: it says how drawn art with its own timing works in
this game, what you may change and what to hand back. This page is Strike Man himself, the
Fighting boss. He is the first boss to be drawn.

**Today every picture is a placeholder**: an orange block 38 wide and 44 tall with a brown
band for his trunks and a red square for his glove wherever a punch lands. The sheet, its
size, its pivot, every clip, every hold and every hit area are real: the game plays them
now exactly as it will play the finished art. To see him, play a dev build and pick STRIKE
in the dev menu's BOSS PICKER; BOSS LAYER L2 and L3 show the guard, the uppercut, the
energy blast and the spinning kick.

## What he is, in the owner's words

"Strike man needs to be a little shorter and a bit wider. Attacks are inspired by street
fighter 2 balrog, typical American heavyweight boxer type. Short straight jabs, a quick back
dash for dodge, and a lunging strike where the boss leans back, readies their punch, then
thrusts forward with the gloved fist, traveling a great distance in the process."

Inspired by, not a copy: draw an original heavyweight boxer, not any existing character.

His room is an underground fight pit — chain-link cage walls, a stained mat floor and
hanging lamps — with two heavy training bags swinging on ceiling rails. A psychic weapon
can lift a bag and throw it at him: the first one knocks him down and he gets up dizzy with
stars circling his head; every later one gives him birdies instead. The game draws the stars
and birdies itself.

## Every move, and the clip that shows it

| clip | when the game plays it |
|---|---|
| `idle` | before the fight starts, as he beams in |
| `walk` | walking toward the player (and his quick dash across the room at layer 3) |
| `guard` | layer 2 and 3: walking with his guard up; it bounces the next shot back |
| `jabReady` | the short wind-up before a string of jabs |
| `jab` | one short straight jab; the string is this clip played 3 or 4 times |
| `back` | the quick back-dash: away from a shot, and after every jab string, still facing the player |
| `lean` | the lunge's warning: he leans back, glove cocked behind him |
| `lunge` | the fist thrust forward while he travels most of the room; loops until he stops |
| `recover` | the beat after the lunge stops |
| `down` | knocked down by a thrown bag, ending flat on the mat |
| `dizzy` | back on his feet and swaying, for 5 or 7 seconds |
| `riseReady`, `rise` | layer 2 and 3: the uppercut's crouch, then rising fist first; `rise` loops while he is in the air |
| `blast` | layer 3: an energy blast thrown from his glove; the shot leaves from its spawn point |
| `spinReady`, `spin` | layer 3: the crouch, then a spinning kick that crosses the room; `spin` loops while it travels |

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- His colours: primary `#EA6A34` (orange), secondary `#7C2D12` (brown). Shades come from
  those two. Red boxing gloves.
- A heavyweight: broad shoulders, thick arms, big gloves, trunks and boots. About 1.8 times
  the player's height (the player is 24 pixels tall) and nearly as wide as he is tall.
- **He replaces his plain block**, standing on the pivot. Draw him facing right; the game
  mirrors him to face the player.

## The contract

Everything below is generated from the sheet by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`boss-strike-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-strike-body.sprite) | 96×64 | 48, 60 — the floor under the middle of him | in place of the boss | idle, walk, guard, jabReady, jab, back, lean, lunge, recover, down, dizzy, riseReady, rise, blast, spinReady, spin |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**boss-strike-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| idle | loop | 30 · 30 | 60 | — | — | — |
| walk | loop | 8 · 8 · 8 · 8 | 32 | — | — | — |
| guard | loop | 10 | 10 | — | — | — |
| jabReady | once | 12 | 12 | — | — | — |
| jab | hit | **4** · 6 | 10 | 0 | 67, 36, 22×12 | — |
| back | once | 7 · 7 | 14 | — | — | — |
| lean | once | 15 · 15 | 30 | — | — | — |
| lunge | travel | **4** · 4 | 8 | 0 | 67, 36, 12×12 | — |
| recover | once | 18 | 18 | — | — | — |
| down | once | 10 · 40 | 50 | — | — | — |
| dizzy | loop | 20 · 20 | 40 | — | — | — |
| riseReady | once | 20 | 20 | — | — | — |
| rise | travel | **6** · 6 | 12 | 0 | 36, 10, 24×50 | — |
| blast | once | 20 · 8 | 28 | — | — | 72, 36 |
| spinReady | once | 22 | 22 | — | — | — |
| spin | travel | **5** · 5 · 5 · 5 | 20 | 0 | 26, 16, 44×44 | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit; **travel** loops while the move carries him; exactly one frame carries hit=x,y,w,h — from the step that frame first shows, that area hurts until the move ends.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **he stands on the pivot**, the floor under the middle of him. His collision box (what the player's shots hit, and what hurts to touch) is 38 wide and 44 tall, centred on the pivot and standing on it; draw his body to fill about that, a heavyweight boxer, a little shorter and a bit wider than the old sumo build.
- **every jab reaches a player standing against him**: the `jab` hit area starts at or inside the front of his body, reaches at least 8 pixels past it, and covers part of 12 to 24 pixels above the floor — the player is only 24 tall, so a punch at Strike Man's own chest height sails over his head.
- **the lunge's fist is in front of him at the player's head height**, and must reach a player standing against him.
- **the uppercut (`rise`) covers the space above his head**, so a player jumping over him is caught.
- **the spinning kick covers his own body**, at least the width of his collision box.
- **`blast` has exactly one spawn point**, the fist the energy blast leaves from; the shot leaves on that frame's first step.
- **`lean` is the lunge's warning**: he plainly rocks back with the glove cocked behind him. It is what makes a punch that crosses most of the room fair, so it has to read at a glance.
- **`down` ends lying on the mat**, and `dizzy` is a standing, swaying idle: the game draws the stars or the birdies circling his head itself, just above the top of his collision box.
- **colours**: Strike Man's orange `#EA6A34` and brown `#7C2D12` with shades built from them, the near-black outline, and red boxing gloves.
<!-- /generated:contract -->

## Handing this boss to Claude Design

<!-- generated:prompt -->
Paste this into Claude Design, with the repository linked:

```text
Draw the art for MEGA DASH's STRIKE MAN, replacing the placeholder pictures in its 1 sprite sheet.

Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the design/ and docs/ folders are enough) and read, in this order:
1. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/README.md — how drawn art with its own timing works in this game (weapons and bosses alike): the .sprite format, what you may change, how it is checked, and what to hand back.
2. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/strike.md — this boss: what it is, every move he makes, every clip with its timing and hit areas, and the rules the code holds the drawing to.
3. The sheet to draw, already in the game and playing exactly as your art will:
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-strike-body.sprite
4. https://github.com/EchoJex/mega-dash/blob/main/design/DESIGN-BRIEF.md (the game's look and limits) and https://github.com/EchoJex/mega-dash/blob/main/design/sprites/player.sprite (the 16-bit player: the reference for style and for scale).

Redraw every frame of those sheets in the same files: same file names, same sheet sizes, same clip names, drawn facing right (the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game as soon as they pass the checks, so say what you changed and why.

Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its hold), facing both ways, beside the player, with the hit areas drawn on.

When the owner approves, give the owner ONE zip file to download, holding the .sprite files you drew and a HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and anything you would like the code to change. (If your menu has Export, then Hand off to Claude Code, that makes the same bundle.) The owner gives that zip to Claude Code.
```
<!-- /generated:prompt -->
