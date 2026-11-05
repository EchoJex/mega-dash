# Handing work to Claude Code

The loop, by the owner's call (12 Oct 2026): Claude Code builds the thing and its placeholder files; you read them from the repository and redraw them in the same files; the owner approves your work here; you hand it off; Claude Code brings it in with `npm run design:import`.

- **Give the owner ONE zip file to download**, holding the `.sprite` files and `HANDOFF.md`. Export → Hand off to Claude Code makes it where the menu has that button; it is not always there (owner, 23 Oct 2026), so otherwise make the zip yourself. The owner takes the zip to a Claude Code session.
- **Only redraw the sheets the prompt asks for.** A prompt lists finished sheets separately, for the look: leave those exactly as they are.
- **If every check passes, it goes straight into the game** — pictures, timing and hit areas — and the owner reads the list of changes afterwards. If any check fails, nothing goes in and the reason comes back in words. A record of every handoff (your note and the changes) is kept in `design/handoffs/`.
- **In the bundle:** the `.sprite` files you drew (each is matched by its first line, wherever it sits) and a note, `HANDOFF.md`, saying:
  - what the owner approved, and when;
  - what must be kept exactly as drawn, and what is a stand-in that must not be built;
  - every change to timing, hit areas, spawn points or the pivot, and why;
  - which tracker lines you think should change;
  - anything you would like changed in the code. Those are requests, not changes: the import cannot make them.
- **Mark every frame you finished `draft`, any you did not `wip`.** Never write `ready`: only the game can say a frame is playing.
- **Leave each sprite's `note` line alone.** The import writes the credit every AI-made drawing in this game carries.
- **`[draft]` in the tracker is the owner's word**, written only by the owner. Claude Code edits the tracker.
- **A boss room is code, not a sprite**: hand off its drawing code with the note, as the six drawn rooms were (`HANDOFF-arenas.md` is that model).
- Name things with the game's own words and state names, so the code can find them.
- **A canvas of variants is reviewed in comment threads.** Each thing gets a couple of questions and a few variants; the owner answers and picks in its thread, the thing is then labelled PICKED on the canvas, and only the picked variant goes on to be drawn in full and handed off.
- After Claude Code pushes, refresh the design project's link to the repository, so its copies of the rules are current.
