# Screen

The game's screen: `screen-height` (224) tall, `screen-width-min` (320) to `screen-width-max` (480) wide, scaled up by a whole number on the real phone.

- **Use it for** every layout: a room, a menu, a mockup. Draw and check at both 320 and 480.
- Characters stand on `floor-y` (184). The thumb pads cover `pads-top` (199) to the bottom: 25 pixels, see-through, each with a thin `ui-gold` border. The HUD may use the top `hud-band` (33).
- **Keep anything the player must see happen between the HUD band and the floor.**
- A boss room is exactly one screen; the camera never moves in it.
- Place everything on whole pixels. Never smooth-scale, rotate or blur.

The 480-wide picture is Proto Mk0's bunker from the game itself, taken on 6 Oct 2026 before the pads became see-through.
