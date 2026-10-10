# Quake Hammer — art brief for Claude Design

The Quake Hammer is built and playable. Everything it shows is a plain placeholder shape
today: a brown handle with a rock-coloured block on the end, and simple circles, triangles
and dots for the dust, spikes and sand. This page is what the real art has to cover. To see
it move, play a dev build with the hammer equipped (dev menu → WEAPONS: ALL, START LV to try
each rung) and use every move.

## What it is, in the owner's words

**King Dedede's hammer.** Tap for a jab — three taps make Dedede's neutral A-A-A from Smash
Ultimate, without the rapid-fire spin in the middle. Hold to charge, modelled on Dedede's
**Jet Hammer**, with the hammer **held overhead the way he holds it for his forward
smash** — that pose IS the tell that a charge is building, so there is no charge bar.
Where Dedede's hammer bursts into flame at full charge, this one puffs **small dust clouds
round the hammer head**, and that has to be obvious at a glance. Let go to swing.

## The look

- SNES-era 16-bit pixel art (`design/DESIGN-BRIEF.md`): up to 15 colours plus see-through,
  shaded in ramps, the shared near-black outline `#0A0A12` round the outside.
- Quake Man's colours: primary `#A76625` (brown), secondary `#EA580C` (orange). A big, heavy,
  rock-headed hammer; the head is wider than the player's body.
- Dust and sand are warm tans. The placeholders use `#E6D6B0`, `#CDB892`, `#D9B56A`,
  `#B8923F` and `#A88445`; the art may choose its own.
- **The player is 24×24, white with a `#3CBCFC` accent, and is never tinted.** The hammer
  is drawn on top of him, so it must never cover his visor for long: losing sight of the
  player is losing the run.
- **His body does not change pose today** — only the hammer moves. If the attacks need his
  body to move too (a wind-up, a follow-through), that is new frames on the player's own
  sheet; say so in the handoff note and they get wired in.

## Timing — every number is in steps, 60 to a second

Each move starts on the step the button was pressed (a jab) or let go (the swing). "Hits"
is the step it connects; "free" is the step the player can act again, which is when the
hammer is put away.

| move | what it looks like | hits | next press accepted | free |
|---|---|---|---|---|
| **jab 1** (tap) | a short, quick forward swing | 10 | steps 13–30 | 33 |
| **jab 2** (tap again) | swung back up | 11 | steps 18–27 | 28 |
| **jab 3** (tap again) | the finisher: over the top and down, launches what it hits | 4 | — | 50 |
| **charge** (hold) | hammer held overhead and kept there for as long as the button is down | — | — | — |
| **swing** (let go) | from overhead down onto the ground in front | 10 (9 at full charge) | — | 60 to 70, longer the fuller the charge |

A chained jab starts on the first "next press accepted" step of the one before it, so the
fastest A-A-A lands on steps 10, 24 and 35. How long a charge takes to fill:

| rung | full charge after |
|---|---|
| Lv1–2 | 120 steps (2 seconds, Jet Hammer's own) |
| Lv3–5 | 90 steps (1.5 seconds) |
| Lv6+ | 45 steps (0.75 seconds) |

For reference, Smash's own animations run longer than "free" — 39, 47 and 62 steps for the
three jabs, 71 to 90 for Jet Hammer — but in this game the hammer is put away at "free".

## What appears, rung by rung

| rung | on screen |
|---|---|
| **Lv1–2** | the hammer only. Full charge shows nothing extra, and the swing makes no dust. |
| **Lv3** | **the full-charge tell**: once full, small dust clouds puff round the hammer head (a burst of 8 the moment it fills, then 2 more every 5 steps) and the hammer trembles. **The dust cloud**: where the swing lands — on an enemy, or on the ground in front — a cloud billows out: **small** under half a charge (radius 10 pixels), **medium** up to full (16), **large** at full (24). It lasts 24, 32 or 40 steps. |
| **Lv6** | nothing new to draw (jabs at full speed, a faster charge). |
| **Lv10** | **the spikes**: a full charge that lands on the GROUND throws 4 long, slender sand spikes diagonally forward from where the hammer hit — about 24°, 38°, 52° and 66° above the floor, 42 to 64 pixels long. They stab out in 5 steps, stand for 30 (half a second), and flicker for the last few. **The sand**: then each spike falls apart into a shower of grains, about one every 3 pixels along it, that drop to the floor and lie there; every grain vanishes at its own random moment between 0.1 and 3 seconds. A standing spike also stops enemy shots, and each stopped shot leaves a tiny puff. |

## What the code tells the art every step

All of the drawing is in two functions in `src/systems/weaponry.js`, and nothing else in the
game draws the hammer: **`drawQuakeHammer`** (the hammer itself) and **`drawQuakeFx`** (dust,
spikes, sand). They only read; replacing them cannot change how the weapon plays.

- **The hammer** — `quakePose` gives which move (`jab1`, `jab2`, `jab3`, `swing` or `charge`),
  how many steps into it (`t`), the step it hits and the step it is put away, and for a
  charge whether it is full and whether this rung shows it. The player's position and
  facing come with it; the hand is 5 pixels in front of his middle, 12 below the top of his
  box. **Pick a picture from the move and the step** and it will line up with the hit.
- **The effects** — three lists the game keeps (`fx.dust`, `fx.spikes`, `fx.sand`). Each dust
  cloud has a position, a size (0, 1, 2 for small, medium, large), its age and its life; a
  small `puff` is the full-charge tell or a stopped shot. Each spike has its foot, its angle,
  its length and its age; each grain its position.

**Everything that moves is drawn ahead of time** (the rooms' rule): paint each frame once
and only pick and place it while playing — a phone cannot afford to repaint pixels during a
fight. Either form goes straight in: drawing code in the style of the rooms' kit
(`src/systems/arena-art/`), replacing those two functions, or a sprite sheet with one clip per
move, which needs a small hook to play it in step with the moves — Claude Code builds that
on handoff.

## Not to change

The timings and sizes above are the game's (they came from the owner and from Smash's frame
data). The art fits them; it does not move them. Hit areas are not the drawing: a hammer
drawn bigger does not reach further.
