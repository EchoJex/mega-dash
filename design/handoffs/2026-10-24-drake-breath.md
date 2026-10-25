# Design handoff, 2026-10-24: Drake Breath

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **weapon-drake_breath-beam**
  - 14 frames redrawn
  - colours: 9 in all (5 added, 1 removed, 4 changed)
  - start: 4 frames (was 2); same length, frames re-timed
  - body: 4 frames (was 2); same length, frames re-timed
- **weapon-drake_breath-blast**
  - 2 frames redrawn
  - colours: 8 in all (5 added, 2 removed, 3 changed)
- **weapon-drake_breath-held**
  - 10 frames redrawn
  - colours: 13 in all (8 added, 4 changed)
- **weapon-drake_breath-puff**
  - 3 frames redrawn
  - colours: 10 in all (6 added, 1 removed, 4 changed)
- **weapon-drake_breath-streak**
  - 3 frames redrawn
  - colours: 4 in all (1 removed, 3 changed)
- **weapon-drake_breath-wave**
  - 2 frames redrawn
  - colours: 7 in all (4 added, 2 removed, 3 changed)

## The design's own note

_None came with the bundle._

## Proposed by Design, not built

Design's preview page asks the code for two things the sheets cannot carry:

- the cannon rides his idle bob (moves up and down with his breathing);
- every clip but idle puts him in a wide, slightly crouched stance (drawn only
  as rows inside `IdleCannon.dc.html`, not as a `.sprite`).

Neither is in the game. They wait on the owner's word.

## Also in the bundle, not used

- `IdleCannon.dc.html`
- `Main.dc.html`
- `canvas.json`
- `ref/player-sprite.txt`
