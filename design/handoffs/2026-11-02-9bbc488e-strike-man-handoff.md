# Design handoff, 2026-11-02: 9bbc488e-strike-man-handoff.zip

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **boss-strike-body**
  - 74 frames redrawn
  - colours: 15 in all (11 added, 3 changed)
  - idle: 8 frames (was 2); lasts 48 steps (was 60)
  - walk: 8 frames (was 4); same length, frames re-timed
  - guard: 8 frames (was 1); lasts 32 steps (was 10)
  - jabReady: 2 frames (was 1); same length, frames re-timed
  - jab: 3 frames (was 2); same length, frames re-timed; its hit area reaches 6 px less far forward, 1 px further back, 1 px higher at the top, 2 px higher at the bottom
  - back: 4 frames (was 2); same length, frames re-timed
  - lean: 3 frames (was 2); same length, frames re-timed
  - lunge: its hit area reaches 8 px further forward, 7 px less far back, 2 px higher at the top, 3 px higher at the bottom
  - recover: 2 frames (was 1); same length, frames re-timed
  - down: 4 frames (was 2); same length, frames re-timed
  - dizzy: 16 frames (was 2); lasts 64 steps (was 40)
  - riseReady: 2 frames (was 1); same length, frames re-timed
  - rise: its hit area reaches 1 px further forward, 4 px less far back, 9 px higher at the top, 18 px higher at the bottom
  - blast: 4 frames (was 2); same length, frames re-timed; its spawn point moved 9, -3 px
  - spinReady: 2 frames (was 1); same length, frames re-timed
  - spin: its hit area reaches 12 px further forward, 12 px further back, 24 px lower at the top, 6 px higher at the bottom

## The design's own note

