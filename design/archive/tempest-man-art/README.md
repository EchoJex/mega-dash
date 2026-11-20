# Tempest Man Art

The Water boss's design canvas: his look, every move, his water and the tsunami in his room. It
lived in Claude from 12 to 20 Nov 2026 at https://claude.ai/artifact/JrHVtvusgpgB3ki5WSruCv
(slug `908cf825-9e4b-4e9e-8abc-1dcbd940bfdb`), and was archived on 20 Nov 2026, when the last of its
art, the tsunami, was in the game. AI-made: drawn by Claude at the owner's request, except where a
picture below says otherwise.

## What was picked

| what | the pick | picked |
|---|---|---|
| his look | 16 BALL JOINTS, with a rust-red inert deep-sea mine for an off hand; one eye behind glass, the black dot its pupil and the teal its sclera, a trim on the glass but no lid | 13 Nov 2026 |
| the water jets | jet G | 14 Nov 2026 |
| the tank bar | the bar recessed into the tank, the tank drawn behind him | 14 Nov 2026 |
| the short hop | 6 SLOW HEAVE | 14 Nov 2026 |
| the divebomb | 01 MINE FIRST with thrusters A | 15 Nov 2026 |
| the layer-2 charge | charge 2 with rear bells B, its bow wave redrawn | 15 Nov 2026 |
| the tsunami | started from scratch on 19 Nov 2026 as SpriteCook sheet B1 with a thicker back and shorter tail (the `Tsunami` board); it breaks at the spike wall, and the wall spikes stop one ball below its top (20 Nov 2026) | 19 Nov 2026 |

All of it is in the game: the body and water from 16 Nov 2026 (commit `8858b74`), the tsunami from
19 and 20 Nov 2026 (`b787045`, `d652af8`). The tsunami's source pictures and frame builder are in
`design/weapon-art/tsunami/`, not here.

## The pages

Page "Tempest Man" (`main`): `Main` (01 diver and 16), `Jets`, `Hops`, `Thrusters`, `Dashes2`,
`Tsunami`, `WavesRough`. Page "Archive": every round not picked — `Round1` to `Round3` (looks),
`JetsRound1`, `HopsRound1`, `Slams`, `ThrustersRound1`, `Dashes`, `Dashes2Round1`, `WavesRound1`,
`WavesRound2`, `Wave7Round1`, `Wave7Round2`, `Wave7VariantsRound1`, and the last wave 07 boards before
the restart (`Waves`, `Wave7`, `Wave7Variants`, `Wave7VariantsB`). `canvas.json` is the layout.

Two notes on the copies:
- `WavesRough` (six rough-water foams for wave 6, none picked) was made by another Claude session on
  16 Nov 2026; it is copied here exactly as it was served.
- `Thrusters` is the copy Claude last published (15 Nov 2026). The served one had the same size but a
  different fingerprint at archive time, the change inside its one long line of picture data, which
  the tools here could not fetch as a file.

## The pictures (`assets/`)

- `owner-paint-over-wave07-2026-11-16.png` — **the owner's own paint-over** of wave 07 (16 Nov 2026),
  marking the apex, thin water, shadow, deep water and "foam only starts after the apex, becoming
  wider and thinner". Not AI-made.
- `spritecook-sheet-A-*.png`, `spritecook-sheet-B-*.png`, `spritecook-sheet-B2-*.png` — the SpriteCook
  sheets not picked (19 Nov 2026), named by their SpriteCook asset id. AI-made (SpriteCook) at the
  owner's request. B1, the pick, is `design/weapon-art/tsunami/b1-spritecook.png`.

**Credit:** the round 2 waves on `WavesRound2` were drawn after a Japanese-style wave picture
"designed by macrovector - Magnific.com", which its licence allows with that credit
(`assets/macrovector-japanese-waves-license.pdf`). None of it is in the game.

Left out on purpose: the wave reference pictures the owner shared (two "anatomy of a wave"
infographics and a Japanese-style wave picture licensed from Magnific/macrovector), which are other
people's work. The Japanese-style picture's licence does not allow passing on its files.
