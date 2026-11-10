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
  whether to keep that or go to 16-bit shading. **The owner's answer:** the Pixie stays simple;
  other sprites get 16-bit shading. Its wings use a fourth key, `3`, which is white in every
  area; `render.mjs` paints it, and `npm run sprites:build` will need the same when it goes in.
- **The pickups declare their own colours**: they are the same in every area.
- Grid 16×16 for all three. DRIFTER's box is 12×12 and a pickup's is 7×7; the rest is room.

## Picks

| thing | variants | picked |
|---|---|---|
| DRIFTER, **now the PIXIE** | A jelly · B rotor drone · C manta · D bat-wing eye | **D**, with white wings in every area, always facing the screen, and kept in this simple style (owner, 10 Nov 2026: "D, but with white wings for all slices, always facing the screen. other sprites will need 16-bit shading, but not Drifter [now called Pixie]"). Not in the game yet |
| E-Tank | A energy can · B heart cell · C glass vial | **B, as the owner's own still heart** (owner, 10 Nov 2026, with their 18×18 drawing attached: "no animation frames. just a still heart, scaled as needed to match the current e-tank size"). Redrawn by Claude at 9×9, today's E-Tank size, in the owner's red and black; halving it pixel by pixel came out lopsided. Not in the game yet |
| EXP orb | A gem · B coin · C glow orb | **C, the glow orb** (owner, 10 Nov 2026: "C"). Not in the game yet |