> # Strike Man (Fighting boss) — body sheet handoff from Claude Design
> 
> ## What the owner approved, and when
> 
> The owner approved this art in Claude Design on **2 November 2026, about 1:49 pm Pacific**:
> "DizzyHard needs the little yellow birdies orbiting around his head. then everything looks great."
> The birdies were added exactly as asked, with no other change, before this bundle was made.
> 
> The owner's calls along the way (2 November 2026), in their words where it matters:
> 
> - His legs became **treads**: "make his legs tracked, like attached" (a tank-tread base, from a reference picture).
> - The style is variant **#34 "Mk1 Rust Bucket"**, "but with the rounded gloves from #30, no blinking, and the large eye from #25".
> - **"you have free reign over hitboxes as everything in Claude Code is placeholder suggestions. Ensure any desired frame data and hitbox data are explicitly stated in the Claude Code handoff."** Every number is below.
> - The bag hit no longer knocks him flat. For the stagger, **keep him upright**: "he falls limp away from the direction the sandbag came from. first stage of stagger is leaned back ~45deg with EYE flickering randomly off and on with yellow stars above, and second stage of stagger has the same leaning, but now brief smoke comes out at random places and sparks come out of the EYE area".
> - Which stage a bag gives: "if the initial sandbag induced stagger fully resolves and 30 seconds elapses before the 2nd sandbag hits then it induces a stage 1 stagger. If a subsequent sandbag hits before the stage 1 stagger+30s resolves, then it induces a stage 2 stagger."
> - Stage 2 also gets **little yellow birdies orbiting his head** (the approval message above).
> 
> ## What is in this bundle
> 
> | file | what it is | how it goes in |
> |---|---|---|
> | `boss-strike-body.sprite` | the whole sheet: all 16 clips the game plays, 74 frames | `npm run design:import` takes it as it is |
> | `dizzyHard-frames.txt` | 16 frames for **stage 2 of the stagger**, a clip the game does not play yet | by hand, after the code change in *Changes for the code*, step 1 |
> | `HANDOFF.md` | this note | kept in `design/handoffs/` by the import |
> 
> The import refuses a sheet with a clip the code does not play, so stage 2 travels as a plain text file.
> Its frames use the sheet's palette keys and were checked: with `dizzyHard: 'loop'` added to the
> contract, the sheet with these frames appended passes `checkFrameData`.
> 
> ## What he looks like
> 
> A rusty robot boxer on a tank-tread base. A gunmetal barrel body with two bands of worn orange paint and rust spots,
> a round head with a painted cap and **one large red eye** (never blinks), jointed gunmetal arms with worn-orange forearms
> and shoulder pads, **round red boxing gloves with white cuffs**, and an exhaust pipe on his back that puffs smoke. His upper body turns
> and tips on a turret ring above the treads. Outline round the silhouette only; dithered shading.
> 
> - **Sheet:** 96×64, unchanged. **Pivot:** 48, 60 (the floor under his middle), unchanged. Drawn facing right.
> - **Collision box:** keep **38 wide × 44 tall**, centred on the pivot and standing on it, unchanged. The tread base
>   is 42 wide, so a shot that just grazes a tread end visibly misses, as the game's rule wants.
> - **Colours (15, the limit):** `0` #0A0A12 outline · `1` #2C2C3A tread rubber, deep metal · `2` #625654 gunmetal ·
>   `3` #7C2D12 his secondary brown, used as rust and paint shadow · `4` #A8542E worn orange paint ·
>   `5` #EA6A34 his primary orange, on paint highlights and rivets · `6` #6E7890 steel wheels · `7` #C81E1E glove red ·
>   `8` #9A9AAC smoke, steel light · `9` #D8DCE8 glove cuff · `a` #FFD23A yellow: stars, birdies, sparks, heat ·
>   `b` #FF9A3A hot orange: glove heat, jets, beaks · `c` #FF3A2A eye red · `d` #FFFFF0 white-hot · `e` #FFD0C8 glove shine.
>   His identity colours #EA6A34 and #7C2D12 are both in it; the paint is a worn version of his orange.
> - **Stars and birdies are drawn in the art now** (stars in `dizzy`, birdies in `dizzyHard`), so they follow his head as he leans.
> 
> ## Every clip, frame by frame (this is what the game will play)
> 
> Steps are 1/60 of a second. **Bold** is the frame a move connects on (its first step). Hit areas and the spawn point
> are in the sheet's own pixels, drawn facing right; the game mirrors them about the pivot.
> 
> | clip | kind | frames (steps each) | lasts | hit lands on step | hit area x, y, w×h (sheet pixels) | spawn |
> |---|---|---|---|---|---|---|
> | idle | loop | 6 · 6 · 6 · 6 · 6 · 6 · 6 · 6 | 48 | — | — | — |
> | walk | loop | 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 | 32 | — | — | — |
> | guard | loop | 4 · 4 · 4 · 4 · 4 · 4 · 4 · 4 | 32 | — | — | — |
> | jabReady | once | 6 · 6 | 12 | — | — | — |
> | jab | hit | **4** · 3 · 3 | 10 | 0 | 66, 35, 17×11 | — |
> | back | once | 4 · 3 · 4 · 3 | 14 | — | — | — |
> | lean | once | 10 · 10 · 10 | 30 | — | — | — |
> | lunge | travel | **4** · 4 | 8 | 0 | 74, 34, 13×11 | — |
> | recover | once | 8 · 10 | 18 | — | — | — |
> | down | once | 4 · 4 · 4 · 38 | 50 | — | — | — |
> | dizzy | loop | 4 × 16 frames | 64 | — | — | — |
> | riseReady | once | 8 · 12 | 20 | — | — | — |
> | rise | travel | **6** · 6 | 12 | 0 | 40, 1, 21×41 | — |
> | blast | once | 7 · 7 · 6 · 8 | 28 | — | — | 81, 33 (step 20) |
> | spinReady | once | 10 · 12 | 22 | — | — | — |
> | spin | travel | **5** · 5 · 5 · 5 | 20 | 0 | 14, 40, 68×14 | — |
> | dizzyHard | loop (**new**) | 4 × 16 frames | 64 | — | — | — |
> 
> The same areas measured from the pivot (what `src/data/frame-data.json` will hold), as x, y, width × height:
> jab 18, −25, 17×11 · lunge 26, −26, 13×11 · rise −8, −59, 21×41 · spin −34, −20, 68×14 · blast spawn 33, −27.
> 
> ## What changed in timing and hit areas, and why
> 
> **Timing: every move lasts exactly as long as before, and every hit lands on the same step** (step 0 for the jab,
> lunge, uppercut and spin; the blast's shot on step 20). Only how many pictures a move has changed, for smoother motion.
> The loops (`idle`, `walk`, `guard`, `dizzy`) changed length, which changes nothing in the fight: their length
> only sets how fast the picture cycles.
> 
> | clip | in the game now | now | why |
> |---|---|---|---|
> | idle | 30 · 30 | 8 frames × 6 | engine rumble and exhaust puffs |
> | walk | 8 · 8 · 8 · 8 | 8 frames × 4 | treads roll, top and bottom runs moving opposite ways |
> | guard | 10 (one frame) | 8 frames × 4 | he drives with his guard up, treads rolling |
> | jabReady | 12 | 6 · 6 | glove drawn back, a lid drops over his eye |
> | jab | 4 · 6 | **4** · 3 · 3 | an extra in-between on the way back |
> | back | 7 · 7 | 4 · 3 · 4 · 3 | treads in reverse, his top tips forward, dust thrown up in front |
> | lean | 15 · 15 | 10 · 10 · 10 | rears up on the treads, glove cocked far behind, revving; the glove glints on the last frame |
> | recover | 18 | 8 · 10 | skids, then the glove comes home |
> | down | 10 · 40 | 4 · 4 · 4 · 38 | jolted (eye flashes white), tips back, ends in the limp 45° lean |
> | dizzy | 20 · 20 | 16 frames × 4 | stage 1: limp lean, eye flickering on and off at random, yellow stars orbiting |
> | riseReady | 20 | 8 · 12 | sinks into his turret, glove dropped low, revving |
> | blast | 20 · 8 | 7 · 7 · 6 · 8 | the glove heats red, orange, gold, white-hot, then the throw |
> | spinReady | 22 | 10 · 12 | winds his turret round, arms out |
> | spin | 5 · 5 · 5 · 5 | 5 · 5 · 5 · 5 (redrawn) | a spinning lariat on treads, jets underneath |
> 
> **Hit areas** are the drawn glove plus one pixel (the owner gave free rein over hit areas, 2 Nov 2026):
> 
> | move | in the game now | now | why |
> |---|---|---|---|
> | jab | 67, 36, 22×12 | 66, 35, 17×11 | fits the glove; still starts inside his front (x 67) and reaches 16 px past it, at the player's head height |
> | lunge | 67, 36, 12×12 | 74, 34, 13×11 | the fist is drawn further out at full stretch; still reaches a player standing against him |
> | rise | 36, 10, 24×50 | 40, 1, 21×41 | the glove and arm going up, from the glove's top down to his waist; covers the space above his head |
> | spin | 26, 16, 44×44 | 14, 40, 68×14 | a lariat now, not a kick: the band both gloves sweep through, at the player's head height |
> | blast spawn | 72, 36 | 81, 33 | the front of the white-hot glove |
> 
> About the spin: the game already lifts him 6 px for the whole spin, so the art draws jets under his treads. With that
> lift, the lariat's hit area ends 12 px above the floor, so a sliding player (11 tall) passes under the gloves.
> **His 38×44 body box still reaches 6 px above the floor, though**, so a slide still hurts by touching him.
> 
> The pivot did not move, and the collision box stays 38×44.
> 
> ## Changes for the code (requests: the import cannot make these)
> 
> 1. **Add the stage-2 clip.** In `src/data/weapon-art.js`, add `dizzyHard: 'loop'` to Strike Man's body clips. Then append
>    every frame block in `dizzyHard-frames.txt` from this bundle, unchanged, to the end of
>    `design/sprites/boss-strike-body.sprite`, and run `npm run sprites:build`.
> 2. **Choose the stagger stage on each bag hit (owner, 2 Nov 2026).** Remember the step his last stagger ended
>    (when `dizzy` or `dizzyHard` finishes). When a bag hits him:
>    - if he is staggered right now, or **fewer than 1800 steps (30 seconds)** have passed since his last stagger ended → **stage 2**:
>      `down`, then `dizzyHard` for **420 steps** (today's birdies time);
>    - otherwise, including the first bag of the fight → **stage 1**: `down`, then `dizzy` for **300 steps** (today's stars time).
> 
>    This replaces "first bag stars, every later bag birdies". **Check one point with the owner:** they described
>    "stage 1 stagger + 30 s"; this note reads a bag landing during or within 30 s after a *stage 2* as stage 2 again.
> 3. **Lean away from the bag.** The art leans him back. When the bag hits, turn him to face the side the bag came from
>    (the side of his centre the bag is on; face the player if it lands dead centre), and hold that facing through
>    `down` and the daze, so he always falls away from the bag.
> 4. **Stop drawing the game's own stars and birdies over Strike Man.** His art carries them now (stars in `dizzy`,
>    birdies in `dizzyHard`) and they follow his head as he leans. Keep `b.daze` if anything else reads it.
> 5. **Update the test that expects `['stars', 'birds']`** in `tests/fights.test.js` to the new rule: two bags more than
>    30 s apart give stage 1 twice; a second bag within 30 s gives stage 2.
> 6. **Update the brief's rules and words.** In `tools/art/strike.mjs` `constraints()`: "`down` ends lying on the mat" becomes
>    "`down` ends in the limp 45° lean, treads planted"; the stars and birdies are drawn in the art; the spinning kick is
>    a spinning lariat whose band covers at least the width of his body. In `design/weapon-art/strike.md`, update
>    *The look* and the move table to the tracked robot. Leave the owner's quoted words as they are. Then `npm run art:brief`.
> 7. **Optional, the owner's call: slide under the spin.** If a slide should get under the spinning lariat, lift him
>    **12 px** during the spin instead of 6 (`b.y = groundY - 12`). The jets in the art still fit. Without it, the spin
>    plays as today.
> 8. **The record.** Add Strike Man's row to *AI-made sprites and music* in `CLAUDE.md` (asked for 31 Oct 2026,
>    restyled on treads 2 Nov 2026, `design/sprites/boss-strike-body.sprite`), and tick his `boss art` boxes as the
>    weapon-art skill says.
> 
> ## For the owner
> 
> Your tracker still says the first bag "knocks him down". That line is yours, so Claude Code will not reword it.
> Change it if you want it to match the new upright stagger.

## Also in the bundle, not used

- `strike-man-handoff/dizzyHard-frames.txt`
