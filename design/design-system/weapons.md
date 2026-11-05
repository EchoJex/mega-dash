# Drawing a weapon

The full guide is `design/weapon-art/README.md` in the repository, and each weapon has its own brief beside it (`design/weapon-art/<weapon>.md`) with every number for its sheets. Read both before drawing; the repository wins over this page.

- **A weapon's timing and hit areas live in its drawing.** In a `.sprite` sheet, `hold` is how many steps a frame shows (60 a second); `hit=x,y,w,h` marks the frame a move connects on and the rectangle it hits; a bare `hit` marks frames that hurt while they show; `spawn=x,y` is where something comes out; `pivot` is the pixel the game holds the sheet by.
- **The game plays your files exactly as you hand them back**, once the checks pass. Change timing or a hit area on purpose, and say why in the note.
- **Keep** the file names, the `# id` line, `grid`, and every clip the brief lists under the same name; at most 15 colours a sheet. **Change freely** the pictures, the colours, the holds, how many frames a clip has, which frame connects, the hit areas, spawn points and the pivot.
- **Draw facing right.** The game mirrors around the pivot for the other way and never rotates or scales a picture: every angle is a frame you draw.
- **A hit area covers what you drew where the blow lands, plus a pixel** — never smaller than the drawing, never more than a pixel beyond it.
- **Offensive slot 1 is his right hand, slot 2 his left, and his hands stay his own as he turns.** The weapon in his NEAR hand is drawn in front of him; the one in his FAR hand behind him, a quarter darker, which the game does: draw every weapon at full colour, facing right, held in front. **Effects (dust, spikes, sand) go behind him.** Keep him readable.
- **His body changes pose only through a body sheet** (`weapon-<weapon>-body.sprite`, Simon's Whip so far): same paper, pivot, clips and holds as the held sheet, drawn in place of his normal picture, in the player's twelve colours only. He has no arm cannon; his front arm ends in a hand.
- **Draw to the size the placeholder shows.** The placeholder's sizes are the owner's.
- **Show every clip at game speed, facing both ways, beside the player, with the hit areas and pivot drawn on**, before asking for approval. The game's own reader for the format is `https://echojex.github.io/mega-dash/sprite-fmt.js`, with `sprite-kit.js` beside it.
