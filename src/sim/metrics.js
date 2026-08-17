/**
 * METRICS — four things about a fight, and one number made from them.
 *
 * THE FORMULA WAS NOT SUPPLIED, so this is the obvious reading of the weights
 * that were: a weighted sum of four metrics each normalised to 0-1, scaled to
 * 100. Every one of them is oriented so that BIGGER MEANS HARDER before it is
 * weighted — which is why win rate is inverted here and nowhere else.
 *
 *   0.4  1 - winRate      losing is the strongest possible statement
 *   0.3  hpLost           what surviving cost
 *   0.2  ttk              how long it took
 *   0.1  errorMargin      how much of it was spent standing in something
 *
 * WHERE THE 0-1 SCALES COME FROM. Win rate and HP lost are already fractions.
 * The other two need a reference, and picking one badly is the easiest way to
 * make this whole tool lie, so both are stated rather than tuned:
 *
 *   ttk      normalised against the TIMEOUT, so "took the whole budget" is 1.0
 *            and a loss contributes the full budget rather than the moment the
 *            player happened to die. Without that a fight lost in ten seconds
 *            would score as FASTER than one won in forty.
 *   error    normalised against ERR_REF — the fraction of the fight a player
 *            can spend inside a hitbox before it stops being a mistake and
 *            starts being the whole strategy. 15% is a guess and is meant to
 *            be argued with; it carries the smallest weight for that reason.
 *
 * NONE OF THESE NUMBERS ARE BALANCE. Weapon damage, boss HP and the ramp are
 * all placeholders (see CLAUDE.md), so read the output as "does this weapon
 * function against this boss" long before reading it as "is this fair".
 */

export const WEIGHTS = { win: 0.4, hp: 0.3, ttk: 0.2, err: 0.1 };

/** The fraction of a fight spent inside a hitbox that scores a full 1.0. */
export const ERR_REF = 0.15;

/** How long a fight may run before it is called a loss, in sim seconds. */
export const TIMEOUT_SEC = 90;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Fold a set of per-run records into averages and one score.
 *
 * @param runs [{ win, ttkMs, hpLostFrac, errorFrames, frames }]
 */
export function aggregate(runs, weights = WEIGHTS, timeoutSec = TIMEOUT_SEC) {
  const capMs = timeoutSec * 1000;
  const winRate = mean(runs.map((r) => (r.win ? 1 : 0)));
  const hpLost = mean(runs.map((r) => clamp01(r.hpLostFrac)));
  // A LOSS COSTS THE WHOLE BUDGET. Timing a loss from the moment the player
  // died would make dying quickly look like winning quickly.
  const ttkMs = mean(runs.map((r) => (r.win ? r.ttkMs : capMs)));
  const errFrac = mean(runs.map((r) => (r.frames ? r.errorFrames / r.frames : 0)));

  const norm = {
    win: 1 - winRate,
    hp: hpLost,
    ttk: clamp01(ttkMs / capMs),
    err: clamp01(errFrac / ERR_REF),
  };
  const difficulty = 100 * (
    weights.win * norm.win + weights.hp * norm.hp
    + weights.ttk * norm.ttk + weights.err * norm.err
  );

  return {
    iterations: runs.length,
    winRate,
    hpLostPct: hpLost * 100,
    // Reported over the WINS only, because "how long does killing him take" is
    // a question about kills. The losses are already fully represented by the
    // win-rate term, and folding a 90-second timeout into the headline average
    // would make the printed TTK a number that never happened.
    avgTtkMsWins: mean(runs.filter((r) => r.win).map((r) => r.ttkMs)),
    errorFramesPerSec: mean(runs.map((r) => (r.frames ? r.errorFrames / (r.frames / 60) : 0))),
    norm,
    difficulty,
  };
}
