/**
 * ARENAS — the sealed room a boss is fought in.
 *
 * A run alternates between two kinds of space:
 *
 *   AREA    the endless procedural stream. Its background is themed to the
 *           boss whose door is coming, so the arena is foreshadowed before you
 *           ever reach it.
 *   ARENA   exactly one screen, walled left and right, floored and ceilinged.
 *           Camera locked. No ambient minions. The boss and its hazards only.
 *
 * The door does not open into the arena — it WARPS you there. Contact freezes
 * everything, fades to black, builds the room while nothing is visible, then
 * fades back in and resumes. Nothing should ever be seen half-constructed.
 *
 * On the boss's death a WRAP DOOR appears, which warps back out to a fresh area
 * themed to the next boss in the bag.
 *
 * ONE SCREEN WIDE is deliberate: it matches the NES boss rooms this is modelled
 * on, it means the camera never has to make a decision, and it guarantees the
 * whole fight is always visible.
 */

import { VIEW_H } from '../config/display.js';
import { hexNum } from './assets.js';
import * as Attr from './attributes.js';

/** Frames for each stage of the warp. Fade out, build, fade in. */
export const WARP = { out: 16, hold: 6, in: 18 };

/**
 * Build the sealed room for a boss.
 *
 * `floorY` matches the area's ground line so the player's footing does not jump
 * across the transition, and the walls sit exactly on the screen edges.
 */
export function makeArena(bossDef, layer, viewW, floorY) {
  const a = {
    boss: bossDef,
    layer,
    x0: 0,
    x1: viewW,
    floorY,
    ceilY: 0,
    // Per-boss furniture, built by FURNITURE below.
    platforms: [],
    turrets: [],
    // Terrain attributes (Hot ground and the like) live here, not on the boss:
    // they outlive whatever created them.
    patches: [],
    // Rising liquid, as a height above the floor. Blaze Man floods with lava,
    // Tempest Man stands in water — same field, different meaning per boss.
    liquid: null,
    drain: null,
    // A constant push applied to the player each frame (rain, current).
    push: { x: 0, y: 0 },
    // Horizontal component of the rain, -1..1. Set by Tempest Man's hazard
    // loop, and the thing his lightning telegraphs a change to. Null means the
    // room has no weather.
    rainDir: null,
    // The room's own clock, for anything that has to animate without reading
    // the run frame — rain streaks, mainly. Arena-scoped so it restarts with
    // the room rather than carrying a run's worth of offset into it.
    t: 0,
    /**
     * THE ROOM'S BEAT. "All furniture, hazards, and boss layer attacks shall be
     * synched to a common 1s beat" — Volt Man's arena field, and the first room
     * to ask for one.
     *
     * DERIVED FROM `t` RATHER THAN COUNTED SEPARATELY, so a second counter can
     * never drift from the first. `beat` is the frame within the current beat
     * and `beatN` is how many have passed.
     *
     * A BEAT-LOCKED DURATION IS STATED IN BEATS, not in the frames it happens to
     * come to. The tracker states them in seconds and a beat is a second, so
     * written that way the code and the field agree by construction rather than
     * by arithmetic somebody has to redo — see BEAT in bossFights.js, which is
     * where Volt Man's sweep, wind-up and end-of-sweep sequence are all built
     * from multiples of it. That agreement is the whole point: the platform
     * sets, the panel sweep and the speaker membranes landing together is what
     * makes the room read as one machine rather than as four timers.
     *
     * It exists on every arena and costs nothing in a room that ignores it.
     */
    beat: 0,
    beatN: 0,
    beatLen: 60,
    /**
     * HOW DARK THE ROOM IS, 0 to 1. Volt Man's layer-2 sweep ends by flickering
     * the lights and leaving them out, so the bolts that follow arrive in the
     * dark. Separate from `flash`, which is the opposite gesture and additive —
     * one is the room losing power, the other is something in it going off.
     */
    dim: 0,
    // Hazard state lives here rather than on the boss, because the ambient loop
    // keeps running regardless of what the boss is doing.
    hazards: [],
    // Electrified floor panels and the conductors above them (Volt Man).
    panels: [],
    conductors: [],
    // Visual-only cabinets whose membranes pulse on the beat, so a room built
    // around a rhythm shows you the rhythm. Volt Man only, so far.
    speakers: [],
    // A whole-room light flash, in frames. Tempest Man's lightning telegraphs
    // a rain direction change with one; Volt Man's arcs use it too. Drawn over
    // the room but under the HUD, and it never moves with the shake — a flash
    // that shook would read as a second impact rather than as light.
    flash: 0,
    // How many frames the CURRENT flash was set with, and how hard it burns.
    // Together they let one mechanism cover both a telegraph and a flash bang:
    // see ctx.flash in GameScene and the wash at the end of GameScene.draw.
    flashN: 10,
    flashHard: 0.34,
    // 0-1, how hard the backdrop is glowing right now. Blaze Man's layer-3
    // tell is "the red pixels of the background ebb rapidly" before the flood.
    ebb: 0,
    theme: themeFor(bossDef),
  };
  FURNITURE[bossDef?.id]?.(a, layer, viewW, floorY);
  return a;
}

/**
 * ARENA FURNITURE — the geometry each boss's designed hazards need to exist.
 *
 * Built here rather than in the hazard loop because it is the ROOM, not the
 * event: Core Man's turrets are bolted to the ceiling whether or not they are
 * currently firing, and Tempest Man's drain is in the floor before the water
 * arrives. Only the three bosses whose tracker entries are written have entries;
 * everything else gets a bare room, which is correct rather than missing.
 */
/** Frames the plasma lamp holds one lightning shape before jumping to another. */
const VOLT_LAMP_HOLD = 14;

