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

/**
 * SIX AXES, ONE SCORE. The first four are the original set; `unfair` and
 * `effort` were added because "how much of this could I not have dodged" and
 * "how much did my hands have to do" are the two questions the first four
 * cannot answer.
 *
 * `win` came down from 0.4 to make room without letting the others crowd it
 * out — losing is still the single loudest term, and by a wide margin.
 *
 * WHY EFFORT IS INPUTS PER SECOND AND NOT TOTAL INPUTS. Total inputs is mostly
 * a restatement of duration, which `ttk` already carries; a long fight would
 * score twice for being long. Per second is the part that is genuinely new —
 * how frantic the fight is, independent of how long it runs. Both are reported.
 */
/**
 * Exported because `tools/sim.mjs` stamps them into every saved run. A saved
 * result is only comparable to another one computed under the SAME weights, and
 * the run record used to write `weights: null` — so the `vs last` delta column
 * would silently compare scores from two different formulas after any tuning
 * here, while looking authoritative.
 */
export const WEIGHTS = {
  win: 0.30,     // losing
  hp: 0.25,      // what surviving cost
  unfair: 0.15,  // the share of that cost no input could have prevented
  ttk: 0.15,     // how long it took
  err: 0.10,     // how much of it was spent standing inside something
  effort: 0.05,  // how busy your hands were
};

/** The fraction of a fight spent inside a hitbox that scores a full 1.0. */
const ERR_REF = 0.15;

/**
 * Inputs per second that scores a full 1.0 on effort. Eight is roughly a press
 * every two frames sustained — past that a fight is asking for more than hands
 * reliably give, which is the point where "busy" becomes "difficult".
 */
const EFFORT_REF = 8;

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

  /**
   * THE SHARE OF DAMAGE NO INPUT COULD HAVE PREVENTED, pooled across the runs
   * rather than averaged per run — a run that took one unavoidable point must
   * not weigh the same as one that took twelve.
   */
  const totalDmg = runs.reduce((n, r) => n + (r.dmgTotal || 0), 0);
  const unavoidDmg = runs.reduce((n, r) => n + (r.dmgUnavoidable || 0), 0);
  const unfairFrac = totalDmg ? unavoidDmg / totalDmg : 0;

  const inputs = mean(runs.map((r) => r.inputs || 0));
  const ips = mean(runs.map((r) => (r.frames ? (r.inputs || 0) / (r.frames / 60) : 0)));

  const norm = {
    win: 1 - winRate,
    hp: hpLost,
    unfair: clamp01(unfairFrac),
    ttk: clamp01(ttkMs / capMs),
    err: clamp01(errFrac / ERR_REF),
    effort: clamp01(ips / EFFORT_REF),
  };
  const difficulty = 100 * Object.keys(norm)
    .reduce((sum, k) => sum + (weights[k] || 0) * norm[k], 0);

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
    // The new axes, reported raw as well as folded into the score.
    dmgTaken: mean(runs.map((r) => r.dmgTotal || 0)),
    dmgUnavoidable: mean(runs.map((r) => r.dmgUnavoidable || 0)),
    unfairPct: unfairFrac * 100,
    inputs,
    inputsPerSec: ips,
    noEscapePct: 100 * mean(runs.map((r) => (r.frames ? (r.noEscapeFrames || 0) / r.frames : 0))),
    norm,
    difficulty,
  };
}
