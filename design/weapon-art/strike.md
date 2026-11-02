# Strike Man — art brief

Read `design/weapon-art/README.md` first: it says how drawn art with its own timing works in
this game, what you may change and what to hand back. This page is Strike Man himself, the
Fighting boss. He is the first boss to be drawn.

**He is drawn now** (owner's pick, 2 Nov 2026): a rusty robot boxer on a tank-tread base, one
large red eye, round red gloves. The sheet, its size, its pivot, every clip, every hold and
every hit area are real: the game plays them exactly as drawn. To see him, play a dev build and pick STRIKE
in the dev menu's BOSS PICKER; BOSS LAYER L2 and L3 show the guard, the uppercut, the
energy blast and the spinning lariat.

## What he is, in the owner's words

"Strike man needs to be a little shorter and a bit wider. Attacks are inspired by street
fighter 2 balrog, typical American heavyweight boxer type. Short straight jabs, a quick back
dash for dodge, and a lunging strike where the boss leans back, readies their punch, then
thrusts forward with the gloved fist, traveling a great distance in the process."

Inspired by, not a copy: draw an original heavyweight boxer, not any existing character.

His room is an underground fight pit — chain-link cage walls, a stained mat floor and
hanging lamps — with two heavy training bags swinging on ceiling rails. A psychic weapon
can lift a bag and throw it at him. He is not knocked flat: he jolts and falls limp, leaned
back about 45 degrees away from the bag, treads planted. Stage 1 (`dizzy`) has his eye
flickering and yellow stars circling his head; stage 2 (`dizzyHard`) has smoke, sparks and
yellow birdies. A bag that lands while he is staggered, or less than 30 seconds after a
stagger ended, gives stage 2; otherwise stage 1. The stars and birdies are drawn in the
art, so they follow his head as he leans; the game draws none of its own.

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
| `down` | jolted by a thrown bag, ending in the limp 45° lean with treads planted |
| `dizzy` | stage 1 of the stagger: the lean, eye flickering, stars circling, for 5 seconds |
| `dizzyHard` | stage 2: the same lean with smoke, sparks and birdies, for 7 seconds |
| `riseReady`, `rise` | layer 2 and 3: the uppercut's crouch, then rising fist first; `rise` loops while he is in the air |
| `blast` | layer 3: an energy blast thrown from his glove; the shot leaves from its spawn point |
| `spinReady`, `spin` | layer 3: the crouch, then a spinning lariat that crosses the room; `spin` loops while it travels |

## The look

- SNES-era 16-bit (`design/DESIGN-BRIEF.md`): up to 15 colours, colour ramps, the
  near-black outline `#0A0A12` round the outside.
- His colours: primary `#EA6A34` (orange), secondary `#7C2D12` (brown). Shades come from
  those two. Round red boxing gloves with white cuffs.
- A rusty robot boxer: gunmetal barrel body with worn orange paint, a round head with one
  large red eye that never blinks, jointed arms, and a tank-tread base. His upper body turns
  and tips on a turret ring above the treads. About 1.8 times the player's height (the
  player is 24 pixels tall) and nearly as wide as he is tall.
- **He replaces his plain block**, standing on the pivot. Draw him facing right; the game
  mirrors him to face the player.

## The contract

Everything below is generated from the sheet by `npm run art:brief`, so it is always what
the game really plays.

<!-- generated:contract -->
### The sheets

