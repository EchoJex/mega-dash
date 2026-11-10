# The air minion and the pickups — group 2 of 3

DRIFTER (the air minion), the E-Tank and the EXP orb, drawn as variants for the owner to pick, by
their ask of 5 Nov 2026 (*Art is picked from variants* in `CLAUDE.md`). Group 1 was the world
pieces (`design/world-art/`); group 3 is the HUD.

**The review canvas:** [MEGA DASH Air Minion and Pickups](https://claude.ai/artifact/CzXM8wKFKeMrYsF2iRwTeH),
one board per thing. The owner picks in each board's comment thread.

## How it works

- `variants/*.sprite` are the drawings, in the game's own format (`docs/sprite-fmt.js`), so a
  picked one is copied into `design/sprites/` as it is and built with `npm run sprites:build`.
- `node design/minion-art/render.mjs <folder>` writes the canvas's pictures into that folder:
  each variant's frames side by side, its animation at game speed (an animated PNG), and for
  DRIFTER its Fire, Water and Grass copies with and without the elite's gold rim. Upload them to
  the canvas and point its boards at them.

## The rules the drawings keep

- **DRIFTER is three colours** (`0` outline, `1` body, `2` detail), like the Spiglet: each area's
  copy is made by turning the body colour into that boss's primary (`minionFor`), and
  `npm run sprites:build` can only do that for a three-colour drawing. The board asks the owner
  whether to keep that or go to 16-bit shading.
- **The pickups declare their own colours**: they are the same in every area.
- Grid 16×16 for all three. DRIFTER's box is 12×12 and a pickup's is 7×7; the rest is room.

## Picks

| thing | variants | picked |
|---|---|---|
| DRIFTER | A jelly · B rotor drone · C manta · D bat-wing eye | not yet |
| E-Tank | A energy can · B heart cell · C glass vial | not yet |
| EXP orb | A gem · B coin · C glow orb | not yet |
