# Design handoff, 2026-10-24: Quake Hammer, the hammer in his hand

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **weapon-quake_hammer-held**
  - 27 frames redrawn
  - colours: 15 in all (10 added, 4 changed)
  - jabTwo: its hit area reaches 1 px less far forward, 3 px higher at the top, 3 px lower at the bottom
  - jabThree: its hit area reaches 1 px less far forward, 3 px less far back, 3 px lower at the top
  - chargeFull: its spawn point moved -1, 0 px
  - swing: its hit area reaches 1 px less far forward, 2 px higher at the top; its spawn point moved -1, 0 px

## The design's own note

> # Quake Hammer, the hammer in his hand — handoff from Claude Design
> 
> **Approved by the owner on 23 Oct 2026, 11:06 pm Los Angeles time,** after watching every clip and the whole combo at game speed, facing both ways, beside the player, with the hit areas drawn on. The owner's words: "love it approve hammer".
> 
> ## What is in this bundle
> 
> - `sprites/weapon-quake_hammer-held.sprite` — the hammer in his hand, every clip the game plays today: jabTwo, jabThree, charge, chargeFull, swing, dive and rest.
> 
> The dust, puff, spike and sand sheets went in on 19 Oct 2026 and are not changed here.
> 
> ## What the owner chose for it
> 
> - **The look (18 Oct 2026):** No. 6 of twelve concept mallets, "rope bound". It is a round wooden barrel head with plank seams and two bands of dark grey rope ("make the rope binding dark grey"), on a wooden handle with a sand-wrapped grip. It is the size the placeholder set: the head's middle sits 15.5 px from his hand, and its far edge about 21 px out.
> - **How he holds it (23 Oct 2026):** "so far i dont picture the hammer needing more than the fist, so this weapon will handle body positioning the easy way as just a drawn fist, and whip will have developed body sprite art just for that weapon". Every frame draws his gripping fist over the handle: a white glove with a cyan cuff, in `player.sprite`'s own colours, covering the front of his arm. **The hammer has no body sheet.**
> - **Jab two's streaks (23 Oct 2026):** "when swinging upward shall have the same swing streaks as jab1". Jab two's rising frames carry long, bright streaks.
> - **Colours:** 15, the most a sheet may have. Brown wood (Quake Man's primary in the middle of its ramp), dark grey rope, sand grip (the proposed new secondary, `#D9B56A`), white and pale streaks, and his glove's white, grey and cyan.
> 
> ## Changes to timing, hit areas, spawn points and the pivot
> 
> **Timing: none.** Every hold and every step a move hits on is the placeholder's.
> 
> **Hit areas,** measured from the drawing: the head on the hit frame and on the frame before, back to his hand, plus a pixel. These are as the import lists them:
> 
> - jab two: reaches 1 px less far forward, 3 px higher at the top, 3 px lower at the bottom
> - jab three: 1 px less far forward, 3 px less far back, 3 px lower at the top
> - swing: 1 px less far forward, 2 px higher at the top
> 
> Every blow still reaches a minion standing against him: `npm test` passes on a copy of the repository.
> 
> **Spawn points:**
> 
> - **swing:** moved 1 px back, to where the drawn head meets the floor (43, 40).
> - **chargeFull:** moved 1 px, to the middle of the drawn head (23, 13).
> - **jabThree: new**, on its hit frame, where the head meets the floor (43, 40). This is for request 3 below. Nothing reads it until that is built.
> 
> **Pivot:** unchanged (28, 28).
> 
> ## Requests for the code (the import cannot make these)
> 
> ### 1. The hammer stays in his hand through each combo window
> 
> The owner's words, 23 Oct 2026: "hammer shall stay visible until the jab2 window has elapsed".
> 
> Today the game switches to the `rest` pose on the step a swing lets go. Instead:
> 
> - After a swing charged less than half, keep showing the swing clip, holding its last frame, until the jab 2 window closes (`afterSwing.grace`, 10 steps after it lets go). Only then show `rest`.
> - After jab two, do the same until the finisher's window closes (request 2).
> 
> ### 2. The finisher's window works like jab two's
> 
> The owner's words, 23 Oct 2026: "this needs to have the same combo detect window as jab2 to detect if it is a new tap or a continuation of the combo as the jab3/finisher".
> 
> Today the finisher needs a press during jab two's steps 18–27. Requested: **a press during jab two, or up to 10 steps after jab two ends, is the finisher**, the same as jab two's own rule after a weak swing. Any other press is a new tap, which means a charge.
> 
> Design's reading, for Claude Code to confirm with the owner: a press during jab two still starts the finisher no earlier than jab two's step 18, as now; a press in the 10 steps after it ends starts it at once.
> 
> ### 3. The finisher always makes the medium dust cloud
> 
> The owner's words, 23 Oct 2026: "improve jab3 so that it always gets the medium dust cloud".
> 
> When the finisher lands, it throws up the `medium` cloud from its new spawn point, the same way the swing throws its cloud up from its own.
> 
> **From Lv3, like the swing.** Dust stays a Lv3 feature, as the owner confirmed on 23 Oct 2026 when asked whether "always" included Lv1–2. From Lv3 on, the finisher always makes the medium cloud.
> 
> ### 4. Cooldowns: 90 steps after the big blows, 30 after the rest
> 
> The owner's words, 23 Oct 2026: "both finisher and full charge create 90 steps of cooldown vs 30steps for any other swing of the hammer".
> 
> - After the finisher, or a swing from a full charge: **90 steps** before the hammer can start a new move.
> - After any other swing (a swing from a partial charge, or jab two): **30 steps**.
> 
> **The combo skips the cooldown,** as the owner confirmed on 23 Oct 2026. The cooldown counts from the moment the move lets go, and it stops only a **new tap**. Jab two after a weak swing, and the finisher after jab two, still follow inside their windows. Without that, a 30-step cooldown would close the 10-step jab 2 window after every weak swing.
> 
> ## How it was shown to the owner
> 
> The canvas's preview plays every clip at game speed, facing both ways, beside the player, with the hit areas drawn on. It also plays "THE WHOLE COMBO, AT THE EDGES · LV3", as the owner asked:
> 
> 1. A charge just under half (44 of 90 steps), let go into a swing that throws up the small cloud.
> 2. Jab two, pressed on the last step of its window.
> 3. The finisher, pressed on the last step of the requested window, landing the requested medium cloud.
> 4. The requested 90-step cooldown, resting.
> 
> Requests 1–4 are shown as the owner asked for them, not as the game behaves today.

## Also in the bundle, not used

- `Holding.dc.html`
- `Main.dc.html`
- `canvas.json`