/**
 * VOLT MAN'S PLATFORM RHYTHM, in BEATS rather than frames — the field states it
 * in seconds and the beat is a second, so the two agree by construction.
 *
 * `period` is not a free number: two sets three apart, each lasting five, only
 * repeats cleanly on a six-beat cycle. Change `apart` or `on` and this has to
 * move with them or the sets drift out of phase with each other.
 */
const VOLT_PLATFORM = { apart: 3, on: 5, period: 6 };

const FURNITURE = {
  /**
   * CORE MAN — "plain light grey room with a couple of small ceiling turrets".
   * Two turrets, mounted on the ceiling, inset from the walls so their spread
   * covers the room rather than firing into a corner.
   */
  core(a, layer, viewW) {
    a.turrets = [0.28, 0.72].map((f) => ({
      x: Math.round(viewW * f) - 5, y: a.ceilY, w: 10, h: 7, flash: 0,
    }));
  },

  /**
   * BLAZE MAN — "a few short platforms phase in and out in random places
   * throughout the entire fight as shelter."
   *
   * Phase state is per platform with staggered timers, so shelter appears and
   * disappears independently and you are never left with no option at all. The
   * lava field exists from the start at height 0; only layer 3 raises it.
   */
  blaze(a, layer, viewW, floorY) {
    const n = 3;
    a.platforms = Array.from({ length: n }, (_, i) => ({
      x: Math.round(viewW * (0.18 + 0.3 * i)) - 22,
      y: floorY - 42 - (i % 2) * 26,
      w: 44, h: 5,
      // Solid while `on`; phase timers are staggered so they never all vanish
      // on the same frame.
      on: true, t: 150 + i * 70, hot: 0,
    }));
    a.liquid = { kind: 'lava', h: 0, target: 0, rise: 0.22, hold: 0 };

    // LAYER 3 ONLY — "a small platform that moves up and down just for himself".
    // His own, and marked as such: it never phases out, rocks never fall on it,
    // and the flood's footing guarantee ignores it when it looks for somewhere
    // safe for the PLAYER to stand. A shared platform would have made the
    // flood a fight over one tile.
    if (layer >= 3) {
      a.lift = {
        x: Math.round(viewW * 0.5) - 16, y: floorY - 56,
        w: 32, h: 5, on: true, hot: 0, t: 1e9,
        lift: { base: floorY - 56, amp: 18, phase: 0, rate: 0.018 },
      };
      a.platforms.push(a.lift);
    }
  },

  /**
   * TEMPEST MAN — corner pipes pouring down the walls, knee-deep floor
   * water with an inward current, and a grate-covered central drain with a
   * damaging spike ball sitting on it.
   */
  torrent(a, layer, viewW, floorY) {
    // "Large steel pipes protruding from the walls in the upper corners." They
    // are the spout for the cascade AND the mouth barrels and spike balls
    // arrive from, so the hazard loop reads their positions rather than
    // inventing spawn points that happen to line up.
    a.pipes = [
      { x: a.x0, y: a.ceilY + 16, w: 16, h: 10, dir: 1 },
      { x: a.x1 - 16, y: a.ceilY + 16, w: 16, h: 10, dir: -1 },
    ];
    a.drain = {
      x: Math.round(viewW / 2) - 14, w: 28, y: floorY,
      // The spike ball rides on the grate. Layer 2 also makes the grate itself
      // damaging, per the tracker.
      ball: { x: Math.round(viewW / 2), y: floorY - 7, r: 6, bob: 0 },
      grateHurts: layer >= 2,
    };
    a.liquid = { kind: 'water', h: 9, target: 9, rise: 0.1, hold: 0 };
  },

  /**
   * VOLT MAN — "a large plasma lamp in the background", a floor of panels that
   * electrify in a sweep, and (layer 2+) overhead conductors.
   *
   * The panels tile the whole floor rather than sitting at chosen spots,
   * because the hazard is a SWEEP: it has to be able to reach anywhere you
   * might stand, and a gap in the tiling would be a permanent safe square that
   * makes the whole mechanic optional.
   */
  volt(a, layer, viewW, floorY) {
    // "SEVERAL PLATFORMS PHASE IN AND OUT IN RANDOM LOCATIONS." Four rather
    // than Blaze Man's three, because here they are not shelter — the hazard is
    // the FLOOR, so a platform is the answer to it, and one too few would turn
    // the sweep from a thing you read into a thing you wait out.
    //
    // Two heights, so a low one and a high one can coexist and a phased-out low
    // platform still leaves a reachable high one. `roam` is what makes them land
    // somewhere new each time they phase back in — see stepArena.
    /**
     * "TWO AT A TIME, THREE SECONDS APART, EACH SET LASTING FIVE SECONDS."
     *
     * Four platforms in two SETS of two, and the sets are what phase — not the
     * individual platforms on their own scattered timers, which is what this
     * was. Set 0 arrives on the beat, set 1 three beats later, each stays five,
     * so the pattern repeats every six seconds with a two-second overlap where
     * all four are up and a moment where only one set is. The player is never
     * left with nothing above the live panel, and the rhythm is one they can
     * count rather than one they have to watch.
     *
     * `beatSet` is what tells stepArena to drive this platform off the room's
     * beat instead of its own countdown; see the phasing block there.
     */
    const ys = [floorY - 38, floorY - 66];
    a.platforms = Array.from({ length: 4 }, (_, i) => ({
      x: Math.round(viewW * (0.14 + 0.24 * i)) - 20,
      y: ys[i % 2],
      w: 40, h: 5,
      on: true, t: 0, hot: 0,
      beatSet: { inAt: (i % 2) * VOLT_PLATFORM.apart, on: VOLT_PLATFORM.on,
        every: VOLT_PLATFORM.period },
      roam: { x0: 12, x1: Math.max(13, viewW - 52), ys },
    }));

    /**
     * THE SPEAKERS ARE THE METRONOME MADE VISIBLE — "two industrial speakers
     * with pulsing membrane pulse every 1s indicating this arena wide beat".
     *
     * A room where everything happens on a beat is only fair if the beat is
     * something you can SEE. Without them the player would have to infer the
     * tempo from the hazard that is already trying to kill them, which is
     * learning the rhythm the expensive way.
     *
     * THEY HANG HIGH, IN THE BACKGROUND, flanking the plasma lamp — not on the
     * floor. The field introduces them in the same breath as the lamp, and it
     * says visual only; a cabinet at floor level is where the player STANDS, so
     * the first thing it did was put him in silhouette against it and the
     * second was look like furniture he ought to be able to land on. Up here
     * they are clear of the highest platform and read as part of the room
     * rather than as something in it.
     */
    a.speakers = [
      { x: a.x0 + 4, y: a.ceilY + 20, w: 22, h: 54 },
      { x: a.x1 - 26, y: a.ceilY + 20, w: 22, h: 54 },
    ];

    const n = 8;
    const pw = Math.floor((a.x1 - a.x0) / n);
    a.panels = Array.from({ length: n }, (_, i) => ({
      x: a.x0 + i * pw, y: floorY - 3, w: pw, h: 3,
      live: 0,      // frames of being energised left
      tell: 0,      // frames of lamp warning left, before it energises
    }));
    // "Inert between arcs and can be stood under safely" — so they are drawn
    // whatever the layer, and only layer 2 and up ever fire them.
    /**
     * "Two LONG overhead cables with exposed conductors at 30% and 70% arena
     * width. The cables are drawn at every layer but the conductors and the
     * sparkle are only drawn at layer 2 and layer 3."
     *
     * So the CABLE is scenery and the CONDUCTOR is the threat, and they are
     * separated: a layer-1 room already shows you the wiring that is going to
     * matter later, without a live thing hanging off it. `live` is what the
     * renderer reads to decide whether to draw the exposed part at all.
     *
     * LONG MEANS THE CABLE SPANS THE ROOM. It used to be a 2x4 nub directly
     * above the conductor, which read as a bracket rather than as wiring and
     * said nothing about where the current came from. Each cable now runs wall
     * to wall at its own height with one exposed spot along it, so the two
     * never overlap and the room looks wired rather than fitted with two studs.
     * `cableY` is the run; `y` stays the top of the exposed box that hangs off
     * it, because that is what the hazard loop and the bolt column measure from.
     */
    a.conductors = [0.3, 0.7].map((f, i) => ({
      x: Math.round(viewW * f) - 4, y: a.ceilY + 4 + i * 7, w: 8, h: 6,
      cableY: a.ceilY + 3 + i * 7,
      arc: 0, tell: 0, fade: 0,
      live: layer >= 2,
    }));
  },

  /**
   * STRIKE MAN — "underground fight pit: chain-link cage walls, a stained mat
   * floor, and a background of hanging lamps", with weighted training bags
   * swinging across the room on ceiling rails.
   *
   * The rail is furniture and the bag riding it is a hazard entity, so the
   * rail's height is fixed here and the hazard loop only decides how many bags
   * are on it and how fast they travel.
   */
  strike(a, layer, viewW, floorY) {
    a.rails = [{ y: a.ceilY + 10 }, { y: a.ceilY + 22 }, { y: a.ceilY + 34 }];
  },
};

