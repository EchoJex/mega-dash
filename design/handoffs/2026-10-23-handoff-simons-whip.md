# Design handoff, 2026-10-23: handoff-simons-whip

Brought in by `npm run design:import`. Every check passed (the sheets' contracts,
the build, `npm test`), so by the owner's call it went straight in.

## What changed

- **weapon-simons_whip-body**
  - 24 frames redrawn
  - slidingCrack: a new clip, 3 frames, 20 steps
  - slidingCrackLong: a new clip, 3 frames, 20 steps
  - slidingCrackLonger: a new clip, 3 frames, 20 steps
  - lowCrack: removed
  - lowCrackLong: removed
  - lowCrackLonger: removed
- **weapon-simons_whip-held**
  - 25 frames redrawn
  - colours: 12 in all (8 added, 1 changed)
  - crack: its hit area reaches 8 px further forward, 1 px further back, 9 px higher at the top, 6 px higher at the bottom
  - crackLong: its hit area reaches 12 px further forward, 6 px further back, 8 px higher at the top, 2 px higher at the bottom
  - crackLonger: its hit area reaches 17 px further forward, 5 px higher at the top, 3 px higher at the bottom
  - crackUpLong: its hit area reaches 12 px further forward, 6 px further back, 8 px higher at the top, 2 px higher at the bottom
  - crackUpLonger: its hit area reaches 17 px further forward, 5 px higher at the top, 3 px higher at the bottom
  - slidingCrack: a new clip, 3 frames, 20 steps
  - slidingCrackLong: a new clip, 3 frames, 20 steps
  - slidingCrackLonger: a new clip, 3 frames, 20 steps
  - lowCrack: removed
  - lowCrackLong: removed
  - lowCrackLonger: removed

## The design's own note

> # Simon's Whip — art handoff
> 
> **Approved by the owner on 23 Oct 2026** ("approved, hand it off and push"), after a
> review on the Design canvas *Simon's Whip Art*: every clip played at 60 steps a second,
> facing both ways, beside the player, with every hit area drawn on.
> 
> ## What is in it
> 
> - `weapon-simons_whip-held.sprite`: the vine. Thorn Man green, segmented, with brown
>   thorns growing out of the stem and a white-and-gold glint on the tip when cracked out.
>   12 colours.
> - `weapon-simons_whip-body.sprite`: his three Simon poses in his own twelve colours:
>   pulled back, arm raised barely over his helmet (a swing round from the side), arm
>   thrust forward. His feet are planted a little wider than his idle, centred under him,
>   and his body sits exactly where his standing picture puts it, so he does not hop
>   when a crack starts. The sliding clips put the same upper body on his own slide's
>   legs, both feet leading.
> - `rest`: **drawn pixel by pixel by the owner** in the canvas editor (23 Oct 2026): the
>   whip coiled at his hip. Used exactly as drawn.
> 
> ## Timing: unchanged
> 
> Every clip is still 5 · 5 · 10 steps; the swing still lands on step 5 and the crack on
> step 10.
> 
> ## Hit areas
> 
> - **The tips (the main hit): unchanged**, by the owner's choice: crack 79,57 · long
>   97,57 · longest 123,57 · up-long 82,20 · up-longest 100,2, all 10×10.
> - **The overhead swing (the light hit): follows the new drawing, plus a pixel.** It got
>   wider and moved, and stays behind his hand, so a minion against his front takes only
>   the crack:
>   - crack and slidingCrack: 18,43, 25×22 (was 19,52, 16×19)
>   - crackLong, crackUpLong, slidingCrackLong: 7,42, 36×28 (was 13,50, 18×22 / 18×21)
>   - crackLonger, crackUpLonger, slidingCrackLonger: 5,43, 38×28 (was 5,48, 21×26 / 21×23)
> - **The rest of the vine stays medium damage**, as Thorn Man's weapon field says
>   (owner, 23 Oct 2026: option B, not mild).
> 
> Pivot unchanged (50, 62). No spawn points.
> 
> ## A rename that travels with this handoff
> 
> `lowCrack`, `lowCrackLong`, `lowCrackLonger` are now **`slidingCrack`,
> `slidingCrackLong`, `slidingCrackLonger`** (owner, 23 Oct 2026: "ensure the term lowcrack
> is fully replaced with slidingcrack"). The code's list of clips, the line that picks the
> clip during a slide, the test, the placeholder rig and the brief are renamed in the same
> commit, so the import's contract check matches. There is no crouch in this game.
> 
> ## Requests for the code (not made by this handoff)
> 
> 1. **The up-forward crack cannot raise his hand.** The sheet has one pivot, his hand, so
>    in every cracked-out frame his hand sits at waist height. A per-frame hand point would
>    let the up-forward crack come from a raised arm.
> 2. **More paper behind him.** There are 50 pixels behind his hand, so the pulled-back
>    picture looks the same for all three whip lengths. A wider sheet would let the longer
>    whips trail further.
