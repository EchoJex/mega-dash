# Simon's Whip — art brief

Read `design/weapon-art/README.md` first: it says how weapon art works in this game, what
you may change and what to hand back. This page is Simon's Whip itself.

**Today every picture is a placeholder.** The whip is a green line, and the body sheet is
the player's own standing picture (or his slide picture) pasted into every frame. The
frames, their timing and their hit areas are real: the game plays them now exactly as it
will play the finished art. To see them move, play a dev build with the whip equipped (dev
menu → WEAPONS: ALL, START LV to try each rung).

## What it is, in the owner's words

Thorn Man's weapon: "Stand still while cracking a directional-input whip-like vine". The
crack is **strongly modelled after Super Castlevania IV's Simon's whip animation** (owner,
18 Oct 2026). The owner traced Simon's three poses in Stick Nodes and chose, on 19 Oct
2026, Simon's poses at this game's pace:

1. **the whip hanging behind him**, pulled back (5 steps);
2. **swung overhead and behind**, curling over (5 steps). This swing hurts lightly
   ("Overhead arc hurts too");
3. **cracked straight out in front** (10 steps). This is the main hit, and the **tip** is
   the part that matters: "A small glint marks the tip: a narrow, high-damage zone, and
   the only part of the vine that catches anything."

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours a sheet, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- Thorn Man's colours: primary `#2AAB1C` (green), secondary `#5C4033` (brown). It is a
  **vine**, not leather: a green, segmented, barbed stem, with a glint on the tip while
  it is cracked out.
- **The player is 24×24, white with a `#3CBCFC` accent, and is never tinted.** The whip is
  drawn in front of him.

## The body sheet: his poses

The whip has a **body sheet** (`weapon-simons_whip-body.sprite`): while he cracks it, the
game draws that sheet's frame **in place of his normal picture**. It is on the same paper,
held by the same pivot (his hand) and played on the same clock as the whip, so his hand
and the handle line up exactly. Draw Simon's three poses as this player: pulled back,
arm raised overhead, arm thrust forward. Use only the twelve colours of
`design/sprites/player.sprite`.

- The **standing** clips are standing poses. **He cannot move while he cracks standing.**
- The **low** clips (`lowCrack…`) are cracked **during a slide**, crouched low, and he
  keeps sliding. If the slide ends first, the game switches to the standing clip at the
  same step, so a low frame and the standing frame at the same step should match from
  the waist up.
- **The whip's handle must start at his hand**, the pivot, in every frame of the crack
  (frame 3). In frames 1 and 2 his hand is behind or above him; draw the hand there and
  the handle with it. The placeholder runs the whip back to the pivot only because its
  body does not move.

## What appears, rung by rung

| rung | on screen |
|---|---|
| **Lv1–2** | `crack` (the short whip) and `lowCrack` in a slide. |
| **Lv3** | `crackLong` (a longer whip), and `crackUpLong`, cracked 45° up and forward when the player holds up-forward. After a crack catches a minion the game reels it in along a plain vine (no sheet). |
| **Lv6** | `crackLonger`, `crackUpLonger` and `lowCrackLonger`: the longest whip. |
| **Lv10** | nothing new to draw. |

## The contract