/** Which bosses have their arena furniture built. Read by `npm run status`. */
export const FURNISHED = () => Object.keys(FURNITURE);

/**
 * Placeholder backdrop for a boss, derived from its palette.
 *
 * Real arena art arrives as MANIFEST key `background:<bossId>`. Until then a
 * darkened wash of the boss's own primary is enough to make each room feel
 * distinct and to make the foreshadowing legible — you can tell Blaze Man is
 * next because the area ahead of you is going red.
 */
export function themeFor(bossDef) {
  if (!bossDef) return { fill: 0x060614, id: null };
  const n = hexNum(bossDef.primary);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const k = 0.16; // heavily darkened — a backdrop must never fight the actors
  const mix = (c) => Math.round(6 + c * k);
  return {
    id: bossDef.id,
    fill: (mix(r) << 16) | (mix(g) << 8) | mix(b),
  };
}

/** Keep the player inside the sealed room. */
export function clampToArena(arena, p, w = 24) {
  if (p.x < arena.x0) { p.x = arena.x0; p.vx = 0; }
  if (p.x + w > arena.x1) { p.x = arena.x1 - w; p.vx = 0; }
  if (p.y < arena.ceilY) { p.y = arena.ceilY; p.vy = 0; }
}

/**
 * Screen shake, in whole virtual pixels.
 *
 * Whole pixels only: the game renders at a fixed 224px and integer-scales up, so
 * a fractional offset would break pixel alignment and shimmer. Blaze Man's
 * hazards use the intensity as their tell, so this needs to read clearly at
 * three distinct strengths.
 */
export function shakeOffset(shake) {
  if (!shake || shake.t <= 0) return { x: 0, y: 0 };
  const mag = shake.mag * (shake.t / shake.dur);
  return {
    x: Math.round((Math.random() * 2 - 1) * mag),
    y: Math.round((Math.random() * 2 - 1) * mag),
  };
}

export function stepShake(shake) {
  if (shake && shake.t > 0) shake.t--;
  return shake;
}

/**
 * Advance the room itself: phasing platforms, rising liquid, patch lifetimes.
 *
 * Separate from the hazard loop on purpose. The room keeps breathing whether or
 * not a hazard is mid-cycle, and the boss's own attacks read the same state —
 * Blaze Man's layer-3 flood is triggered by his attack but owned by the arena.
 */
