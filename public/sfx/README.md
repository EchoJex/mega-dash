# public/sfx — sampled one-shots

Empty by design. Sound in this game is **synthesised** (`src/systems/sfx.js`), and
that is still the default: an effect is a handful of numbers, costs no asset
bytes, and is tunable the way `FEEL` is.

This directory is the narrow exception. A sprite FRAME may name a sound —
`sfx=step.wav` in its `.sprite` header — and the bytes land here, beside
`public/sprites/` and on the same terms. Keep each one small: a one-shot is a few KB.

Those caps are not arbitrary. The APK is ~3.2MB and the in-app updater
re-downloads all of it on **every build**, so a careless 5MB "effect" would cost
more than the whole game, every time you tap UPDATE.

A one-shot belongs to a frame. Anything longer than two seconds is a track, and
a track belongs to an arena.
