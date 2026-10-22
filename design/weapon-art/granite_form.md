# Granite Form — art brief

Read `design/weapon-art/README.md` first: it says how weapon art works in this game, what
you may change and what to hand back. This page is the Granite Form itself.

**Today every picture is a placeholder**: plain brown and grey blocks for the three
statues, a grey circle with a turning mark for the boulder, and a small square for a loose
stone. The sheets, their sizes and their pivots are real: the game plays them now exactly
as it will play the finished art. To see them, play a dev build with the Granite Form
equipped (dev menu → WEAPONS: ALL), stand still for a second, or let go of everything in
mid-air; START LV 3 for the boulder.

## What it is, in the owner's words

Granite Man's weapon (the Rock boss): "the player turns to stone — Kirby's Rock form. It is
driven by the ABSENCE OF PLAYER INPUT, not by a lack of movement or momentum." A second and
a half of no input on the ground hardens him where he stands; in the air, the first moment
nothing is pressed he slams straight down as stone. The statue cannot move, takes far less
damage, cannot be knocked back and ignores spikes, and wears off five seconds after it
touches down. His own attacks still work while he is a statue.

The statue is one of three shapes, picked at random each time (owner, 22 Oct 2026):
**"a rocky treasure chest, 8bit megaman in shooting pose, a simple geometric monolith
rectangle like from 2001"**.

From Lv3, pressing a direction during the slam **puffs it into a large round boulder**
(1.2 times his size) that rolls that way after landing, crushing through minions, and
stops just before a cliff edge.

**Every change of form happens under a puff** that hides it and fades fast; the picture
changes 10 steps after the form does.

Hits taken while hardened knock **small round stones** loose (up to three). They fall,
bounce and roll to a stop. Shooting one sends it flying away from where it was hit, like a
billiard ball, bouncing off floors and walls until it hits an enemy; at Lv10 it explodes
there.

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours a sheet, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- Granite Man's colours: primary `#5F443A` (brown), secondary `#A8A296` (stone grey). Each
  statue is carved from that rock: a treasure chest made of stone, an 8-bit Mega Man
  statue in his shooting pose, and the 2001 monolith (a plain upright slab).
- **These replace the player while they hold**, standing exactly where his feet were. The
  player is 24x24; a statue may be a little larger, the boulder about 29 pixels across.
- The boulder's `roll` clip should visibly turn; it loops for as long as it rolls.

## The contract

Everything below is generated from the sheets by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`weapon-granite_form-statue.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-statue.sprite) | 40×40 | 20, 38 — his feet — the floor under the middle of him | in place of the player | chest, megaman, monolith |
| [`weapon-granite_form-boulder.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-boulder.sprite) | 40×40 | 20, 38 — the floor under the middle of it | in place of the player | roll |
| [`weapon-granite_form-stone.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-stone.sprite) | 10×10 | 5, 9 — the floor under its middle | behind the player | loose |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**weapon-granite_form-statue**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| chest | still | 5 | 5 | — | — | — |
| megaman | still | 5 | 5 | — | — | — |
| monolith | still | 5 | 5 | — | — | — |

**weapon-granite_form-boulder**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| roll | loop | 4 · 4 · 4 · 4 | 16 | — | — | — |

**weapon-granite_form-stone**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| loose | still | 5 | 5 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **every picture stands on its pivot**, the floor under the middle of him: the statue, the boulder and the stone all sit on the floor, never float above it or sink into it.
- **the statue sheet has three still pictures**, one per shape: `chest`, `megaman`, `monolith`. The game picks one at random each time he hardens. They replace him, so each should read as roughly his size (he is 24x24); a little taller or wider is fine.
- **the boulder** is about 29 pixels across (1.2 times his size), and its `roll` clip loops while it rolls.
- **nothing on these sheets hits by frame**: what the statue lands on and what the boulder rolls through is worked out from his body, so no frame carries a hit area.
- **colours**: Granite Man's brown `#5F443A` and stone grey `#A8A296` with shades built from them, and the near-black outline.
<!-- /generated:contract -->

## Handing this weapon to Claude Design

<!-- generated:prompt -->
Paste this into Claude Design, with the repository linked:

```text
Draw the art for MEGA DASH's GRANITE FORM, replacing the placeholder pictures in its 3 sprite sheets.

Everything you need is in the GitHub repository EchoJex/mega-dash, branch main. Link the repository (the design/ and docs/ folders are enough) and read, in this order:
1. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/README.md — how weapon art works in this game: the .sprite format, what you may change, how it is checked, and what to hand back.
2. https://github.com/EchoJex/mega-dash/blob/main/design/weapon-art/granite_form.md — this weapon: what it is, what each level shows, every clip with its timing and hit areas, and the rules the code holds the drawing to.
3. Its sheets, already in the game and playing exactly as your art will:
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-statue.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-boulder.sprite
   - https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-stone.sprite
4. https://github.com/EchoJex/mega-dash/blob/main/design/DESIGN-BRIEF.md (the game's look and limits) and https://github.com/EchoJex/mega-dash/blob/main/design/sprites/player.sprite (the 16-bit player: the reference for style and for scale).

Redraw every frame in the same files: same file names, same sheet sizes, same clip names, drawn facing right (the game mirrors it). You may change the colours (up to 15 per sheet), any hold, which frame a move hits on, the hit areas, the spawn points and the pivot when the drawing needs it. Those changes go into the game as soon as they pass the checks, so say what you changed and why.

Before handing off, show the owner every clip playing at game speed (60 steps a second, each frame for its hold), facing both ways, beside the player, with the hit areas drawn on.

When the owner approves: Export, then Hand off to Claude Code. Include the .sprite files and a HANDOFF.md note saying what was approved and when, what changed in timing or hit areas and why, and anything you would like the code to change.
```
<!-- /generated:prompt -->
