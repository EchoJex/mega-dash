# Design handoff, 2026-10-26: d5dd792f-granite-form-handoff.zip

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **weapon-granite_form-boulder**
  - 12 frames redrawn
  - colours: 15 in all (12 added)
  - roll: 12 frames (was 4); lasts 36 steps (was 16)
- **weapon-granite_form-rocky**
  - 7 frames redrawn
  - colours: 15 in all (12 added)
  - walk: 6 frames (was 2); same length, frames re-timed
- **weapon-granite_form-statue**
  - 2 frames redrawn
  - colours: 10 in all (7 added)
- **weapon-granite_form-stone**
  - 1 frame redrawn
  - colours: 10 in all (7 added)

## The design's own note

> # Granite Form: art handoff from Claude Design
> 
> ## What the owner approved, and when
> 
> The owner approved all four Granite Form sheets on **26 Oct 2026 at 11:58 Pacific (18:58 UTC)**, in Claude Design.
> Before approving he watched every clip on the canvas at game speed (60 steps a second, each frame for its
> hold), facing both ways, beside the player at true scale, with the pivot and the game's body boxes drawn on.
> He also watched a demo of the boulder ending its roll, waking up as the walker, walking forward and walking
> back.
> 
> | sheet | what is drawn |
> |---|---|
> | `weapon-granite_form-statue` | `chest`: a treasure chest carved from grey granite, with brown stone straps, a stone lock and a crack. It was narrowed to 22 px wide, at the owner's request, to sit closer to his 12 × 22 body box. `monolith`: a plain upright slab of dark polished brown granite with a diagonal shine. **`megaman`: NOT drawn**. It is the placeholder exactly as it was, character for character, left for the owner to draw himself. |
> | `weapon-granite_form-boulder` | `roll`: the owner's pick from six options (option 3). A chunky cut rock with flat faces, each face a grey, taupe or brown tone of Granite Man's stone, with warm and dark flecks. It is about 29 px across and turns one full turn per loop. |
> | `weapon-granite_form-rocky` | The Lv10 walker, the owner's pick from 24 + 12 options ("stubby 7"). The same cut-stone boulder on three stubby, kneeless stone legs, in a wide stance, with no eyes. `stand` is one picture. `walk` is the three legs stepping in turn. |
> | `weapon-granite_form-stone` | `loose`: a small shaded pebble, 8 × 7, sitting on the floor. |
> 
> ## Changes to timing, hit areas, spawn points and pivots, and why
> 
> - **`roll`: 4 frames × 4 steps → 12 frames × 3 steps.** One turn now takes 36 steps instead of 16. At the
>   boulder's full speed (2.4 px a step, where `spinT` goes up one a step), 36 steps covers about 86 px. That is
>   close to the boulder's own distance around (about 91 px), so it looks like it is rolling rather than spinning
>   on the spot. Twelve frames also make the turn smoother. The game still speeds the turn up and slows it down
>   with the roll.
> - **`walk`: 2 frames × 6 steps → 6 frames × 2 steps, same 12-step loop.** Three legs stepping in turn need
>   more than two pictures. At half his speed (0.6875 px a step) one loop covers about 8 px, which matches how far
>   each foot travels per loop, so the feet do not slide.
> - **No hit areas, spawn points or pivots changed.** None of these sheets carries a hit area or a spawn point.
>   Every pivot is where it was: 20, 38 on the 40 × 40 sheets and 5, 9 on the stone. Every picture's lowest row
>   sits on the row just above its pivot.
> - **Colours:** statue 10, boulder 15, walker 15, stone 10. Keys `0`, `1` and `2` still mean the outline,
>   Granite Man's primary and his secondary, so the untouched `megaman` frame keeps its look. The statue sheet
>   has five free colour slots for the owner's megaman picture.
> - **Frame status:** every drawn frame is `draft`. The `megaman` frame still says `ready`, because it is the
>   placeholder line untouched. The import turns it to `draft` like the rest.
> 
> ## What must be kept exactly
> 
> - The `megaman` frame is the owner's to draw. **It is not AI-made.** When the AI-made list in `CLAUDE.md` gains
>   its row, it should name the chest and monolith statues, the boulder, the walker and the loose stone, and say
>   that the megaman statue is still the placeholder. The import writes "Drawn by Claude Design" on the statue
>   sheet's note line. If that should also mention the placeholder frame, that is the code's call.
> 
> ## Stand-ins (not to be built)
> 
> - The form-change demo on the canvas used a stand-in dust puff. The game draws its own puff, and nothing in this
>   bundle replaces it.
> 
> ## Requests for the code (requests, not changes; the import cannot make them)
> 
> 1. **The Lv10 walker is no longer "Rocky from Project Hail Mary".** Claude Design would not draw that
>    character, and the owner chose an original design instead: the cut-stone boulder on three stubby, kneeless,
>    eyeless legs. Please update the words that still say Rocky or Eridian:
>    - `design/weapon-art/granite_form.md` ("What it is", "The look")
>    - the comment above `rocky` in `src/data/weapon-art.js`
>    - `constraints()` in `tools/art/granite_form.mjs`
>    - the comment on `drawRockyShape` in `src/systems/weaponry.js`
> 
>    The sheet and clip names (`rocky`, `stand`, `walk`) can stay as they are. **The tracker field is the owner's
>    own words, so ask him before changing it.**
> 2. **The walker is smaller than the boulder.** Its rock body is about 23 px across, against the boulder's 29, so
>    the picture changes size when the form changes. The puff (with the picture swapping 10 steps in) hides this,
>    and the owner approved it in the demo. If the puff is ever made smaller, check that it still covers the swap.
> 
> ## Checks already run
> 
> On a scratch copy of `main` at `d9c1db0`, `npm run design:import` on these exact files passed every check: the
> sheet rules, the build and `sprites:ship`. `npm test` then reported 321 passed and 0 failed. Nothing was pushed.