| file | size | pivot (the pixel the game holds it by) | drawn | clips |
|---|---|---|---|---|
| [`boss-strike-body.sprite`](https://github.com/EchoJex/mega-dash/blob/main/design/sprites/boss-strike-body.sprite) | 96×64 | 48, 60 — the floor under the middle of him | in place of the boss | idle, walk, guard, jabReady, jab, back, lean, lunge, recover, down, dizzy, dizzyHard, riseReady, rise, blast, spinReady, spin |

### Every clip, frame by frame

Steps are 1/60 of a second. Frames are listed by how many steps each shows; **bold** is the frame a move connects on (its first step). Hit areas are in the sheet's own pixels, `x, y, width×height`, drawn facing right.

**boss-strike-body**

| clip | kind | frames (steps each) | lasts | connects on step | hit area | spawn point |
|---|---|---|---|---|---|---|
| idle | loop | 6 · 6 · 6 · 6 · 6 · 6 · 6 · 6 | 48 | — | — | — |
| walk | loop | 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 | 32 | — | — | — |
| guard | loop | 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 | 32 | — | — | — |
| jabReady | once | 6 · 6 | 12 | — | — | — |
| jab | hit | **4** · 3 · 3 | 10 | 0 | 66, 35, 17×11 | — |
| back | once | 4 · 3 · 4 · 3 | 14 | — | — | — |
| lean | once | 10 · 10 · 10 | 30 | — | — | — |
| lunge | travel | **4** · 4 | 8 | 0 | 74, 34, 13×11 | — |
| recover | once | 8 · 10 | 18 | — | — | — |
| down | once | 4 · 4 · 4 · 38 | 50 | — | — | — |
| dizzy | loop | 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 | 64 | — | — | — |
| dizzyHard | loop | 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 | 64 | — | — | — |
| riseReady | once | 8 · 12 | 20 | — | — | — |
| rise | travel | **6** · 6 | 12 | 0 | 40, 1, 21×41 | — |
| blast | once | 7 · 7 · 6 · 8 | 28 | — | — | 81, 33 |
| spinReady | once | 10 · 12 | 22 | — | — | — |
| spin | travel | **5** · 5 · 5 · 5 | 20 | 0 | 14, 40, 68×14 | — |

Clip kinds: **hit** plays once; exactly one frame carries hit=x,y,w,h — the step it connects and its hit area; **loop** loops for as long as the move lasts; no hit; **once** plays once, and its length is how long the thing lasts; no hit; **grow** plays once; starts with frames marked with a bare hit (they hurt), then frames without (they stand); **lash** plays once; exactly two frames carry hit=x,y,w,h — the first hurts lightly while it shows, the second is the main hit and its area is the tip; **still** a single frame; no hit; **travel** loops while the move carries him; exactly one frame carries hit=x,y,w,h — from the step that frame first shows, that area hurts until the move ends.

### What the code holds the drawing to

Worked out from the weapon's ladder; `npm test` checks every one, and a handoff that breaks one is refused with the reason.

- **he stands on the pivot**, the floor under the middle of him. His collision box (what the player's shots hit, and what hurts to touch) is 38 wide and 44 tall, centred on the pivot and standing on it; draw his body to fill about that, a heavyweight boxer, a little shorter and a bit wider than the old sumo build.
- **every jab reaches a player standing against him**: the `jab` hit area starts at or inside the front of his body, reaches at least 8 pixels past it, and covers part of 12 to 24 pixels above the floor — the player is only 24 tall, so a punch at Strike Man's own chest height sails over his head.
- **the lunge's fist is in front of him at the player's head height**, and must reach a player standing against him.
- **the uppercut (`rise`) covers the space above his head**, so a player jumping over him is caught.
- **the spin is a spinning lariat**: the band both gloves sweep through covers at least the width of his collision box.
- **`blast` has exactly one spawn point**, the fist the energy blast leaves from; the shot leaves on that frame's first step.
- **`lean` is the lunge's warning**: he plainly rocks back with the glove cocked behind him. It is what makes a punch that crosses most of the room fair, so it has to read at a glance.
- **`down` ends in the limp 45° lean, treads planted**, and `dizzy` and `dizzyHard` (stage 2) loop in that lean. The stars (`dizzy`) and the birdies (`dizzyHard`) are drawn in the art, so they follow his head as he leans; the game draws none of its own.
- **colours**: Strike Man's orange `#EA6A34` and brown `#7C2D12` with shades built from them, the near-black outline, and red boxing gloves.
<!-- /generated:contract -->

## Handing this boss to Claude Design

<!-- generated:prompt -->
Every sheet of the STRIKE MAN is finished art, so there is no prompt to paste.
<!-- /generated:prompt -->
