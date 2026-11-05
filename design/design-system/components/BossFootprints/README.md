# BossFootprints

The seventeen bosses as the game draws them until their sprites exist: a rectangle at the exact size of his hit box, beside the 24-pixel player.

- The body is `boss-<id>-primary`, a band of `boss-<id>-secondary` covers the top 28%, and `outline` is the outermost pixel.
- The size comes from his `scale`: height = round(24 × scale), width = round(height × 0.75), or × his own `wide` (Strike Man's is 0.86: a boxer, not a sumo). Proto Mk0 is the only boss smaller than the player.
- **A boss's sprite is made only when the owner asks for that boss by name.** Until then the game draws him like this.
- When his sprite is drawn, build its 16-bit shades from his primary and secondary and fit it inside `grid-boss` (48 × 48) with his feet on the floor.
- The sizes are written into this card from the game's code by `npm run design:system`, so they cannot drift.
- Strike Man (Fighting) and Thorn Man (Grass) are drawn now (the Sprites asset group). The card still shows every boss at his footprint, because that is his hit box whatever his drawing looks like.
