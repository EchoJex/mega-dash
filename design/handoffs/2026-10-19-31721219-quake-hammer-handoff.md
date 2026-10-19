# Design handoff, 2026-10-19: 31721219-quake-hammer-handoff.zip

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **weapon-quake_hammer-dust**
  - 12 frames redrawn
  - colours: 7 in all (5 added, 1 removed, 2 changed)
- **weapon-quake_hammer-puff**
  - 6 frames redrawn
  - colours: 5 in all (3 added, 1 removed, 2 changed)
- **weapon-quake_hammer-spike**
  - 28 frames redrawn
  - colours: 7 in all (2 added, 4 changed)
- **weapon-quake_hammer-sand**
  - 2 frames redrawn
  - colours: 4 in all (2 added, 1 removed, 2 changed)

## The design's own note

> # Quake Hammer — handoff from Claude Design, 18 Oct 2026
> 
> ## What is in this bundle
> 
> Four of the Quake Hammer's five sheets, redrawn:
> 
> - `sprites/weapon-quake_hammer-dust.sprite` — the dust cloud the swing throws up (small, medium, large)
> - `sprites/weapon-quake_hammer-puff.sprite` — the full-charge tell and the puff a spike leaves when it stops a shot
> - `sprites/weapon-quake_hammer-spike.sprite` — the four Lv10 sand spikes
> - `sprites/weapon-quake_hammer-sand.sprite` — the two sand grains
> 
> **The hammer in his hand (`weapon-quake_hammer-held.sprite`) is deliberately NOT in this bundle.** The game keeps its placeholder hammer for now. The owner liked the new hammer but not how he holds it, and chose to give held weapons proper body poses first (request 2 below). The hammer comes back to Claude Design once the game can show those poses.
> 
> ## What the owner approved, and when
> 
> On 18 Oct 2026, evening (Los Angeles time), after watching every clip at game speed, facing both ways, beside the player, with the hit areas drawn on:
> 
> > "i love them all, but i dont like how holding the handle looks. it looks, cheap."
> 
> Asked what to hand off, the owner chose: **the effects now, the hammer later.**
> 
> Settled earlier the same day, for when the hammer comes back:
> 
> - **The hammer's look:** No. 6 of twelve concept mallets ("rope bound"). It is a round wooden barrel head, shaded as a solid cylinder, with plank seams. Two bands of **dark grey** rope go round it (the owner's words: "I like number 6 but make the rope binding dark grey"), and the grip is wrapped in **sand**. It is the size the placeholder set: the head's middle sits 15.5 px from his hand, and its far edge about 21 px out.
> - **Quake Man's second colour becomes sand** (request 1).
> 
> ## Changes to timing, hit areas, spawn points and the pivot
> 
> **None in these four sheets.** Every frame's hold, every hit frame, every hit area and every pivot is exactly as it was. Only the pictures and the colours changed:
> 
> - **dust**: 7 colours, a sand ramp from near-white to deep brown, plus two for flying pebbles. The first frame of each cloud (the one that hurts) is drawn to fill its hit area, so the area reaches no more than one pixel past the drawing. Later frames billow past it and thin out, as the placeholder's did.
> - **puff**: 5 colours, the same sand ramp. The tell is a small cloud that swells and breaks up. The block is a bright flash, then a ring of sand bits, then a few grains.
> - **spike**: 7 colours. Each spike is compacted sand, lit from the upper left, with packed layers across it. It pushes out of the floor tip-first, throwing up sand while it grows. The tip glints on its last hurting frame. It stands, then cracks and turns pale on its last three frames, before the game turns it into sand. Every spike is drawn along the ladder's own angle and length (24° 58 px, 38° 64 px, 52° 54 px, 66° 42 px) from its foot.
> - **sand**: 4 colours, a 2×2 grain in two shades.
> 
> These went through `npm run design:import` on a copy of the repository before the handoff: every check passed, including `npm test`.
> 
> ## Requests for the code (the import cannot make these)
> 
> ### 1. Quake Man's second colour: orange → sand
> 
> The owner's words, 18 Oct 2026: "Instead of orange for the boss let's make it sand colored", and "Ensure when we handoff quake hammer back to Claude code that it has the more about changing quake man's palette".
> 
> - **Proposed sand: `#D9B56A`.** It is the sand the hammer's spikes and grip already use, so the boss and his weapon match. The owner may want to tune it.
> - **Where it lives:** `src/data/bosses.js`, his tracker palette field (and `design/boss-data.json` through `npm run sync`), the table in `design/DESIGN-BRIEF.md`, the `boss-quake-secondary` token in the MEGA DASH design system, and "The look" in `design/weapon-art/quake_hammer.md` (which still says orange).
> - The primaries' spacing optimisation is paused by the owner's call, so a colour may change on its own.
> 
> ### 2. Held weapons get body poses
> 
> The owner's words, 18 Oct 2026: "many of the offensive weapons will be held, hammer, whip, boxing gloves etc, so i need to get the look of holding something right". Asked how, the owner chose **body holding poses**: the player's body takes the pose of each move, instead of only the weapon moving while his body stands still. And: "note that each weapon will have significantly different poses e.g. whip will be strongly modeled after super castlevania Simons whip animation; hammer is as we discussed".
> 
> So each held weapon needs its own body sheet. Today `design/weapon-art/README.md` (section 5) says "His body does not change pose — only the weapon moves"; that rule has to change for these weapons. A suggested shape, for Claude Code to settle:
> 
> - **A body sheet per held weapon,** `weapon-<weapon>-body.sprite`. It has the same paper and the same pivot as the weapon's held sheet (for the hammer, 56×56 held at 28,28: the point his hand is at today). It has the same clips, with the same number of frames and the same holds. While a move plays, the game draws the body sheet's frame **in place of his normal sprite**, on the same step as the weapon, mirrored about the same pivot. Because the two sheets share one anchor and one clock, Design can draw his hands and the handle to line up exactly. Hit areas stay measured from the same point, so the rule that every blow reaches a minion standing against him still applies unchanged.
> - **His colours never change.** A body sheet uses `player.sprite`'s twelve colours exactly.
> - **Walking while jabbing.** From Lv3 he can walk while jabbing or charging. The owner chose **walking legs** over gliding with planted feet or stopping him. Suggested: a body frame can say it draws only his upper body. The game then draws his own legs from whatever he is doing (standing, running, jumping), taken from his normal sheet below the waist. Rooted moves (the swing) and the dive draw the whole body. Please say in the README how a frame asks for this, so Design can draw to it.
> - **Which is in front.** For a proper grip his fingers have to be in front of the handle, and an overhead hammer head belongs behind his head. Suggested: while a weapon has a body sheet, its held sheet is drawn just behind the body. A held frame can ask to be drawn in front when a move needs it (a swing passing across his front).
> - **Placeholders.** `npm run art:placeholders` paints a placeholder body sheet (his standing frame in every cell), so the loop works before the art exists.
> - **Asking for the art.** The owner asked for these poses for the Quake Hammer in the conversation on 18 Oct 2026. The whip, the gloves and the rest each need their own ask, under the AI-made sprites rule.
> 
> ### 3. The player has no arm cannon
> 
> The owner's words, 18 Oct 2026: "player character does not have an arm cannon any more. it was never drawn in anyways". `CLAUDE.md`, `design/DESIGN-BRIEF.md` (section 3) and the MEGA DASH design system all describe his accent as being on "the visor, the arm-cannon muzzle and the helmet fin". Please correct that wording. His front arm ends in a hand, and the body poses will show it gripping.
> 
> ## What comes next
> 
> When requests 2 and 3 are built, send the Quake Hammer back to Claude Design to draw its body sheet and redraw its held sheet together. The hammer's look and its timing are settled. Only how he holds it changes.
> 
> ## Not to be built from
> 
> - `Main.dc.html` is the design's preview page. It also plays a held-sheet version of the hammer drawn without body poses. That version is **not** in this bundle and is not approved.
> - `Holding.dc.html` is a mockup made to help the owner decide request 2.