Everything below is generated from the sheets by `npm run art:brief`, so it is always what
the game is playing. Do not edit it by hand.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`weapon-simons_whip-held.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-simons_whip-held.sprite) | 136×76 | 50, 62 — his hand, on the handle | in front of the player | crack, crackLong, crackLonger, crackUpLong, crackUpLonger, lowCrack, lowCrackLong, lowCrackLonger |
| [`weapon-simons_whip-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-simons_whip-body.sprite) | 136×76 | 50, 62 — his hand — the same point as the whip's pivot | in place of the player | crack, crackLong, crackLonger, crackUpLong, crackUpLonger, lowCrack, lowCrackLong, lowCrackLonger |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**weapon-simons_whip-held**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| crack | lash | 5 · **5** · **10** | 20 | 5 then 10 | 19, 52, 16×19 then 79, 57, 10×10 | — |
| crackLong | lash | 5 · **5** · **10** | 20 | 5 then 10 | 13, 50, 18×22 then 97, 57, 10×10 | — |
| crackLonger | lash | 5 · **5** · **10** | 20 | 5 then 10 | 5, 48, 21×26 then 123, 57, 10×10 | — |
| crackUpLong | lash | 5 · **5** · **10** | 20 | 5 then 10 | 13, 50, 18×22 then 82, 20, 10×10 | — |
| crackUpLonger | lash | 5 · **5** · **10** | 20 | 5 then 10 | 5, 48, 21×26 then 100, 2, 10×10 | — |
| lowCrack | lash | 5 · **5** · **10** | 20 | 5 then 10 | 19, 52, 16×19 then 79, 57, 10×10 | — |
| lowCrackLong | lash | 5 · **5** · **10** | 20 | 5 then 10 | 13, 50, 18×21 then 97, 57, 10×10 | — |
| lowCrackLonger | lash | 5 · **5** · **10** | 20 | 5 then 10 | 5, 48, 21×23 then 123, 57, 10×10 | — |

**weapon-simons_whip-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| crack | once | 5 · 5 · 10 | 20 | — | — | — |
| crackLong | once | 5 · 5 · 10 | 20 | — | — | — |
| crackLonger | once | 5 · 5 · 10 | 20 | — | — | — |
| crackUpLong | once | 5 · 5 · 10 | 20 | — | — | — |
| crackUpLonger | once | 5 · 5 · 10 | 20 | — | — | — |
| lowCrack | once | 5 · 5 · 10 | 20 | — | — | — |
| lowCrackLong | once | 5 · 5 · 10 | 20 | — | — | — |
| lowCrackLonger | once | 5 · 5 · 10 | 20 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **every crack clip** has two hit frames: the first (the overhead swing) hurts lightly everything in its area while it shows; the second is the crack, and its area is the TIP — the only part that catches. The shaft is the straight line from the pivot to the middle of the tip's area.
- **the tip reaches further with level**: crack < crackLong < crackLonger, measured from the pivot.
- **every crack reaches a minion standing against his front**, standing or sliding, at every length: a 12-pixel minion on the floor just past his hand is hit by the tip or the shaft. **The swing's area stays behind his hand**, so that minion takes the crack and not the light hit (one crack pays a target once).
- **the body sheet** has exactly the whip's clips, frame counts and holds, on the same paper and pivot, and uses only the player's own twelve colours. It is drawn in place of him while he cracks.
- **crackUp…** points up and forward; **lowCrack…** is the crack during a slide, his hand 6 pixels above the floor rather than 12.
<!-- /generated:contract -->

## Handing this weapon to Claude Design

<!-- generated:prompt -->
Paste this into Claude Design, with the repository linked:

```text
Draw the art for MEGA DASH's SIMONS WHIP, replacing the placeholder pictures in its 2 sprite sheets.

Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the design/ and docs/ folders are enough) and read, in this order:
1. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/README.md — how weapon art works in this game: the .sprite format, what you may change, how it is checked, and what to hand back.
2. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/simons_whip.md — this weapon: what it is, what each level shows, every clip with its timing and hit areas, and the rules the code holds the drawing to.
3. Its sheets, already in the game and playing exactly as your art will:
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-simons_whip-held.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-simons_whip-body.sprite
4. https://github.com/EchoJex/mega-dash/blob/main/design/DESIGN-BRIEF.md (the game's look and limits) and https://github.com/EchoJex/mega-dash/blob/main/design/sprites/player.sprite (the 16-bit player: the reference for style and for scale).

Redraw every frame in the same files: same file names, same sheet sizes, same clip names, drawn facing right (the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game as soon as they pass the checks, so say what you changed and why.

Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its hold), facing both ways, beside the player, with the hit areas drawn on.

When the owner approves: Export, then Hand off to Claude Code. Include the .sprite files and a HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and anything you would like the code to change.
```
<!-- /generated:prompt -->
