# Weapon art: how to draw a weapon for MEGA DASH

**Read this before drawing any weapon.** It is written for Claude Design, and for anyone
else drawing for the game. The look itself is `design/DESIGN-BRIEF.md`; this page is how a
weapon's drawings plug into the game. Each weapon also has its own brief in this folder,
named after it (`quake_hammer.md`), with every number for its sheets.

If this page and `CLAUDE.md` disagree, `CLAUDE.md` is right and this page is the bug.

---

## 1. The loop, and where you come in

1. **Claude Code builds the weapon**: how it plays, plus a set of **placeholder sheets**
   (picture strips). Every animation the game plays, every picture in it, how long each
   one shows and where each blow lands are already in those sheets, in the plainest
   shapes there are. They are in the game now, playing exactly as your art will.
2. **You redraw the pictures, in the same files.** You read them from this repository and
   hand back the same files with your drawing in them.
3. **The owner approves your work in Claude Design**, and you hand it off (Export → Hand
   off to Claude Code). Claude Code runs `npm run design:import` on the bundle. **If every
   check passes, your files go into the game as they are** — pictures, timing and hit
   areas — and the owner reads a plain list of what changed. If a check fails, nothing
   goes in, and the reason comes back in words.

That last rule is the owner's call (12 Oct 2026). It means **the timing and the hit areas
in your files ARE the game**. Change them on purpose, and say why in your note.

## 2. The files

| what | where |
|---|---|
| the weapon's sheets — what you redraw | `design/sprites/weapon-<weapon>-<sheet>.sprite` |
| the weapon's brief — what it is, every clip's numbers, the rules | `design/weapon-art/<weapon>.md` |
| the game's look and limits | `design/DESIGN-BRIEF.md` |
| the reference for 16-bit style and for scale | `design/sprites/player.sprite` (the player, 24×24) |
| the words used here | `design/GLOSSARY.md` |
| the format's reader and writer, and a kit for previews | `docs/sprite-fmt.js`, `docs/sprite-kit.js` (section 6) |

## 3. Reading a `.sprite` file

It is plain text. The top lines describe the sheet; then each picture ("frame") is a
header line followed by one row of characters per pixel row.

```
# weapon-quake_hammer-held             the sheet's id — never change it
grid      56x56                        the size of every frame — never change it
fudge     0.70 x 1.00                  not used by weapon art; leave it
pivot     28 28                        the pixel the game holds the sheet by
palette   0 #0A0A12 outline            up to 15 colours: a key, a colour, a name
palette   1 #A76625 head
note      Drawn by Claude Design ...   one line of credit (see section 7)

[jabOne 1] status=draft hold=4          clip "jabOne", its 1st frame, shown for 4 steps
........................................................
....                                   56 rows of 56 characters: "." is see-through,
                                       anything else is a palette key

[jabOne 4] status=draft hold=3 hit=27,21,25,19
                                       this frame is where jab one connects
```

- **A clip** is one animation the game asks for by name (`jabOne`, `charge`, `swing`).
  Its frames are the blocks with that name, numbered from 1, in the order they appear.
- **`hold`** is how many **steps** the frame stays on screen. The game runs at 60 steps a
  second, every frame shows for exactly its hold, and nothing else sets the speed. A clip
  lasts the sum of its holds.
- **`hit=x,y,w,h`** marks the frame a move **connects on**: the blow lands on that
  frame's first step, and the rectangle — left, top, width, height, in this sheet's own
  pixels — is everything it hits. A move that hits has exactly one such frame.
