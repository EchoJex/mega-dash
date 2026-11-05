# ReadableShots

A boss's shots must show against his own room; check it by putting his own shots across the room before it is approved.

- Proto Mk0's shots and his turrets' shots were grey and light grey, and vanished into his grey bunker the moment it was drawn. They are now `warning-red` with a one-pixel `outline` rim. His own are a little bigger than the turrets', so the two can still be told apart.
- Red means warning in his bunker, so the shots share the alarm light's colour.
- A bullet drawing fits `grid-shot` (16 × 16); the biggest shot is `shot-max` (8) and the rest of the box is for a glow or a trail.
- Check the white player against the same room in the same way.