/**
 * "PLATFORMS PHASE IN AND OUT IN RANDOM LOCATIONS" — Volt Man's arena field. A
 * platform that returns exactly where it left is a platform you can stand under
 * and wait for; one that comes back somewhere else makes the room a thing you
 * keep re-reading, which is the point when the FLOOR is the hazard.
 *
 * Only on the way IN, and only for a platform that opted in. Moving one out
 * from under a standing player would be a trapdoor with no tell.
 */
function roamPlatform(pl) {
  if (!pl.roam) return;
  pl.x = Math.round(pl.roam.x0 + Math.random() * (pl.roam.x1 - pl.roam.x0));
  pl.y = pl.roam.ys[(Math.random() * pl.roam.ys.length) | 0];
}

export function stepArena(arena) {
  if (!arena) return;
  arena.t++;
  // The beat, off the room's own clock. See `beat` in makeArena.
  arena.beat = arena.t % arena.beatLen;
  arena.beatN = Math.floor(arena.t / arena.beatLen);
  Attr.stepPatches(arena.patches);
  if (arena.flash > 0) arena.flash--;

  for (const pl of arena.platforms) {
    if (pl.hot > 0) pl.hot--;
    // A lift rides its own sine and never phases — see the `lift` note in
    // FURNITURE.blaze. Checked before the phase timer so it can skip it.
    if (pl.lift) {
      pl.lift.phase += pl.lift.rate;
      pl.y = Math.round(pl.lift.base + Math.sin(pl.lift.phase) * pl.lift.amp);
      continue;
    }
    /**
     * A SET THAT PHASES ON THE ROOM'S BEAT rather than on its own countdown.
     * Volt Man's four platforms are two sets of two, and a set is either up or
     * down together — see VOLT_PLATFORM. Computed from `beatN` rather than
     * counted down, so it cannot drift from the sweep or the speakers however
     * long the fight runs.
     */
    if (pl.beatSet) {
      const b = pl.beatSet;
      const phase = ((arena.beatN - b.inAt) % b.every + b.every) % b.every;
      const on = phase < b.on;
      if (on !== pl.on) {
        pl.on = on;
        if (on) roamPlatform(pl);
      }
      continue;
    }
    if (--pl.t > 0) continue;
    pl.on = !pl.on;
    pl.t = pl.on ? 220 + Math.random() * 160 : 90 + Math.random() * 70;
    if (pl.on) roamPlatform(pl);
  }

  for (const p of arena.panels) {
    if (p.tell > 0) p.tell--;
    if (p.live > 0) p.live--;
  }
  for (const c of arena.conductors) {
    if (c.tell > 0) c.tell--;
    if (c.arc > 0) c.arc--;
    if (c.fade > 0) c.fade--;
  }
  // NEVER let every platform be gone at once — the tracker calls them shelter,
  // and shelter you cannot reach is just a death sentence with extra steps.
  //
  // The boss's own lift does not count toward that guarantee. It is always on,
  // so counting it would silently satisfy the check while the player had
  // nowhere at all to stand.
  //
  // A BEAT-DRIVEN SET CANNOT TRIP IT, and that is worth stating rather than
  // relying on: Volt Man's two sets are three beats apart and last five, so
  // there is always at least one up by construction. The guard stays because it
  // is a backstop against a future set of numbers that do NOT overlap, and
  // because forcing one on is cheaper than the failure it prevents. It writes
  // `on` directly rather than shifting the phase, so the set snaps back onto
  // the beat by itself on the next transition.
  const shelter = arena.platforms.filter((p) => !p.lift);
  if (shelter.length && !shelter.some((p) => p.on)) {
    shelter[0].on = true; shelter[0].t = 200;
  }

  const q = arena.liquid;
  if (q) {
    if (q.h < q.target) q.h = Math.min(q.target, q.h + q.rise);
    else if (q.h > q.target) q.h = Math.max(q.target, q.h - q.rise * 0.7);
    if (q.hold > 0 && --q.hold === 0) q.target = q.kind === 'lava' ? 0 : q.target;
  }

  for (const t of arena.turrets) if (t.flash > 0) t.flash--;
  if (arena.drain) arena.drain.ball.bob += 0.06;
}

/** Surface height of the arena's liquid, in world Y. Infinity when there is none. */
export const liquidTop = (arena) =>
  arena?.liquid && arena.liquid.h > 0.5 ? arena.floorY - arena.liquid.h : Infinity;

/**
 * THE POWER-LINE BOLTS, DRAWN AFTER THE DARKNESS.
 *
 * "Luminous, neon purple lightning bolts that stay still for 1s before fading
 * over a second period." They arrive in a room that has just turned its own
 * lights off, and the dim wash is a flat rectangle over the whole world layer —
 * so drawn inside `drawArena` with everything else, the one thing in the scene
 * that is supposed to be a LIGHT SOURCE was the thing being dimmed hardest.
 * GameScene calls this immediately after that wash, which is the only ordering
 * under which "luminous" means anything.
 *
 * STAY STILL is what shapes the geometry. The kinks are a function of the
 * conductor's own position and nothing else, so the same bolt is drawn every
 * frame it exists — fine to re-randomise a flicker lasting a quarter second,
 * wrong for a column that stands for a full one asking to be read as a solid
 * object you must not be under.
 *
 * Neon purple rather than the yellow-white the rest of the room uses, because
 * this is the only hazard that arrives in the dark and a colour nothing else in
 * the arena owns is what stops it reading as one more panel discharge.
 */
