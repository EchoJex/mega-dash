# Drake Breath — art brief

Read `design/weapon-art/README.md` first: it says how weapon art works in this game, what
you may change and what to hand back. This page is the Drake Breath itself.

**Today every picture is a placeholder**: flat indigo, violet, teal and white shapes. The
sheets, their sizes and their pivots are real: the game plays them now exactly as it will
play the finished art. To see them, play a dev build (dev menu → WEAPONS: ALL, then equip
DRAKE BREATH), and use START LV 1, 3, 6 and 10 to see each rung.

## What it is, in the owner's words

Drake Man's weapon (the Dragon boss): "a dragon head cannon. Dragon is going to be pretty
busy: use colors like indigo, violet and teal when the animation might otherwise resemble
fire. Holding fire rears the dragon head cannon back for a short wind-up — you cannot move,
and the player conveys the rear-back with a slightly broad stance." (23 Oct 2026)

For the look: **"i like the lucario soul fire colors and like his final smash beam too."**

Each rung adds to the one before:

- **Lv1 — the breath.** "Diagonally downward puffs that travel along the ground, again,
  indigo, violet and teal flamethrower-like attack similar to bowser neutral B." While fire
  is held the cannon breathes a stream of puffs angled down; each lands on the floor and
  rolls forward, slowing and spreading. Like Bowser's, the breath weakens the longer it is
  held (the puffs go less far) and recovers when let go.
- **Lv3 — the wave.** On letting go: "a wide energy wave like Guile's Flash Kick ... from
  slightly below ground level arcing to about 2 head spaces above the player but travel
  straight forward." It covers overhead and diagonally overhead, never behind, and goes only
  a short way.
- **Lv6 — the blast.** Corrin's neutral B: holding for about a second charges a medium blast
  (the cannon glows violet). On release the wave still stops where it always does and the
  blast carries on past it.
- **Lv10 — the beam.** "Basically the Gaster Blaster beam: an ultra quick narrow beam
  telegraphing a magnificent massive laminar beam with the same overhead reach as the Lv3
  wave, traveling nearly full screen, lasting 2s before dissipating just like Gaster Blaster
  does." A two-second hold makes the cannon glow white; release fires a one-pixel line across
  the room, then the beam. It **erases every enemy shot it touches**, "the streaky way that
  DBZ foes get erased": each shot breaks into streaks that blow away down the beam.

Nothing about it is fire: it lays no burning ground and sets nothing alight.

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours a sheet, colour ramps, the
  near-black outline `#0A0A12` where an outline helps it read.
- **Indigo, violet and teal with a near-white core** — Lucario's soul-fire aura and his
  final-smash beam are the references. Energy, not flame.
- **The cannon is a dragon's head** worn on his hand (he has no arm cannon of his own). It is
  drawn in his hand in front of him, or behind him a quarter darker when it is in his far
  hand; the game does that shading itself.
- **The beam should feel huge and laminar**: a smooth, steady flow with a bright core, not a
  flicker. Its tiles repeat edge to edge across nearly the whole screen, so the body tile
  must join seamlessly.
- He is 24x24 (see `design/sprites/player.sprite`); the cannon is about half his length.

## The contract

Everything below is generated from the sheets by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`weapon-drake_breath-held.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-held.sprite) | 24×16 | 4, 9 — his hand, at the back of the cannon | in front of the player | rest, rear, breathe, charge, chargeFull |
| [`weapon-drake_breath-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-body.sprite) | 24×24 | 12, 24 — his feet — the floor under the middle of him | in place of the player | rear, breathe, charge, chargeFull |
| [`weapon-drake_breath-puff.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-puff.sprite) | 16×16 | 8, 8 — its middle | behind the player | burn |
| [`weapon-drake_breath-wave.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-wave.sprite) | 16×48 | 8, 46 — its foot, just below the floor | behind the player | travel |
| [`weapon-drake_breath-blast.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-blast.sprite) | 16×16 | 8, 8 — its middle | behind the player | fly |
| [`weapon-drake_breath-beam.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-beam.sprite) | 32×48 | 0, 46 — the tile's bottom corner nearest the mouth | behind the player | tele, start, body, fade |
| [`weapon-drake_breath-streak.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/weapon-drake_breath-streak.sprite) | 16×4 | 0, 2 — the end nearest the mouth | behind the player | blow |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**weapon-drake_breath-held**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| rest | still | 5 | 5 | — | — | — |
| rear | once | 4 · 4 · 4 | 12 | — | — | — |
| breathe | loop | 4 · 4 | 8 | — | — | — |
| charge | loop | 6 · 6 | 12 | — | — | — |
| chargeFull | loop | 4 · 4 | 8 | — | — | — |

**weapon-drake_breath-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| rear | once | 4 · 4 · 4 | 12 | — | — | — |
| breathe | loop | 4 · 4 | 8 | — | — | — |
| charge | loop | 6 · 6 | 12 | — | — | — |
| chargeFull | loop | 4 · 4 | 8 | — | — | — |

**weapon-drake_breath-puff**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| burn | once | 10 · 10 · 10 | 30 | — | — | — |

**weapon-drake_breath-wave**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| travel | loop | 3 · 3 | 6 | — | — | — |

**weapon-drake_breath-blast**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| fly | loop | 4 · 4 | 8 | — | — | — |

**weapon-drake_breath-beam**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| tele | loop | 2 · 2 | 4 | — | — | — |
| start | loop | 2 · 2 · 2 · 2 | 8 | — | — | — |
| body | loop | 2 · 2 · 2 · 2 | 8 | — | — | — |
| fade | once | 6 · 6 · 6 · 6 | 24 | — | — | — |

**weapon-drake_breath-streak**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| blow | once | 5 · 5 · 5 | 15 | — | — | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **nothing hits by frame**: the breath puffs, the wave, the blast and the beam hurt by their own shapes, which the code sets from the ladder. Draw to fit those shapes; no frame carries a hit area.
- **the wave and the beam are 43 pixels tall**: from 3 pixels below the floor he stands on to 16 pixels (about two head-heights) above the top of his head. Their pivots sit at that bottom edge.
- **the beam is drawn as tiles 32 wide**, laid edge to edge from the cannon's mouth outward, so a `body` tile must join seamlessly to itself and to `start` (the first tile, at the mouth). `tele` is the one-pixel telegraph line before it fires; `fade` is the beam thinning away at the end of its two seconds.
- **the cannon is held at its back end** (the pivot), facing right; the mouth is its far end, about 16 pixels ahead of his hand. `rear` is the wind-up (it rears back and up), `breathe` has the jaw open, `charge` glows violet (the Lv6 blast is ready) and `chargeFull` glows white (the Lv10 beam is ready).
- **some timing is the game's, not the drawing's**: the wind-up, how long a puff lives (shorter the longer the breath is held), and the beam's fade. Those clips' frames are spread evenly over that time, so their holds set the order and proportion of the frames, not how long they last.
- **colours**: indigo, violet and teal with a near-white core, never fire colours — Dragon is not Fire. The owner's references are Lucario's soul-fire colours and his final-smash beam (Super Smash Bros.).
<!-- /generated:contract -->

## Handing this weapon to Claude Design

<!-- generated:prompt -->
Every sheet of the DRAKE BREATH is finished art, so there is no prompt to paste.
<!-- /generated:prompt -->
