# The air minion and the pickups — group 2 of 3

PIXIE (the air minion), the E-Tank and the EXP orb, drawn as variants for the owner to pick, by
their ask of 5 Nov 2026 (*Art is picked from variants* in `CLAUDE.md`). Group 1 was the world
pieces (`design/world-art/`); group 3 is the HUD.

**The review canvas:** [MEGA DASH Air Minion and Pickups](https://claude.ai/artifact/CzXM8wKFKeMrYsF2iRwTeH),
one board per thing. The owner picks in each board's comment thread.

## How it works

- `variants/*.sprite` are the drawings, in the game's own format (`docs/sprite-fmt.js`), so a
  picked one is copied into `design/sprites/` as it is and built with `npm run sprites:build`.
- `node design/minion-art/render.mjs <folder>` writes the canvas's pictures into that folder:
  each variant's frames side by side, its animation at game speed (an animated PNG), and for
  PIXIE its Fire, Water and Grass copies with and without the elite's gold rim. Upload them to
  the canvas and point its boards at them.

## The rules the drawings keep

- **PIXIE is three colours** (`0` outline, `1` body, `2` detail), like the Spiglet: each area's
  copy is made by turning the body colour into that boss's primary (`minionFor`), and
  `npm run sprites:build` can only do that for a three-colour drawing. The board asks the owner
  whether to keep that or go to 16-bit shading. **The owner's answer:** the Pixie stays simple;
  other sprites get 16-bit shading. Its wings use a fourth key, `3`, which is white in every
  area; `render.mjs` paints it, and `npm run sprites:build` will need the same when it goes in.
- **The pickups declare their own colours**: they are the same in every area.
- Grid 16×16 for all three. PIXIE's box is 12×12 and a pickup's is 7×7; the rest is room.

## Picks

| thing | variants | picked |
|---|---|---|
| DRIFTER, **now the PIXIE** | A jelly · B rotor drone · C manta · D bat-wing eye | **D**, with white wings in every area, always facing the screen, and kept in this simple style (owner, 10 Nov 2026: "D, but with white wings for all slices, always facing the screen. other sprites will need 16-bit shading, but not Drifter [now called Pixie]"). **In the game**, 10 Nov 2026 |
| E-Tank | A energy can · B heart cell · C glass vial | **B, as the owner's own still heart**, imported pixel for pixel at 1×, 18×18 (owner, 10 Nov 2026: "scaling only in exact incriments until it is equal to or slightly larger that the current placeholder e-tank"; today's E-Tank is 9×9 and the heart is drawn at 18×18, so 1× is the only exact size). **In the game**, 10 Nov 2026 |
| GUNNER, a new flier | A rotor gunner · B twin guns · C bubble canopy · D armoured · E twin rotors · F spiked | **B, with E's twin rotors** (owner, 10 Nov 2026: "everything about B, but the twin rotors of E. gunner should fire a small 3 round burst every 3 pause cycles. for fire slice, make the red eye black"; asked where the three shots go: "Ahead, fanned out"). It began as the owner's ask on the rotor drone: "create a new flying minion [Gunner], based on this variant, redraw it with a full palette, and with 6 variants". **In the game**, 10 Nov 2026: `gunner.py` draws the pick into `design/sprites/gunner.sprite` |
| EXP orb | A gem · B coin · C glow orb | **C, the glow orb** (owner, 10 Nov 2026: "C"), with a big one: "big exp should be 2.5 the size. boss should burst into a spray of small and big". The big orb is `variants/exp-c-big.sprite`, 20×20. **In the game**, 10 Nov 2026 |

**Importing a picture the owner sends:** take it pixel for pixel, and scale only by whole numbers
(2×, 3×), never by halves or by redrawing. Check first whether it is already blown up (every 2×2
block one colour); only then is a smaller whole-number size exact. On 10 Nov 2026 the heart was
redrawn by hand at 9×9 instead, and the owner sent it back.

**The Gunner is full colour, and still gets each area's copy.** `gunner.py` draws the six from
shapes, shaded from the top left. Palette keys named `body ...` are turned into shades of each
boss's primary, keeping how much lighter or darker each is than the plain `body` key; the rest
stays as drawn. `tools/shade.mjs` is the one copy of that, used by `render.mjs` for the canvas and by
`npm run sprites:build` for the game. `eye` in `src/data/minions.js` recolours the lens for one
area (black in Fire).

**Page 1 is archived** (10 Nov 2026) in `design/archive/air-minion-and-pickups/`, with its unpicked drawings. The canvas keeps page 2, the Gunner.