export function drawArenaBolts(g, arena, shake) {
  if (!arena?.conductors?.length) return;
  const sx = shake?.x || 0, sy = shake?.y || 0;
  for (const c of arena.conductors) {
    if (!(c.arc > 0 || c.fade > 0)) continue;
    const a1 = c.arc > 0 ? 1 : c.fade / Math.max(1, c.fadeN);
    const cx0 = c.x + c.w / 2;
    let k = 0;
    for (let y = c.y + c.h; y < arena.floorY; y += 4) {
      const bx = cx0 + (k % 2 ? 3 : -3);
      // A wide soft body under a hard bright core: the two together are what
      // read as glow at a resolution with no blur to spend.
      g.fillStyle(0x7C2BD9, 0.55 * a1);
      g.fillRect(Math.round(bx) + sx - 3, y + sy, 8, 4);
      g.fillStyle(0xB86BFF, 0.95 * a1);
      g.fillRect(Math.round(bx) + sx - 1, y + sy, 4, 4);
      g.fillStyle(0xF3E8FF, a1);
      g.fillRect(Math.round(bx) + sx, y + sy, 2, 4);
      k++;
    }
  }
}

/** Draw the sealed room: walls, ceiling, floor, furniture, attributes. */
export function drawArena(g, arena, viewW, shake) {
  const sx = shake?.x || 0, sy = shake?.y || 0;

  g.fillStyle(arena.theme.fill, 1);
  g.fillRect(0, 0, viewW, VIEW_H);
  drawBackdrop(g, arena, viewW, sx, sy);

  // Floor
  g.fillStyle(0x0a1628, 1);
  g.fillRect(sx, arena.floorY + sy, viewW, VIEW_H - arena.floorY);
  g.fillStyle(0x1a3050, 1);
  g.fillRect(sx, arena.floorY + sy, viewW, 2);

  // Sealed walls and ceiling — thin, so the play space stays a full screen
  g.fillStyle(0x141c2c, 1);
  g.fillRect(sx - 4, sy, 4, VIEW_H);
  g.fillRect(arena.x1 + sx, sy, 4, VIEW_H);
  g.fillRect(sx, sy - 4, viewW, 4);
  g.fillStyle(0x1a3050, 1);
  g.fillRect(sx, sy, viewW, 1);

  // Drain and its spike ball sit IN the floor, so they draw before the liquid.
  if (arena.drain) {
    const d = arena.drain;
    g.fillStyle(0x061020, 1);
    g.fillRect(d.x + sx, d.y + sy, d.w, VIEW_H - d.y);
    g.fillStyle(d.grateHurts ? 0x8a3040 : 0x2a4a70, 1);
    for (let i = 2; i < d.w; i += 5) g.fillRect(d.x + i + sx, d.y + sy, 2, 3);
    const by = d.ball.y + Math.sin(d.ball.bob) * 1.5;
    g.fillStyle(0x9aa4b4, 1);
    g.fillCircle(d.ball.x + sx, by + sy, d.ball.r);
    g.fillStyle(0xd8dee8, 1);
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      g.fillRect(d.ball.x + Math.cos(th) * d.ball.r - 1 + sx, by + Math.sin(th) * d.ball.r - 1 + sy, 2, 2);
    }
  }

  // Phasing platforms. A platform mid-phase is drawn hollow so you can read that
  // it is about to leave rather than discovering it underfoot.
  for (const pl of arena.platforms) {
    const going = pl.on && pl.t < 45;
    if (!pl.on) {
      g.lineStyle(1, 0x1a3a60, 0.35);
      g.strokeRect(pl.x + sx + 0.5, pl.y + sy + 0.5, pl.w - 1, pl.h - 1);
      continue;
    }
    g.fillStyle(pl.hot > 0 ? 0xB03018 : 0x1a3a60, going ? 0.55 : 1);
    g.fillRect(pl.x + sx, pl.y + sy, pl.w, pl.h);
  }

  // Ceiling turrets, with a muzzle flash while firing.
  for (const t of arena.turrets) {
    g.fillStyle(0x39404e, 1);
    g.fillRect(t.x + sx, t.y + sy, t.w, t.h);
    g.fillStyle(t.flash > 0 ? 0xffd070 : 0x6b7686, 1);
    g.fillRect(t.x + t.w / 2 - 1 + sx, t.y + t.h + sy, 2, 3);
  }

  // Tempest Man's corner pipes, and the cascade pouring out of them.
  for (const pipe of arena.pipes || []) {
    g.fillStyle(0x4A5460, 1);
    g.fillRect(pipe.x + sx, pipe.y + sy, pipe.w, pipe.h);
    g.fillStyle(0x2A323C, 1);
    g.fillRect(pipe.x + sx, pipe.y + 2 + sy, pipe.w, 2);
    g.fillStyle(0x5CADD5, 0.45);
    const mx = pipe.dir > 0 ? pipe.x + pipe.w - 5 : pipe.x + 1;
    g.fillRect(mx + sx, pipe.y + pipe.h + sy, 4, arena.floorY - pipe.y - pipe.h);
  }

  /**
   * VOLT MAN'S SPEAKERS — the beat, drawn. Visual only, so they are painted
   * before everything that matters and never tested against anything.
   *
   * The membrane is the whole point: a cone that jumps on the beat and settles
   * over about a quarter of a second reads as a speaker hitting a bass note,
   * where a light that simply blinks would read as another warning lamp in a
   * room that already has eight of them. It is drawn as concentric rings
   * because a filled circle changing size by two pixels is not visible at this
   * resolution and a ring moving outward is.
   */
  for (const sp of arena.speakers) {
    const x = sp.x + sx, y = sp.y + sy;
    g.fillStyle(0x1B2029, 1);
    g.fillRect(x, y, sp.w, sp.h);
    g.lineStyle(1, 0x39404E, 1);
    g.strokeRect(x + 0.5, y + 0.5, sp.w - 1, sp.h - 1);
    // The pulse decays from the beat rather than blinking on it.
    const p = Math.max(0, 1 - arena.beat / 16);
    const cx = x + sp.w / 2, cy = y + sp.h * 0.62, r = sp.w * 0.34;
    g.fillStyle(0x2A313C, 1);
    g.fillCircle(cx, cy, r + 2);
    g.lineStyle(1, 0x4B5563, 1);
    g.strokeCircle(cx, cy, r + 2);
    g.fillStyle(0x39404E, 1);
    g.fillCircle(cx, cy, r * (0.62 + 0.38 * p));
    g.fillStyle(0xF5D328, 0.15 + 0.5 * p);
    g.fillCircle(cx, cy, r * 0.3 * (0.5 + p));
    // The port above the cone, so the cabinet does not read as one flat panel.
    g.fillStyle(0x121820, 1);
    g.fillRect(x + 3, y + 4, sp.w - 6, Math.max(3, sp.h * 0.22));
  }

  // Volt Man's floor panels. THREE states and all three have to read at a
  // glance: inert, lamp-warned, and live. The warning is the whole fairness of
  // the hazard, so it is the brightest thing on an unlit panel.
  for (const p of arena.panels) {
    const discharging = p.live > 0 && p.live > p.liveMax - (p.discharge || 0);
    g.fillStyle(p.live > 0 ? 0xF5D328 : 0x232B36, 1);
    g.fillRect(p.x + sx, p.y + sy, p.w - 1, p.h);
    if (discharging) {
      /**
       * THE DISCHARGE IS A MOMENT, not the whole live window — "visually
       * discharging before immediately going inert". It is the part that
       * flinches you, so it has to look different from the current that
       * lingers afterwards: a full-height crackle rather than a lit strip.
       */
      g.fillStyle(0xFFFFFF, 0.95);
      for (let k = 0; k < 5; k++) {
        const bx = p.x + 2 + Math.random() * (p.w - 5);
        g.fillRect(Math.round(bx) + sx, p.y - 8 + sy, 2, 9);
      }
    } else if (p.live > 0) {
      g.fillStyle(0xFFF6C0, 0.8);
      g.fillRect(p.x + sx, p.y - 2 + sy, p.w - 1, 2);
    } else if (p.tell > 0) {
      // "A BLINKING RED AND YELLOW LIGHT." Two colours alternating is a
      // hazard lamp; one steady colour is decoration. The blink is what makes
      // it read as a warning from across the room.
      g.fillStyle(Math.floor(p.tell / 5) % 2 ? 0xE11416 : 0xF5D328, 0.95);
      g.fillRect(p.x + p.w / 2 - 2 + sx, p.y - 3 + sy, 4, 3);
    }
  }

  // ...and the conductors above them. Inert between arcs, per the tracker, so
  // the bolt is drawn only while `arc` is counting down.
  for (const c of arena.conductors) {
    // The CABLE, at every layer — a layer-1 room shows the wiring that is
    // going to matter later without a live thing hanging off it. A long run
    // wall to wall, with a lit top edge so it reads as a cable in front of the
    // backdrop rather than as a crack in it.
    g.fillStyle(0x39404E, 1);
    g.fillRect(arena.x0 + sx, c.cableY + sy, arena.x1 - arena.x0, 2);
    g.fillStyle(0x4B5563, 0.7);
    g.fillRect(arena.x0 + sx, c.cableY + sy, arena.x1 - arena.x0, 1);
    // The drop from the cable down to whatever hangs off it.
    g.fillStyle(0x39404E, 1);
    g.fillRect(c.x + c.w / 2 - 1 + sx, c.cableY + sy, 2, (c.y - c.cableY) + 1);
    if (!c.live) continue;
    // The exposed conductor and everything it does, from layer 2.
    g.fillStyle(0x4B5563, 1);
    g.fillRect(c.x + sx, c.y + sy, c.w, c.h);
    /**
     * THE ELECTRIFIED TIP. Idle it sparks now and then, which is what says a
     * live wire is hanging there at all; during the wind-up it sparks hard and
     * in the bolt's own purple, which is "the two power lines sparkle for 1s
     * then discharge". The colour change is the tell — the rate alone would be
     * a difference you only notice in hindsight.
     */
    const winding = c.tell > 0;
    if (Math.random() < (winding ? 0.9 : 0.25)) {
      g.fillStyle(winding ? 0xC9A2FF : 0xFFF6C0, winding ? 0.95 : 0.7);
      const sw = winding ? 2 : 1;
      g.fillRect(c.x + 1 + Math.floor(Math.random() * (c.w - 2)) + sx,
        c.y + c.h - 1 + sy, sw, sw);
    }
    if (winding) {
      g.fillStyle(0x9B4DFF, 0.5 + 0.4 * Math.random());
      g.fillRect(c.x + c.w / 2 - 1 + sx, c.y + c.h + sy, 2, 3 + (Math.random() * 3 | 0));
    }
    // The bolt itself is NOT drawn here — see drawArenaBolts.
  }

  // Strike Man's ceiling rails. The bags riding them are hazard entities and
  // are drawn with the rest of those below.
  for (const rail of arena.rails || []) {
    g.fillStyle(0x2A323C, 1);
    g.fillRect(sx, rail.y + sy, viewW, 1);
  }

  // Terrain attributes: a translucent wash that fades as the attribute subsides,
  // plus a brighter 1px cap on the surface itself.
  //
  // The cap is what makes a SMALL patch fair. Patches are now sized to whatever
  // made them — a 6px fireball leaves a 6px mark — and a 6px wash at fading alpha
  // is easy to miss while platforming. The cap keeps the EDGES of the hot ground
  // legible right up to the moment it expires, so you can always see exactly
  // where it stops.
  for (const p of arena.patches) {
    const tint = Attr.ATTR[p.id]?.tint ?? 0xffffff;
    const a = Attr.patchAlpha(p);
    g.fillStyle(tint, a);
    g.fillRect(p.x + sx, p.y + sy, p.w, p.h);
    g.fillStyle(tint, Math.min(1, a * 2.2));
    g.fillRect(p.x + sx, p.y + sy, p.w, 1);
  }

  // RAIN. Drawn from `rainDir`, which is the same number that drives the push
  // on the player — so what you see leaning on you is what is leaning on you.
  // Without this the lightning telegraphs a change to something invisible,
  // which is the same as no telegraph at all.
  if (arena.rainDir !== null) {
    const rx = arena.rainDir;
    const len = 7;
    g.lineStyle(1, 0x9AD8F0, 0.35);
    // A fixed lattice scrolled by the clock rather than particles: the streaks
    // have to be dense enough to read as heavy rain, and 60 tracked objects
    // per frame for something purely decorative is not a trade worth making.
    for (let i = 0; i < 34; i++) {
      const seed = i * 61.7;
      const span = viewW + 60;
      const fall = (arena.t * 3.4 + seed * 7) % (arena.floorY + 20);
      const x = ((seed * 13) % span) - 30 + rx * fall * 0.8;
      g.lineBetween(x + sx, fall - 20 + sy, x + rx * len + sx, fall - 20 + len + sy);
    }
  }

  // Liquid last, so it covers the floor furniture it is supposed to submerge.
  const q = arena.liquid;
  if (q && q.h > 0.5) {
    const top = arena.floorY - q.h;
    const body = q.kind === 'lava' ? 0xC0300C : 0x14508A;
    const skin = q.kind === 'lava' ? 0xFF9A2E : 0x5CADD5;
    g.fillStyle(body, q.kind === 'lava' ? 1 : 0.55);
    g.fillRect(sx, top + sy, viewW, arena.floorY - top + 2);
    g.fillStyle(skin, 0.9);
    g.fillRect(sx, top + sy, viewW, 1);
  }
}

