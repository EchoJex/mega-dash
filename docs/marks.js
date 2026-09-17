/**
 * THE MARKER LADDER — one vocabulary, one rule, shared by both apps and the
 * repo tooling.
 *
 * The tracker and the sprite editor had drifted into two dialects: the tracker
 * spoke draft/wip/ready/todo/na, the sprite editor spoke draft/wip/ready/
 * deferred. Same intent, different words, so a rule written about one did not
 * obviously apply to the other. They speak this now.
 *
 * IT IS A LADDER, NOT A SET. Each rung means strictly more done than the last:
 *
 *   deferred  the thing exists but nothing has been written or drawn for it
 *   wip       being written or drawn. Not ready, and not to be built from
 *   draft     THE GREEN LIGHT. The owner is satisfied; find it and build it
 *   ready     built, deploys clean, and untouched since
 *
 * `na` is gone. "Deliberately not applicable" was a fifth state off the side of
 * the ladder that only three fields ever used, and every one of them was a
 * settled answer — which is what `ready` means.
 *
 * CLAUDE NEVER WRITES `draft`. That is the owner's word for "go", so a
 * transcription can never be mistaken for permission to build it. Claude writes
 * `ready`, and only after the thing verifiably works.
 */

export const MARKS = ['deferred', 'wip', 'draft', 'ready'];

/**
 * How big an edit has to be before it means "I am rewriting this" rather than
 * "I am touching this up".
 *
 * FIFTY IS THE OWNER'S NUMBER and it is a threshold, not a measurement — it
 * exists so a typo fix on a finished field does not read the same as a rewrite.
 * Characters for prose, pixels for a sprite frame; the two are not comparable
 * to each other, only each to itself.
 */
export const SMALL_EDIT = 50;

/**
 * THE ASSERTION RULE: what a marker becomes when the owner edits the thing.
 *
 *   ready + a small edit   -> draft   a touch-up on something finished, so it
 *                                     goes back in the queue to be re-checked
 *                                     rather than silently staying "built"
 *   ready + a large edit   -> wip     this is a rewrite, and a rewrite is not
 *                                     something to build from
 *   anything else          -> wip     editing a draft withdraws the go-ahead;
 *                                     editing a deferred means you have started
 *
 * The small-edit case is the whole point. Before it, fixing one word in a
 * finished field dropped it all the way to `wip`, where nothing looks at it —
 * so a one-character correction could sit unbuilt indefinitely.
 */
export function markAfterEdit(mark, changed) {
  if (mark === 'ready') return changed < SMALL_EDIT ? 'draft' : 'wip';
  return 'wip';
}

/**
 * The size of the edit between two pieces of prose, as the length of the span
 * that actually differs.
 *
 * Measured by trimming the matching head and tail rather than by diffing: a
 * word swapped in the middle of a paragraph should read as the length of that
 * word, not the length of the paragraph. Cheap, and it runs on every keystroke.
 */
export function changedChars(before = '', after = '') {
  const a = String(before), b = String(after);
  if (a === b) return 0;
  const max = Math.min(a.length, b.length);
  let head = 0;
  while (head < max && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < max - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  return Math.max(a.length, b.length) - head - tail;
}

/**
 * The size of the edit between two frames, as a count of pixels whose ROLE
 * changed — the sprite equivalent of changedChars.
 *
 * Role and not colour, because a palette re-tune changes every pixel's colour
 * and none of its meaning; that is not an edit anybody made.
 */
export function changedPixels(before = [], after = []) {
  let n = 0;
  const rows = Math.max(before.length, after.length);
  for (let y = 0; y < rows; y++) {
    const a = before[y] || '', b = after[y] || '';
    const cols = Math.max(a.length, b.length);
    for (let x = 0; x < cols; x++) if (a[x] !== b[x]) n++;
  }
  return n;
}
