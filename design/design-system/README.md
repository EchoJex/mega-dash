MEGA DASH is a phone game: a 16-bit side-scrolling platformer with Mega Man 2's movement and Vampire Survivors' levelling, built in Phaser and shipped as an Android app and a Windows app. Use this system for anything drawn for it — a boss room, a sprite, a menu, a mockup. **The game's repository wins over this page**: `CLAUDE.md` holds the rules, `design/DESIGN-BRIEF.md` the same rules on one page, `design/weapon-art/README.md` how a weapon's drawings plug in, `design/TRACKER.md` what the game should contain. If this page and the repository disagree, follow the repository and say which line differs. This page's own files are in the repository too, in `design/design-system/`: its words are written by hand, and its numbers (every token, the boss footprints, the player's clips) are written from the game's code by `npm run design:system`.

## The screen

- Draw at the game's own size: `screen-height` (224) tall and `screen-width-min` (320) to `screen-width-max` (480) wide. **Check every design at both widths.** The real screen scales the picture up by a whole number, so place everything on whole pixels and never smooth-scale, rotate or blur.
- Characters stand on `floor-y` (184). The thumb pads cover `pads-top` (199) to the bottom edge, see-through with a thin `ui-gold` border each, so the ground shows behind them; the HUD may use the top `hud-band` (33). Keep anything the player must see between the two.
- A boss room is exactly one screen: walls at both edges, ceiling at the top, the camera never moves.
- Time is counted in steps, 60 a second. "Frames" in a duration means steps. A beat is two seconds (Volt Man's room runs on it).

## The 16-bit look

- **A sprite has up to 15 colours plus see-through.** How it is shaded and outlined is yours to decide (the owner's call, 17 Oct 2026); keep every character and bullet readable against a dark room.
- Colours are free: snapping to the SNES's 32 levels per channel is optional.
- **A boss room's pictures hint at the game its boss's weapon comes from; its music hints at the element** (owner, 22 Oct 2026). The weapon is named in the boss's tracker slice.
- **Rooms are richer than sprites** and have no colour cap. The drawn rooms build their own ramps and use ordered dithering and row-by-row gradients, the way SNES backgrounds did. Their pictures are in the Rooms asset group.
- **Follow the player's sheet and the six drawn rooms.** A `.sprite` file with no `palette` lines is the older three-colour kind and is not an example to follow.
- It is a visual upgrade only: sizes, hit boxes and movement stay exactly as they are.

## Colours that mean something

- **The player is white with a cyan accent and is never tinted or recoloured**: `player-white`, `player-light`, `player-mid`, `player-shadow`, `player-deep`, `player-joint`, `player-jointdark` for the suit; `player-accentlight`, `player-accent`, `player-accentshade`, `player-accentdim` for the visor and helmet fin. **He has no arm cannon** (owner, 18 Oct 2026): his front arm ends in a hand. What he carries is shown by hardware drawn on him, never by his colour. **He must stay visible in every room**: put him in front of the brightest and busiest part of a room and check.
- **A boss is his two colours.** `boss-<id>-primary` and `boss-<id>-secondary` are his identity; build his 16-bit shades from them. **A boss's sprite is made only when the owner asks for that boss by name**; until then the game draws him as a plain rectangle at his true footprint (the BossFootprints card). Strike Man (Fighting) and Thorn Man (Grass) have been drawn; their sheets are in the Sprites asset group.
- **Every boss has a single eye** (owner, 4 Nov 2026): "all bosses will have a common theme of a single 'eye'. This theme should be interpreted with very wide creativity." Strike Man's and Thorn Man's are the examples the owner liked; Thorn Man's is one glowing slit in his hood.
- **A boss's shots must show against his own room.** Proto Mk0's grey shots vanished into his grey bunker, so his and his turrets' shots are `warning-red` with a one-pixel `outline` rim. Check a new room by putting that boss's own shots across it.
- **Red means warning in Proto Mk0's bunker**; keep `warning-red` for that there.
- Minions: `spiglet-primary` and `spiglet-secondary` walk the ground; `drifter-primary` and `drifter-secondary` float. **Elites swap `outline` for `elite-outline`** and change nothing else (the EliteMinion card). Each boss has his own copy of each minion, its most common colour turned into his primary; Typeless keeps the originals. SPIGLET has a drawn sheet; DRIFTER is still plain shapes.
- Menus and HUD: `ui-text` on `ui-panel`, `ui-pad` or the room. `ui-cyan` fills health pips (`ui-pip-off` when empty) and marks what is running: **a cyan border means a module is running its weapon, a solid cyan bar across its top means the fire button is aimed at it, and white corners mark the selected module**. `ui-gold` means NEW and only new (the halo on a weapon a boss just dropped) and borders the touch pads. `ui-frame`, `ui-module` and `ui-locked` build the weapon wheel; `ui-scrim` veils the game behind it.

## Sizes and draw order

- Drawing boxes: `grid-player` 24, `grid-minion` 16, `grid-boss` 48, `grid-shot` 16, `grid-pickup` 16, `grid-miniboss` 32 (reserved). **The drawing is not the hit box**: the player's hit box is `hitbox-player-w` × `hitbox-player-h` standing and `hitbox-slide-w` × `hitbox-slide-h` sliding, and it stays still while the drawing changes. Never stretch a drawing to fit a box.
- Characters stand with their feet on the floor; bullets are drawn from their middle. The biggest bullet is `shot-max` (8); the rest of its 16-pixel box is for a glow or a trail.
- How the game layers things today, back to front: `depth-background`, `depth-arena`, `depth-world`, `depth-pickups`, `depth-minions`, `depth-bullets`, `depth-boss`, `depth-effects` (a weapon's dust and debris), `depth-heldBack` (the weapon in his FAR hand, drawn behind him a quarter darker by the game, so draw every weapon at full colour), `depth-player`, `depth-held` (the weapon in his NEAR hand). Offensive slot 1 is his right hand, slot 2 his left, and his hands stay his own as he turns (owner, 21 Oct 2026); the HUD and pads sit on their own layer above.
- **Draw order is not a fixed rule** (the owner's call, 17 Oct 2026); it follows ordinary 2D practice. Layer by role, in bands set on purpose. What can hurt the player, and the player himself, should read first — by contrast, outline and placement, not only by being on top; a sparse or see-through foreground piece may pass in front of actors. What an actor holds moves with it (near hand in front of the body, far hand behind). Effects sit by what made them. The HUD never moves with the world.

## The area between rooms

A run alternates between areas (an endless strip of ground, pits, spikes and platforms) and one-screen boss rooms. Everything in an area is still drawn as plain shapes; its drawn look is being picked from variants.

- **The backdrop tells you who is next**: `area-backdrop-<id>` is the coming boss's primary, heavily darkened.
- **A pit is only the gap in the ground**, so the ground does all the work. `area-ground` stands apart from every backdrop by brightness alone (at least 2 : 1), and its lit top edge, `area-cap`, is `ground-cap` (2) tall, at least 4.5 : 1 against every backdrop, and always in the top ten rows of the ground band, which the thumb pads never cover. The white player must read against the ground at 4.5 : 1. `tests/contrast.test.js` checks all three.
- Pits are `pit-width-min` to `pit-width-max` wide. Platforms (`area-platform`) are `platform-thickness` (5) thick, `platform-width-min` to `platform-width-max` wide, and sit `platform-rise-min` to `platform-rise-max` above the floor. Spike beds (`area-spike`) are `spike-height` (7) tall and `spike-width-min` to `spike-width-max` wide.
- **Doors are `door-width` × `door-height` (16 × 28)**, standing on the floor. A boss door that will open is `door-boss` with a pulsing `door-halo` edge; one that will not answer yet is `door-unarmed`, with no halo; the exit door out of a room is `door-exit`, gold, to read as a way out.
- The shape of an area leans toward the coming boss (Gale Man's is airy and broken, Granite Man's solid slabs), always within what a jump can clear.

## Text

- Set every word in `text-1x`: the game's own 5×7 capitals (`--font-pixel`). Use `text-2x` or `text-4x` for bigger text; only whole multiples of 7 pixels stay sharp.
- The font has A–Z, 0–9, space and `. , : ; - + / \ ( ) [ ] ! ? ' " < > = % * # _ | · × → ◀ ▶ ◸ ◹`. Lower case is shown as capitals; anything else, such as `@` or `&`, shows as `?`.
- **Check text and menus by drawing them** at 320 and 480 wide. Working spacing out from the letter size has put things on top of each other three times.
- Names in the game are capitals: BLAZE MAN, SIDE ARM, RE-QUIP.

## Icons

There is no icon set. The movement pads use the font's own arrows (`◀ ▶ ◸ ◹`) and the controls carry small drawn shapes in `ui-icon`. Do not use emoji anywhere.

## Movement and timing

- Everything that moves is a run of finished pictures, each held for a whole number of steps. The player's run is eight pictures over 30 steps; his idle holds a picture for up to 40 steps.
- Screen shake moves the world in whole pixels, never the HUD. A far layer (sky, distant things) moves at 0.3 times the shake.
- Arriving at a boss: the screen fades to black over `warp-out` (three seconds), then the room fades in over `arrival-room`, its furniture over `arrival-furniture`, and the boss beams down over `arrival-beam`.
- Other clocks: `beat` (two seconds), `hold-default` (a sprite frame's hold when its sheet does not say), `invuln` (the flicker after a hit), `slide-tap` (a second jump tap inside it slides instead).

## Who may make what

- **A sprite, a music track or a room is made by Claude only when the owner asks for that one by name.** Each is labelled where it lives and listed in `CLAUDE.md` under AI-made sprites and music.
- Placeholder shapes, terrain, the HUD font and sound effects need no ask.
- **Art is picked from variants** (owner, 5 Nov 2026): "Every type of thing should have a couple questions and/or a few variants to review before getting a label as 'Picked.'" The owner answers and picks in each thing's comment thread on the canvas; only a picked variant is built.
- The music is SNES-era chiptune, to match the art.

## Weapons and handoffs

- **Drawing a weapon**: the Weapons section. Its timing and hit areas live in the drawing itself.
- **Handing work back to Claude Code**: the Handoff section. A handoff goes straight into the game when every check passes.

## Words

The game has its own vocabulary, explained in `design/GLOSSARY.md`: step, beat, layer, slice, room art, pre-drawn, blackout, rim, colour ramp. Use those words; a word the glossary lacks is a gap in the glossary.