/**
 * Loose objects a hazard loop has put in the room.
 *
 * Drawn AFTER the liquid, not inside drawArena, because a barrel floats on the
 * water rather than under it — and a spike ball you cannot see through the
 * surface is a spike ball you walk into.
 */
export function drawHazards(g, arena, shake) {
  const sx = shake?.x || 0, sy = shake?.y || 0;
  for (const h of arena.hazards) {
    const x = h.x + sx, y = h.y + sy;
    if (h.kind === 'rock') {
      // A hot core with a darker crust, so it reads as burning debris rather
      // than as another grey projectile.
      g.fillStyle(0x3A1A10, 1); g.fillRect(x, y, h.w, h.h);
      g.fillStyle(0xE8541A, 1); g.fillRect(x + 2, y + 2, h.w - 4, h.h - 4);
      g.fillStyle(0xFFC24A, 1); g.fillRect(x + 4, y + 4, h.w - 8, h.h - 8);
    } else if (h.kind === 'barrel') {
      g.fillStyle(0x5C4033, 1); g.fillRect(x, y, h.w, h.h);
      g.fillStyle(0x8A6244, 1); g.fillRect(x + 1, y + 2, h.w - 2, 2);
      g.fillRect(x + 1, y + h.h - 4, h.w - 2, 2);
      g.fillStyle(0x2E2018, 1); g.fillRect(x, y, h.w, 1);
    } else if (h.kind === 'spikeball') {
      const r = h.w / 2, cxx = x + r, cyy = y + r;
      g.fillStyle(0x9AA4B4, 1); g.fillCircle(cxx, cyy, r);
      g.fillStyle(0xD8DEE8, 1);
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * Math.PI * 2 + (h.spin || 0);
        g.fillRect(cxx + Math.cos(th) * r - 1, cyy + Math.sin(th) * r - 1, 2, 2);
      }
    } else if (h.kind === 'bag') {
      // A weighted bag on a rail: the strap up to the rail is what makes the
      // path readable before the bag arrives. A lifted bag has left its rail,
      // so it has no strap to draw.
      if (h.mode !== 'psi' && h.mode !== 'psiSlam') {
        g.fillStyle(0x2A323C, 1);
        g.fillRect(x + h.w / 2 - 1, (h.railY || 0) + sy, 2, y - (h.railY || 0));
      }
      g.fillStyle(0x7C2D12, 1); g.fillRect(x, y, h.w, h.h);
      g.fillStyle(0xEA6A34, 1); g.fillRect(x + 1, y + 3, h.w - 2, 2);
      g.fillStyle(0x3A1A10, 1); g.fillRect(x, y + h.h - 2, h.w, 2);
      /**
       * THE PURPLE OUTLINE — "gain a purple outline". It is the only thing
       * saying this bag is now yours rather than his, and it has to survive the
       * bag being the same brown it always was, so it is a ring rather than a
       * tint. A second, dimmer ring outside it reads as the lift's own glow at
       * a resolution with no blur.
       */
      if (h.outline) {
        g.lineStyle(1, h.outline, 0.45);
        g.strokeRect(x - 1.5, y - 1.5, h.w + 3, h.h + 3);
        g.lineStyle(1, h.outline, 1);
        g.strokeRect(x - 0.5, y - 0.5, h.w + 1, h.h + 1);
      }
      /**
       * ABOUT TO BE PUNCHED. The player has been standing here long enough that
       * the boss will hit it the moment he is beside it, and the top edge
       * flashing is the whole warning — a hazard that punishes you with no tell
       * is a hazard you learn by dying to, and this one is punishing you for
       * doing something clever.
       */
      if (h.warn && Math.floor((h.stood || 0) / 5) % 2 === 0) {
        g.fillStyle(0xF5D328, 0.9);
        g.fillRect(x, y - 2, h.w, 2);
      }
    }
  }
}

