# PixelFont

The game's one font: hand-drawn 5×7 capitals, `--font-pixel`, set in `text-1x`, `text-2x` or `text-4x`.

- **Use it for every word** in a mockup or a room: HUD, menus, cards, labels. There is no second font.
- A letter is 7 pixels tall and takes 6 pixels across, its gap included. Only whole multiples of 7 pixels stay sharp.
- It has A–Z, 0–9, space and `. , : ; - + / \ ( ) [ ] ! ? ' " < > = % * # _ | · × → ◀ ▶ ◸ ◹`. Lower case is shown as capitals; any other character shows as `?` in the game. A browser or design tool fills a missing character from another font instead, so check the list before writing punctuation into a design.
- **Check text by drawing it** at 320 and 480 wide; working spacing out from the letter size has put things on top of each other before.
- `ui-text` on `ui-panel`, `ui-pad` or the room; `ui-cyan` for what is live or aimed; `ui-gold` for something new.
- The font file is made from the letters in `src/systems/font.js`. If a letter changes there, the file needs making again.
