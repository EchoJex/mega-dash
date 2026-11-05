# PlayerSprite

The player's 16-bit sheet: twenty-two 24×24 frames in twelve colours, the example every new sprite follows.

- **Six-frame idle** that breathes and blinks, **eight-frame run** on a 30-step stride, **three jump poses** picked by how fast he is rising or falling (the card cycles them), **five-frame slide** lasting 26 steps.
- Each frame is held for a whole number of steps (60 a second). The slide's holds must add up to 26, the length of a slide.
- His colours are `outline`, `player-white`, `player-light`, `player-mid`, `player-shadow`, `player-deep`, `player-joint`, `player-jointdark`, `player-accentlight`, `player-accent`, `player-accentshade`, `player-accentdim`. **He is never tinted or recoloured**; what he carries is drawn on him as hardware.
- His hit box is `hitbox-player-w` × `hitbox-player-h` standing and `hitbox-slide-w` × `hitbox-slide-h` sliding, smaller than the drawing on purpose.
- Source: `design/sprites/player.sprite`; the game loads `public/sprites/player.png` (in the Sprites asset group).