/**
 * Placeholder backdrops, one per themed boss. These are shapes, not art — the
 * point is that each room is recognisable at a glance before any PNG exists.
 * Real art replaces them via MANIFEST key `background:<bossId>`.
 */
function drawBackdrop(g, arena, viewW, sx, sy) {
  const id = arena.theme.id;
  if (id === 'core') {
    // "Background shall be of various size metal gears"
    g.fillStyle(0x2a2f38, 1);
    const gears = [[60, 60, 22], [150, 38, 14], [250, 66, 28], [340, 44, 18], [430, 72, 12]];
    for (const [gx, gy, r] of gears) {
      if (gx > viewW + r) continue;
      g.fillCircle(gx + sx * 0.4, gy + sy * 0.4, r);
      g.fillStyle(0x1e222a, 1);
      g.fillCircle(gx + sx * 0.4, gy + sy * 0.4, r * 0.45);
      g.fillStyle(0x2a2f38, 1);
    }
  } else if (id === 'blaze') {
    // "Silhouette of a faintly glowing active volcano", whose glow EBBS
    // rapidly as the layer-3 flood builds — the tracker's own tell, and the
    // only warning that arrives before the shake.
    const bx = viewW * 0.5, base = arena.floorY;
    g.fillStyle(0x2A1410, 1);
    g.fillTriangle(bx - 96 + sx * 0.3, base + sy * 0.3, bx + 96 + sx * 0.3, base + sy * 0.3, bx + sx * 0.3, 52 + sy * 0.3);
    g.fillStyle(0x8A2A10, 0.4 + 0.6 * arena.ebb);
    g.fillTriangle(bx - 16 + sx * 0.3, 66 + sy * 0.3, bx + 16 + sx * 0.3, 66 + sy * 0.3, bx + sx * 0.3, 50 + sy * 0.3);
    if (arena.ebb > 0.02) {
      g.fillStyle(0xE8541A, 0.28 * arena.ebb);
      g.fillRect(0, 0, viewW, arena.floorY);
    }
  } else if (id === 'torrent') {
    // "Dark cloudy skies. Bolts of lightning and screen flashes telegraph the
    // heavy rain direction changes." The clouds are static banks; the bolt is
    // drawn only while a flash is running, so the two always agree.
    g.fillStyle(0x101A2C, 1);
    g.fillRect(0, 0, viewW, arena.floorY);
    g.fillStyle(0x1A2740, 1);
    for (const [cxf, cy, w, h] of [[0.18, 30, 96, 16], [0.55, 46, 130, 20], [0.86, 26, 80, 14]]) {
      const cxp = viewW * cxf + sx * 0.25;
      g.fillRect(cxp - w / 2, cy + sy * 0.25, w, h);
      g.fillRect(cxp - w / 3, cy - 6 + sy * 0.25, (w * 2) / 3, 8);
    }
    if (arena.flash > 0) {
      let bx = viewW * (arena.boltX ?? 0.5);
      g.fillStyle(0xBFD8FF, 0.9);
      for (let y = 20; y < 90; y += 5) {
        bx += (Math.random() - 0.5) * 7;
        g.fillRect(Math.round(bx), y, 2, 5);
      }
    }
  } else if (id === 'volt') {
    /**
     * "A very large plasma lamp in the background with OCCASIONALLY CHANGING
     * lightning lines."
     *
     * The tendrils used to be re-randomised every frame, which reads as static
     * rather than as lightning. They now hold a shape for a beat and then jump
     * to a new one — `arena.t` quantised is the seed, so the pattern is stable
     * between changes and the change itself is the event you notice.
     */
    const gx = viewW * 0.5, gy = 78, r = 34;
    const bolt = Math.floor(arena.t / VOLT_LAMP_HOLD);
    g.fillStyle(0x1A1030, 1);
    g.fillCircle(gx + sx * 0.25, gy + sy * 0.25, r);
    g.fillStyle(0x5B21B6, 0.55);
    g.fillCircle(gx + sx * 0.25, gy + sy * 0.25, r * 0.35);
    g.fillStyle(0xF5D328, 0.5);
    for (let i = 0; i < 6; i++) {
      // Deterministic per (tendril, hold) so the line is steady until the hold
      // expires. Sine of a large multiple is a cheap stable hash.
      const wob = (n) => Math.sin((bolt * 7.3 + i * 11.7 + n * 3.1) * 12.9898) * 3;
      const th = (i / 6) * Math.PI * 2 + Math.sin(bolt + i * 2.3) * 0.5;
      let px = gx + sx * 0.25, py = gy + sy * 0.25;
      for (let k = 0; k < 6; k++) {
        px += Math.cos(th) * (r / 6) + wob(k);
        py += Math.sin(th) * (r / 6) + wob(k + 20);
        g.fillRect(Math.round(px), Math.round(py), 2, 2);
      }
    }
    g.fillStyle(0xFFF6C0, 0.9);
    g.fillCircle(gx + sx * 0.25, gy + sy * 0.25, 4);
  } else if (id === 'strike') {
    // "Chain-link cage walls, a stained mat floor, and a background of hanging
    // lamps." The chain link is a coarse diagonal lattice — enough to read as
    // mesh at 224px without turning into moire.
    g.fillStyle(0x141018, 1);
    g.fillRect(0, 0, viewW, arena.floorY);
    g.fillStyle(0x2A2430, 1);
    for (let x = -arena.floorY; x < viewW; x += 12) {
      for (let k = 0; k < arena.floorY; k += 6) {
        g.fillRect(x + k + sx * 0.2, k + sy * 0.2, 2, 2);
        g.fillRect(x + arena.floorY - k + sx * 0.2, k + sy * 0.2, 2, 2);
      }
    }
    for (const f of [0.22, 0.5, 0.78]) {
      const lx = Math.round(viewW * f) + sx * 0.25;
      g.fillStyle(0x2A323C, 1);
      g.fillRect(lx - 1, 0, 2, 22);
      g.fillStyle(0xEA6A34, 0.75);
      g.fillCircle(lx, 26, 6);
      g.fillStyle(0xFFD08A, 0.5);
      g.fillCircle(lx, 26, 3);
    }
  }
}
