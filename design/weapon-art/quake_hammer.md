# Quake Hammer — art brief

Read `design/weapon-art/README.md` first: it says how weapon art works in this game, what
you may change and what to hand back. This page is the Quake Hammer itself.

**Today every picture is a placeholder** — a brown handle with a rock-coloured block on
the end, and plain circles, triangles and dots for the dust, spikes and sand. The frames,
their timing and their hit areas are real: the game plays them now exactly as it will play
the finished art. To see them move, play a dev build with the hammer equipped (dev menu →
WEAPONS: ALL, START LV to try each rung).

## What it is, in the owner's words

**King Dedede's hammer.** Tap for a jab — three taps make Dedede's neutral A-A-A from Smash
Ultimate, without the rapid-fire spin in the middle. Hold to charge, modelled on Dedede's
**Jet Hammer**, with the hammer **held overhead the way he holds it for his forward
smash** — that pose IS the tell that a charge is building, so there is no charge bar.
Where Dedede's hammer bursts into flame at full charge, this one puffs **small dust clouds
round the hammer head**, and that has to be obvious at a glance. Let go to swing; let go in
the air and the hammer drives him straight down (the air dive).

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours a sheet, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- Quake Man's colours: primary `#A76625` (brown), secondary `#D9B56A` (sand). A big,
  heavy, rock-headed hammer.
- **A quarter shorter than it first was**, by the owner's playtest (12 Oct 2026: "the
  hammer is a bit too long"). The placeholder shows the size: the head's middle 16 pixels
  from his hand, its far edge about 21 out, against the player's 24 of height. Draw to it.
- Dust and sand are warm tans; the placeholders' colours are in each sheet's palette, and
  the art may choose its own.
- **The player is 24×24, white with a `#3CBCFC` accent, and is never tinted.** The hammer
  is drawn in front of him.

## What the player sees, move by move

