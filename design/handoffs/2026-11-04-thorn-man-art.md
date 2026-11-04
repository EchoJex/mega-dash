# Design handoff, 2026-11-04: thorn-man-art.zip

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **boss-thorn-body**
  - 16 frames redrawn
  - colours: 15 in all (11 added, 3 changed)
  - idle: 4 frames (was 2); same length, frames re-timed
  - aim: its spawn point moved -2, 0 px
  - throw: its spawn point moved -2, 0 px

## The design's own note

> # Thorn Man (the Grass boss) — art handoff
> 
> Drawn on the design canvas "Thorn Man Art" at the owner's request, 4 Nov 2026.
> **Approved by the owner on 4 Nov 2026** ("looks good"), after picking every piece on the canvas.
> 
> ## What is in this bundle
> 
> | file | what it is | goes in by itself? |
> |---|---|---|
> | `boss-thorn-body.sprite` | his whole body sheet: all 9 clips, 16 frames, 64 × 64, 15 colours | **yes**, through `npm run design:import` |
> | `room-pieces/thorn-tile.txt` | the Phillips head tile (16 × 16, 1 frame) | no: the game has no sheet for it yet |
> | `room-pieces/thorn-kunai.txt` | the leaf kunai (16 × 16, 1 frame, drawn pointing right) | no: same |
> | `room-pieces/thorn-seedpod.txt` | the layer-3 seed pod (32 × 32, a 4-frame idle, 15 steps each) | no: same |
> 
> The three room pieces are written in the `.sprite` format but saved as `.txt`. The import refuses any
> `.sprite` it does not know, which would have stopped his body going in.
> 
> ## What the owner picked
> 
> - **Body: look 04.** READY stance, leaf horns, long scarf tails, leaf armour (green gi top, brown
>   trousers, leaf shoulder plates). The owner asked for two changes: the knotted waist tail went,
>   and he has small square pouches strapped to the outside of each thigh instead.
> - **Arms: spring arm 05.** A thick vine spring with even winding, with a quarter fewer turns than
>   first drawn (3 loops on the near arm, 5 on the far), so the coil reads at idle length. The owner
>   asked for stiff springs like the fighters in Nintendo's ARMS. Each arm ends in a hooked 4-point
>   shuriken.
> - **Phillips head tile: 3, mossy stone.**
> - **Leaf kunai: 4, bamboo leaf.**
> - **Seed pod: B, the egg.** An egg shape, narrower at the top, in a cup of leaves. Only the pod breathes; the
>   owner asked for the leaf cup to stay still.
> 
> ## Changes to timing, hit areas, spawn points and the pivot
> 
> | clip | before | now | why |
> |---|---|---|---|
> | idle | 2 frames × 30 steps | **4 frames × 15 steps** (still 60) | his scarf flutters and the shuriken turn a notch each frame, which needs four pictures to look smooth |
> | aim | spawn 56,29 on frame 2 | **spawn 54,29** on frame 2 | the middle of the thrust-out shuriken, where the vines should leave from |
> | throw | spawn 54,27 on frame 2 | **spawn 52,27** on frame 2 | the middle of the flung shuriken, where the kunai leave from |
> 
> Unchanged: every other hold (aim 18 · 12, shoot 6 · 6, zip 4, cling 30, hold 8 · 8, toss 6,
> throw 12 · 8, fall 6), the pivot (32, 60), and his 32 × 43 hit box. No clip has a hit area.
> 
> ## Rules from the owner, word for word, for Claude Code to keep
> 
> 1. **"all bosses will have a common theme of a single 'eye'. This theme should be interpreted with
>    very wide creativity."** (The owner liked Strike Man's and Thorn Man's eye; Thorn Man's is a single
>    glowing slit in his hood.) This is a rule for every boss from now on. Please record it where the
>    design rules live, so future boss briefs carry it.
> 2. **"Attacks (grabs) will make use of this coiled length plus artistic liberties to reach across the
>    stage as it is currently programmed to do"**: the spring arm is the idle length of his reach, and
>    the grab still flies across the room as the code does now.
> 
> ## Requests for the code (the import cannot make these)
> 
> 1. **Give the three room pieces sheets of their own** and draw them from these files in place of the
>    plain shapes: the tile (both faint in the background and brought forward), the kunai, and the seed
>    pod with its 4-frame idle. Each file's colours are listed in its header; none uses more than 15.
> 2. **The vines the game draws should look like they come from the spring arm**: a vine green
>    (`#5ED04A` light, `#2AAB1C` mid, `#1C7A16` shade) leaving the shuriken at the spawn point.
> 3. **Cling is drawn upright.** On the ceiling he will look like he is crouching on a wall. If that
>    reads wrong in play, cling may need a ceiling version; ask the owner before adding one.
> 4. **The aim wind-up is the player's only warning before a grab.** If playtesting shows the drawn-back
>    frame does not read at a glance, ask for a bigger pull-back rather than a longer hold.
> 5. Add this art to the AI-made list in `CLAUDE.md` in the same commit, as the import's note line asks.

## Also in the bundle, not used

- `room-pieces/thorn-seedpod.txt`
- `room-pieces/thorn-kunai.txt`
- `room-pieces/thorn-tile.txt`
