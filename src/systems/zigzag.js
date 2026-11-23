/**
 * A ZIGZAG THAT GROWS ONE SEGMENT AT A TIME — the Grass boss's seed-pod vine
 * and the Volt Spark's bolt (owner, 23 Nov 2026: "grow in discrete segments ...
 * always in an advancing direction, toward the player zigzagging like a vine";
 * the lightning weapon "needs to have the same semi random advancing zigzag").
 *
 * A zigzag is a list of points. Each one remembers two places: where it is
 * drawn (`x`, `y`), and the straight line it hangs off (`sx`, `sy`, the
 * spine). The spine always moves straight at the target; the drawn point sits
 * a random distance to one side of it, alternating sides, so the line wanders
 * but can never drift away or turn back.
 */

/** A new zigzag starting at one point. */
export const zigStart = (x, y) => [{ x, y, sx: x, sy: y }];

/**
 * Add one segment, `seg` pixels long, toward (tx, ty), swinging up to `amp`
 * pixels to the side. True when this segment reached the target.
 */
export function zigStep(pts, tx, ty, seg, amp) {
  const s = pts[pts.length - 1];
  const dx = tx - s.sx, dy = ty - s.sy, d = Math.hypot(dx, dy) || 1;
  const k = Math.min(seg, d) / d;
  const sx = s.sx + dx * k, sy = s.sy + dy * k;
  const reached = d <= seg;
  // The last point of a bolt that has arrived sits ON the target, not beside it.
  const side = reached ? 0 : (pts.length % 2 ? 1 : -1) * amp * (0.5 + Math.random() * 0.5);
  pts.push({ x: sx - (dy / d) * side, y: sy + (dx / d) * side, sx, sy });
  return reached;
}
