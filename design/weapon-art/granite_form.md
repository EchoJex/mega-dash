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
stops just before a cliff edge. The longer it falls after the press, the faster and further
it rolls: a short nudge for a late press, about five body widths from the top of a full
jump and midair jump.

**Every change of form happens under a puff** that hides it and fades fast; the picture
changes 10 steps after the form does.

From Lv6, **jump breaks the form** and he jumps; he must land before it can harden again. Every form has a 5-second cooldown after it ends. At Lv10, pressing a direction while he is
a statue **wakes it up as the walker (the owner asked for Rocky from Project Hail Mary; Claude Design would not draw that character, and on 26 Oct 2026 the owner chose an original instead: the cut-stone boulder on three stubby, kneeless, eyeless legs)**, which walks at half his speed and stays until a jump breaks the
form or it wears off; and the jump that breaks it throws stone shards out all the way round.

**The boulder's spin is Jigglypuff's Rollout** from Smash Ultimate (owner, 22 Oct 2026),
with far less height to wind up in: the longer it falls after the press, the faster it
turns, and it rolls on at that speed and slows to a stop.

Hits taken while hardened knock **small round stones** loose (up to three). They fall,
bounce and roll to a stop. Shooting one knocks it a medium distance along the ground, and
it crumbles like a clod of dirt on whatever it meets. From Lv6 shooting one sends it flying
away from where it was hit, like a billiard ball, bouncing off floors and walls until it
hits an enemy, and it explodes there.

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours a sheet, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- Granite Man's colours: primary `#5F443A` (brown), secondary `#A8A296` (stone grey). Each
  statue is carved from that rock: a treasure chest made of stone, an 8-bit Mega Man
  statue in his shooting pose, and the 2001 monolith (a plain upright slab).
- **These replace the player while they hold**, standing exactly where his feet were. The
  player is 24x24; a statue may be a little larger, the boulder about 29 pixels across.
- The boulder's `roll` clip should visibly turn; it loops for as long as it rolls, and the
  game plays it faster or slower with the boulder's speed, so draw one even turn.
- **The walker** stands and walks in place of him at Lv10: `stand` is one picture, `walk` a
  loop of its three legs stepping in turn. Rock, in Granite Man's colours, not the player's.

## The contract

Everything below is generated from the sheets by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`weapon-granite_form-statue.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-statue.sprite) | 40×40 | 20, 38 — his feet — the floor under the middle of him | in place of the player | chest, megaman, monolith |
| [`weapon-granite_form-boulder.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-boulder.sprite) | 40×40 | 20, 38 — the floor under the middle of it | in place of the player | roll |
| [`weapon-granite_form-rocky.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-granite_form-rocky.sprite) | 40×40 | 20, 38 — his feet — the floor under the middle of him | in place of the player | stand, walk |
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
| roll | loop | 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 · 3 | 36 | — | — | — |

**weapon-granite_form-rocky**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| stand | still | 5 | 5 | — | — | — |
| walk | loop | 2 · 2 · 2 · 2 · 2 · 2 | 12 | — | — | — |

**weapon-granite_form-stone**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| loose | still | 5 | 5 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **every picture stands on its pivot**, the floor under the middle of him: the statue, the boulder and the stone all sit on the floor, never float above it or sink into it.
- **the statue sheet has three still pictures**, one per shape: `chest`, `megaman`, `monolith`. The game picks one at random each time he hardens. They replace him, so each should read as roughly his size (he is 24x24); a little taller or wider is fine.
- **the rocky sheet** is the Lv10 walking form, the cut-stone boulder on three stubby, kneeless legs: `stand` is one still picture, `walk` loops while he walks at half his speed. It replaces him like the statue does.
- **the boulder** is about 29 pixels across (1.2 times his size), and its `roll` clip loops while it rolls.
- **nothing on these sheets hits by frame**: what the statue lands on and what the boulder rolls through is worked out from his body, so no frame carries a hit area.
- **colours**: Granite Man's brown `#5F443A` and stone grey `#A8A296` with shades built from them, and the near-black outline.
<!-- /generated:contract -->

## Handing this weapon to Claude Design

<!-- generated:prompt -->
Every sheet of the GRANITE FORM is finished art, so there is no prompt to paste.
<!-- /generated:prompt -->