| move | how it starts | what it looks like |
|---|---|---|
| **jab one** (`jabOne`) | a tap | a short, quick forward swing at chest height |
| **jab two** (`jabTwo`) | a tap during jab one | swung back up through the front, rising |
| **jab three** (`jabThree`) | a tap during jab two | the finisher: over the top and down onto the floor; it launches what it hits |
| **charge** (`charge`, looping) | holding the button | the hammer held overhead, for as long as the button is down |
| **full charge** (`chargeFull`, looping) | held to full, from Lv3 | the same pose, trembling; small dust puffs round the head (the `tell` puff, from this clip's spawn point) |
| **swing** (`swing`) | letting go | from overhead down onto the floor in front; the player cannot move, turn or jump until it is over |
| **air dive** (`dive`, looping) | letting go in the air | the hammer swung down and leading, dragging him straight down; on landing the swing carries on from its hit |

**A tap is only known to be a tap when the thumb comes up**, so a jab starts as many
steps in as the button was held — usually 3 to 8. The first few steps of jab one are
therefore rarely seen; put its reading pose just before the hit. (If this looks wrong once
the art is in, tell the owner: the fix is for the game to show the wind-up while the thumb
is still down, which is a code change, not an art one.)

## What appears, rung by rung

| rung | on screen |
|---|---|
| **Lv1–2** | the hammer only. Full charge shows nothing extra, and the swing makes no dust. |
| **Lv3** | **the full-charge tell** (the `chargeFull` clip and the `tell` puffs: 8 the moment the charge fills, then 2 more every 5 steps). **The dust cloud** where the swing lands — on the floor in front, or billowing up from under an enemy it hit in the air: `small` under half a charge, `medium` up to full, `large` at full. |
| **Lv6** | nothing new to draw (jabs at full speed, a faster charge). |
| **Lv10** | **the spikes**: a full charge that lands on the FLOOR throws four long, slender sand spikes diagonally forward from the swing's spawn point, one clip per angle. They stab out (hurting), stand (blocking enemy shots — each stopped shot leaves a `block` puff), and then each falls apart into **sand**: a grain every 3 pixels along it, dropping to the floor and vanishing one by one within three seconds. **A boss walks straight through**: a spike he touches skips the rest of its standing frames and falls to sand at once. |

## The contract

Everything below is generated from the sheets by `npm run art:brief`, so it is always what
the game is playing. Do not edit it by hand.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`weapon-quake_hammer-held.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-held.sprite) | 56×56 | 28, 28 — his hand, on the grip | in front of the player | jabOne, jabTwo, jabThree, charge, chargeFull, swing, dive |
| [`weapon-quake_hammer-dust.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-dust.sprite) | 64×40 | 32, 40 — the floor under the middle of the cloud | behind the player | small, medium, large |
| [`weapon-quake_hammer-puff.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-puff.sprite) | 12×12 | 6, 6 — its middle | behind the player | tell, block |
| [`weapon-quake_hammer-spike.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-spike.sprite) | 60×50 | 4, 47 — its foot, on the floor | behind the player | flat, low, high, steep |
| [`weapon-quake_hammer-sand.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-sand.sprite) | 4×4 | 2, 2 — the grain | behind the player | light, dark |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**weapon-quake_hammer-held**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| jabOne | hit | 4 · 4 · 2 · **3** · 6 · 7 · 7 | 33 | 10 | 27, 21, 25×19 | — |
| jabTwo | hit | 4 · 4 · 3 · **3** · 5 · 9 | 28 | 11 | 27, 15, 25×19 | — |
| jabThree | hit | 2 · 2 · **4** · 6 · 10 · 12 · 14 | 50 | 4 | 24, 4, 28×37 | — |
| charge | loop | 20 · 20 | 40 | — | — | — |
| chargeFull | loop | 3 · 3 | 6 | — | — | 24, 13 |
| swing | hit | 3 · 3 · 4 · **4** · 6 · 20 · 30 | 70 | 10 | 27, 11, 25×30 | 44, 40 |
| dive | loop | 4 · 4 | 8 | — | — | — |

**weapon-quake_hammer-dust**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| small | hit | **4** · 4 · 6 · 10 | 24 | 0 | 22, 30, 20×10 | — |
| medium | hit | **4** · 6 · 8 · 14 | 32 | 0 | 16, 24, 32×16 | — |
| large | hit | **4** · 6 · 10 · 20 | 40 | 0 | 8, 16, 48×24 | — |

**weapon-quake_hammer-puff**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| tell | once | 4 · 6 · 8 | 18 | — | — | — |
| block | once | 3 · 4 · 5 | 12 | — | — | — |

**weapon-quake_hammer-spike**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| flat | grow | **2** · **2** · **1** · 24 · 2 · 2 · 2 | 35 | hurts for steps 0–4 | — | — |
| low | grow | **2** · **2** · **1** · 24 · 2 · 2 · 2 | 35 | hurts for steps 0–4 | — | — |
| high | grow | **2** · **2** · **1** · 24 · 2 · 2 · 2 | 35 | hurts for steps 0–4 | — | — |
| steep | grow | **2** · **2** · **1** · 24 · 2 · 2 · 2 | 35 | hurts for steps 0–4 | — | — |

**weapon-quake_hammer-sand**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| light | still | 5 | 5 | — | — | — |
| dark | still | 5 | 5 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **jabOne**: a tap from step 13 to step 30 carries on into jabTwo, so jabOne has to hit before step 13 and last at least 30 steps.
- **jabTwo**: a tap from step 18 to step 27 carries on into jabThree, so jabTwo has to hit before step 18 and last at least 27 steps.
- **swing**: a full charge starts it 1 step in, and an uncharged one lets go 10 steps before its end — so it has to hit after step 1 and more than 10 steps before it ends.
- **every jab and the swing** must reach a minion standing against his front: the hit area has to overlap the square from (29, 28) to (41, 40) on the held sheet — just right of his hand, down to the floor. Facing left is the same, mirrored.
- **the swing's spawn point** is where the hammer head meets the floor: the dust and the spikes start there. The floor is 12 pixels below his hand (row 40 on the held sheet).
- **the spikes** keep the ladder's angles and lengths, shallowest first: flat 24° and 58 px, low 38° and 64 px, high 52° and 54 px, steep 66° and 42 px, measured from the pivot. A spike hurts along that line while its `hit` frames show, then blocks along it.
- **the dust clouds** hurt once, on their hit frame, everything in the hit area — except whatever the hammer itself just hit. Each lasts exactly as long as its clip.
<!-- /generated:contract -->

## Handing this weapon to Claude Design

<!-- generated:prompt -->
Paste this into Claude Design, with the repository linked:

```text
Draw the art for MEGA DASH's QUAKE HAMMER, replacing the placeholder pictures in its 5 sprite sheets.

Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the design/ and docs/ folders are enough) and read, in this order:
1. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/README.md — how weapon art works in this game: the .sprite format, what you may change, how it is checked, and what to hand back.
2. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/quake_hammer.md — this weapon: what it is, what each level shows, every clip with its timing and hit areas, and the rules the code holds the drawing to.
3. Its sheets, already in the game and playing exactly as your art will:
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-held.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-dust.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-puff.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-spike.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-quake_hammer-sand.sprite
4. https://github.com/EchoJex/mega-dash/blob/main/design/DESIGN-BRIEF.md (the game's look and limits) and https://github.com/EchoJex/mega-dash/blob/main/design/sprites/player.sprite (the 16-bit player: the reference for style and for scale).

Redraw every frame in the same files: same file names, same sheet sizes, same clip names, drawn facing right (the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game as soon as they pass the checks, so say what you changed and why.

Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its hold), facing both ways, beside the player, with the hit areas drawn on.

When the owner approves: Export, then Hand off to Claude Code. Include the .sprite files and a HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and anything you would like the code to change.
```
<!-- /generated:prompt -->