- **A bare `hit`** (no rectangle) marks frames that hurt while they show, along a shape
  the code works out (a spike's slanted line). Only "grow" clips use it.
- **`spawn=x,y`** is where something comes out on that frame: the dust where the hammer
  head meets the floor, the puffs round the head at full charge.
- **`pivot x y`** is the point the game puts at the hand, or the foot, or the middle —
  each sheet's brief says which. Everything is drawn **facing right**; facing left, the
  game mirrors the picture around the pivot.
- **`status`**: mark every frame you finished `draft`, any you did not `wip`. Do not
  write `ready` — that word means "playing in the game", and only the game can say so.

## 4. What you may change, and what you must keep

**Keep, or the import refuses the sheet:**

- file names, the `# id` line and `grid`;
- every clip the brief lists, under the same name — none added, none removed;
- exactly one hit area on each move that hits; on a spike, its `hit` frames first;
- every hit area, spawn point and the pivot inside the sheet;
- at most 15 colours per sheet, each key declared once.

**Change freely — each goes straight into the game when the checks pass:**

- the pictures and the colours;
- any frame's hold, and how many frames a clip has;
- **which frame a move connects on — that moves when it hits in the game;**
- **the hit area — that changes what it hits in the game;**
- spawn points and the pivot, to follow your drawing.

**And keep to the rules in the weapon's brief** ("What the code holds the drawing to"):
for example, a jab must still connect before the next tap is accepted, and every blow must
still reach a minion standing against the player. `npm test` checks every one; a handoff
that breaks one is refused with the reason.

## 5. Drawing it

- **16-bit, SNES era** (`design/DESIGN-BRIEF.md`, section 2): up to 15 colours a sheet.
  How it is shaded and outlined is yours to decide.
- **Draw facing right.** The game mirrors the sheet around its pivot for the other way.
- **Nothing is ever rotated or scaled by the game.** Every angle a thing is seen at is a
  frame you draw. That is how an SNES game did it, and it keeps the pixels crisp.
- **The held weapon is drawn in front of the player; effects** (dust, spikes, sand)
  **behind him.** Layering follows ordinary 2D practice (`design/DESIGN-BRIEF.md`,
  section 5) — keep the player readable.
- **A hit area covers what you drew where the blow lands, plus a pixel.** The player's
  attacks are slightly generous; never smaller than the drawing. For a swing, cover the
  head where it is on the hit frame and where it was the frame before — the sweep the eye
  sees. It must not reach further than the drawing does by more than that pixel.
- **His body does not change pose** — only the weapon moves. If a move needs the player to
  move too (a wind-up, a lean), say so in your note: that is new frames on the player's own
  sheet, built separately.
- **The placeholder's sizes are the owner's.** The Quake Hammer was made a quarter shorter
  after a playtest; draw to the size the placeholder shows, not bigger.

## 6. Previewing it — show the owner the game, not a still

Before handing off, show **every clip playing at game speed** — 60 steps a second, each
frame for its hold — **facing both ways**, **beside the player** at true scale, with the
**hit areas and pivot drawn on**. A clip that looks right one frame at a time can still
land wrong in motion; this is the moment to find out.

You do not need to write a reader for the format. The game's own is on its website:

```js
import { parse, serialize } from 'https://echojex.github.io/mega-dash/sprite-fmt.js';
import { frameAt, drawFrame, rowsFromCanvas } from 'https://echojex.github.io/mega-dash/sprite-kit.js';

const doc = parse(text);                        // a .sprite file's text
const f = frameAt(doc, 'jabOne', step);         // the frame showing `step` steps in
drawFrame(ctx, doc, f, x, y, { scale: 4, facing: 1, marks: true });   // pivot at (x, y)
// …after drawing a frame onto a canvas at 1:1:
f.rows = rowsFromCanvas(canvasCtx, doc.w, doc.h, doc.palette);
const out = serialize(doc);                     // the file to hand back, byte-exact
```

If those addresses cannot be reached from your page, copy `docs/sprite-fmt.js`,
`docs/sprite-kit.js`, `docs/nes-palette.js` and `docs/marks.js` next to it — they import
only each other.

## 7. Handing it off

- **Export → Hand off to Claude Code** (or download the project as a zip).
- In it: **the `.sprite` files you drew** (anywhere in the bundle — each is matched by its
  first line) and **`HANDOFF.md`**, saying:
  - what the owner approved, and when;
  - every change to timing, hit areas, spawn points or the pivot, and why;
  - anything you would like changed in the code — a bigger sheet, another clip, the player
    moving with the weapon. Those are requests, not changes: the import cannot make them.
- Leave the `note` line to the import: it writes the credit every AI-made drawing in this
  game carries, `Drawn by Claude Design at the owner's request, <date>.`

## 8. What happens next

`npm run design:import` reads the bundle without running anything in it, checks every
sheet against its contract, puts the files in, builds them, and runs every test in the
game. If anything fails, every file is put back as it was and the reason is printed. If
everything passes, the game plays your art straight away, the weapon's brief is
regenerated to match, and a record of the handoff — your note and the list of changes —
is kept in `design/handoffs/`.
