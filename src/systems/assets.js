/**
 * ASSETS — placeholder / sprite abstraction.
 *
 * THE POINT OF THIS FILE
 * ----------------------
 * Every drawable actor resolves at draw time to EITHER a procedural placeholder
 * shape OR real pixel art, depending on whether MANIFEST has an entry for it.
 *
 * So "I finally drew Blaze Man" is a two-step change with no code edits:
 *   1. drop  public/sprites/blaze.png  into the project
 *   2. add   blaze: { file: 'blaze.png', frameW: 42, frameH: 42 }  to MANIFEST
 *
 * Everything else — hitboxes, physics, AI, spawning — is unaffected, because
 * none of it ever touches the art. Art can land per actor, in any order, over
 * months, and the game stays playable the whole time.
 *
 * MANIFEST KEYS — the naming convention
 * -------------------------------------
 *   player            the player
 *   <bossId>          a boss, e.g. 'blaze'      (see data/bosses.js)
 *   <minionId>        a minion, e.g. 'scrapper' (see data/minions.js)
 *   shot:<weaponId>   a projectile, e.g. 'shot:buster', 'shot:blaze_wheel'
 *   pickup:etank      the E-Tank drop
 *   pickup:exp        the EXP drop
 *   background        the scrolling backdrop
 *
 * ENTRY SHAPES
 * ------------
 *   static image      { file: 'x.png' }
 *   spritesheet       { file: 'x.png', frameW: 24, frameH: 24,
 *                       anims: { idle: [0], run: [1,2,3,4] }, fps: 10 }
 *
 * Optional on any entry:
 *   anchor  'bottom' (default) puts the sprite's feet on the collision box's
 *           bottom edge; 'center' centres it. Projectiles and pickups want
 *           'center', anything that stands on ground wants 'bottom'.
 *   offX/offY   pixel nudge, for art whose visual centre is not its bounding
 *           box centre.
 *   parallax    background only: 0 = fixed, 1 = locked to the world.
 *   tintable    apply the actor's primary colour as a Phaser tint. Only useful
 *           for art authored as a white/greyscale mask — see the palette note
 *           at the bottom of this file.
 *
 * SPRITE BOX vs COLLISION BOX
 * ---------------------------
 * These are deliberately different sizes. MANIFEST only ever describes the
 * SPRITE; collision comes from config/feel.js and from each actor's own w/h.
 * Art is drawn at its native size and aligned to the collision box — it is
 * never stretched to fit one. Keeping them separate is what makes hits feel
 * precise-but-fair; see the hitbox note in feel.js.
 *
 * WHY BOSSES ARE STILL RECTANGLES
 * -------------------------------
 * A boss's silhouette should follow from its attacks and its arena, and those
 * are not designed yet for most of the 17. Drawing shapes now would mean
 * designing blind and redoing the work, so bosses stay honest rectangles at
 * their true collision footprint until their fight exists.
 */

import { PLAYER_SPRITE_W, PLAYER_SPRITE_H } from '../config/display.js';

/**
 * Real art. Anything not listed here falls through to a placeholder, which is
 * exactly how the game is meant to run for every actor whose art has not landed.
 *
 * THE JUMP IS THREE ONE-FRAME CLIPS, NOT ONE THREE-FRAME CLIP. The sheet's
 * frames 8/9/10 are rise, apex and fall — poses, not an animation. Registered
 * as a single `jump: [8, 9, 10]` clip they would cycle rise→apex→fall→rise at
 * 12fps for the whole jump, so the pose would contradict the arc roughly two
 * thirds of the time. Split, GameScene picks the one that matches `vy` and the
 * art actually reads. The frame indices are unchanged from the handoff sheet.
 */
export const MANIFEST = {
  player: {
    file: 'player.png', frameW: 24, frameH: 24, anchor: 'bottom',
    anims: {
      idle: [0, 1],
      run: [2, 3, 4, 5, 6, 7],
      jumpRise: [8],
      jumpApex: [9],
      jumpFall: [10],
      slide: [11],
    },
    fps: 12,
    // The idle is a BREATH, not a cycle — two frames a second apart, not six a
    // second. See the per-clip rate note in createAnims.
    animFps: { idle: 1.5 },
    // NOT tintable. The three colours are baked into the sheet; a Phaser tint
    // multiplies the whole texture and would wreck it. See the palette note at
    // the bottom of this file.
  },
};

export const hasArt = (id) => Object.prototype.hasOwnProperty.call(MANIFEST, id);

/**
 * Which frame of the player sheet matches what he is actually doing.
 *
 * THE JUMP IS THREE POSES, NOT A LOOP. Frames 8/9/10 are rise, apex and fall;
 * registered as one animation they would cycle through all three at 12fps for
 * the whole jump, so the pose would contradict the arc most of the time. Read
 * from `vy` instead and the art tells you where you are in the jump — which is
 * information the player can use, in a game where jump height is variable and
 * the double jump hangs before it launches.
 *
 * The apex band is deliberately wider than a single frame of hang: at the top
 * of an arc `vy` crawls through zero, and a one-frame window there would flick
 * between rise and fall instead of settling.
 */
const APEX_BAND = 1.2;
export function playerClip(p) {
  if (p.sliding) return 'slide';
  if (!p.onGround) {
    // The double jump's hang freezes vy outright, and that pause IS an apex.
    if (p.djPause > 0 || Math.abs(p.vy) < APEX_BAND) return 'jumpApex';
    return p.vy < 0 ? 'jumpRise' : 'jumpFall';
  }
  return p.vx !== 0 ? 'run' : 'idle';
}


/** '#RRGGBB' -> 0xRRGGBB */
export const hexNum = (s) => parseInt(String(s).replace('#', ''), 16);

// ── Loading ───────────────────────────────────────────────────────────

/**
 * Queue every declared asset. An entry with frameW/frameH loads as a
 * spritesheet, anything else as a single image. No-op while MANIFEST is empty.
 */
export function preloadArt(scene) {
  for (const [id, def] of Object.entries(MANIFEST)) {
    if (def.frameW && def.frameH) {
      scene.load.spritesheet(id, `sprites/${def.file}`, {
        frameWidth: def.frameW,
        frameHeight: def.frameH,
      });
    } else {
      scene.load.image(id, `sprites/${def.file}`);
    }
  }
}

/**
 * Register every declared animation. Call once after the loader finishes;
 * animations live on the global anim manager, so scene restarts reuse them.
 * Keys are `<manifestId>:<animName>`.
 */
export function createAnims(scene) {
  for (const [id, def] of Object.entries(MANIFEST)) {
    if (!def.anims) continue;
    for (const [name, frames] of Object.entries(def.anims)) {
      const key = `${id}:${name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: frames.map((f) => ({ key: id, frame: f })),
        // PER-CLIP RATE, falling back to the sheet's. One rate for a whole
        // sheet cannot serve both a six-frame run and a two-frame breath: at
        // the run's 12fps the idle blinks six times a second.
        frameRate: def.animFps?.[name] ?? def.fps ?? 8,
        repeat: def.repeat ?? -1,
      });
    }
  }
}

// ── The draw layer ────────────────────────────────────────────────────

/**
 * A depth band that can draw BOTH placeholder shapes and real sprites.
 *
 * Phaser Graphics cannot draw textures, so art needs real Sprite objects. Mixing
 * the two naively breaks draw order: sprites are added to the scene display list
 * and would sit on top of every placeholder regardless of what they are. So each
 * layer owns a Container holding its own Graphics plus its own sprite pool, and
 * layers are constructed in back-to-front order. Depth then falls out of
 * construction order and stays correct however much art exists.
 *
 * Sprites are pooled per manifest id and reused across frames — a bullet-heavy
 * frame must not allocate. Usage per frame is begin() -> draw()... -> end().
 */
export class ActorLayer {
  constructor(scene, depth = 0) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    this.root.setDepth?.(depth);
    this.depth = depth;
    this.g = scene.add.graphics();
    this.root.add(this.g);
    /**
     * A SECOND GRAPHICS THAT STAYS ABOVE THIS LAYER'S SPRITES.
     *
     * Sprites are added to the container after `g`, so within one layer every
     * sprite draws on top of every shape. That was invisible while nothing had
     * art and became a real problem the moment the player did: the status
     * flash, the Astral Cloak's shroud and every piece of worn hardware are
     * shapes drawn on the player's own layer, and all of them silently went
     * behind him.
     *
     * Anything that must sit ON an actor rather than behind it goes here.
     */
    this.gOver = scene.add.graphics();
    this.root.add(this.gOver);
    this.pools = new Map();   // manifest id -> Sprite[]
    this.cursor = new Map();  // manifest id -> how many used this frame
  }

  begin() {
    this.g.clear();
    this.gOver.clear();
    this.cursor.clear();
  }

  /**
   * Draw one actor. `fallback(g, actor)` renders the placeholder when the actor
   * has no art; it defaults to the standard rectangle.
   *
   * The actor's x/y/w/h are its COLLISION box in screen space. Art is placed
   * relative to that box at its own native size, never scaled to match it.
   */
  draw(actor, fallback = drawPlaceholder) {
    const def = MANIFEST[actor.id];
    if (!def) { fallback(this.g, actor); return null; }

    const s = this.acquire(actor.id, def);
    const cx = actor.x + actor.w / 2 + (def.offX || 0);
    const bottom = actor.y + actor.h + (def.offY || 0);
    const cy = actor.y + actor.h / 2 + (def.offY || 0);
    s.setPosition(Math.round(cx), Math.round(def.anchor === 'center' ? cy : bottom));

    if (actor.facing) s.setFlipX(actor.facing < 0);
    if (def.tintable && actor.palette?.primary) s.setTint(hexNum(actor.palette.primary));

    if (def.anims && actor.clip) {
      const key = `${actor.id}:${actor.clip}`;
      if (this.scene.anims.exists(key) && s.anims?.getName() !== key) s.play(key, true);
    }
    return s;
  }

  /** Background helper: a TileSprite that scrolls at the entry's parallax rate. */
  drawBackground(viewW, viewH, camX, fallbackColor) {
    const def = MANIFEST.background;
    if (!def) {
      this.g.fillStyle(fallbackColor, 1);
      this.g.fillRect(0, 0, viewW, viewH);
      return;
    }
    if (!this.bg) {
      this.bg = this.scene.add.tileSprite(0, 0, viewW, viewH, 'background').setOrigin(0);
      this.root.add(this.bg);
    }
    this.bg.tilePositionX = camX * (def.parallax ?? 0.5);
  }

  acquire(id, def) {
    let arr = this.pools.get(id);
    if (!arr) { arr = []; this.pools.set(id, arr); }
    const i = this.cursor.get(id) || 0;
    this.cursor.set(id, i + 1);

    if (i < arr.length) {
      arr[i].setVisible(true);
      return arr[i];
    }
    const s = def.frameW && def.frameH
      ? this.scene.add.sprite(0, 0, id)
      : this.scene.add.image(0, 0, id);
    s.setOrigin(0.5, def.anchor === 'center' ? 0.5 : 1);
    this.root.add(s);
    // The pool only grows, so this runs a handful of times per layer per run —
    // and it is the one place a new sprite could get above the overlay.
    this.root.bringToTop?.(this.gOver);
    arr.push(s);
    return s;
  }

  /** Hide pooled sprites that were not claimed this frame. */
  end() {
    for (const [id, arr] of this.pools) {
      for (let i = this.cursor.get(id) || 0; i < arr.length; i++) arr[i].setVisible(false);
    }
  }
}

// ── Placeholders ──────────────────────────────────────────────────────

/**
 * Placeholder: a filled rect in the actor's primary colour, a secondary band
 * to hint at an accent, and the shared near-black outline.
 *
 * The outline is not decoration — it is the third colour of the 3-colour NES
 * palette and it is what stops a dark actor dissolving into the dark background.
 */
export function drawPlaceholder(g, actor) {
  const { x, y, w, h, palette } = actor;

  // A null colour means "transparent cell", not black — a NULL_WEAPON actor
  // renders as a bare silhouette: no body fill, no accent, just the outline.
  // Art will express the same thing with alpha.
  if (palette.primary) {
    g.fillStyle(hexNum(palette.primary), 1);
    g.fillRect(x, y, w, h);
  }
  if (palette.secondary) {
    // accent band across the upper third — reads as a "head" and shows which
    // colour is the secondary without needing real art
    g.fillStyle(hexNum(palette.secondary), 1);
    g.fillRect(x, y, w, Math.max(2, Math.round(h * 0.28)));
  }

  g.lineStyle(1, hexNum(palette.outline || '#0A0A12'), 1);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/**
 * BOSS RIGS — hardware bolted onto a boss's placeholder rectangle.
 *
 * This is NOT a silhouette and it is not a step toward one. Bosses stay honest
 * rectangles at their true collision footprint until the owner draws them; a rig
 * is a piece of hardware whose ORIENTATION is game state the player has to read.
 * Tempest Man's jetpack is the only one so far, and it exists because his
 * exhaust plume pushes you and eats your shots — a force with no visible source
 * would just be the room shoving you at random.
 *
 * The nozzles point exactly where the plume points (`boss.jet`, set by his
 * attack loop), so the picture and the physics cannot disagree. When real art
 * lands via MANIFEST this goes away with it.
 */
export function drawBossRig(g, boss, screenX) {
  if (boss.rig !== 'jetpack') return;
  /**
   * THE PACK IS ALWAYS ON; THE PLUME IS NOT.
   *
   * It used to draw nothing at all without `boss.jet`, which his attack loop
   * sets — so the pack blinked into existence when he started thrusting and
   * vanished during his walk-on. A jetpack you only see mid-dive is not a
   * jetpack, it is an effect. Hardware is hardware: it hangs on his back
   * whatever he is doing, and only the exhaust is state.
   *
   * Hanging straight down is the resting orientation, which is also the one
   * that holds him up when he hovers.
   */
  const jet = boss.jet || { dx: 0, dy: 1, len: 0 };
  const cx = screenX + boss.w / 2;
  const cy = boss.y + boss.h * 0.5;

  // The pack sits on his back — the side away from the plume.
  const px = cx - jet.dx * (boss.w * 0.35);
  const py = cy - jet.dy * (boss.h * 0.3);

  /**
   * "A LARGE grey hydro jet pack." Sized against his body rather than fixed, so
   * it stays large if his `scale` moves again — it just went 1.75x to 1.5x, and
   * a pack in absolute pixels would have quietly become a bigger share of a
   * smaller boss.
   */
  const pw = Math.max(8, Math.round(boss.w * 0.52));
  const ph = Math.max(10, Math.round(boss.h * 0.46));
  g.fillStyle(0x6B7686, 1);
  g.fillRect(Math.round(px - pw / 2), Math.round(py - ph / 2), pw, ph);
  // A darker band and a lighter tank highlight, so it reads as a machine
  // rather than as a grey rectangle stuck to him.
  g.fillStyle(0x39404E, 1);
  g.fillRect(Math.round(px - pw / 2) + 1, Math.round(py - ph / 2) + 2, pw - 2, 2);
  g.fillStyle(0x8D97A6, 1);
  g.fillRect(Math.round(px - pw / 2) + 1, Math.round(py - ph / 2) + 5, 2, ph - 7);

  // Two nozzles, offset perpendicular to the thrust so they read as a pair
  // whichever way the pack has swung.
  const nx = -jet.dy, ny = jet.dx;
  const spread = Math.max(3, Math.round(pw * 0.3));
  for (const side of [-spread, spread]) {
    const bx = px + nx * side, by = py + ny * side;
    g.fillStyle(0x2A323C, 1);
    g.fillRect(Math.round(bx + jet.dx * (ph / 2)) - 2, Math.round(by + jet.dy * (ph / 2)) - 2, 4, 4);
    if (jet.len <= 0) continue;              // parked: hardware only, no exhaust
    g.fillStyle(0x5CADD5, 0.5);
    for (let d = 7; d < jet.len; d += 5) {
      const w = 3 - Math.floor(d / (jet.len / 2));
      g.fillRect(Math.round(bx + jet.dx * d), Math.round(by + jet.dy * d),
        Math.max(1, w), Math.max(1, w));
    }
  }
}

/**
 * Vertical half-extent of each projectile shape, as a multiple of its radius.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Duplicator upgrade stacks echo volleys above and below the real shot, and
 * they have to sit CLOSE without overlapping. That is only possible if the
 * spacing is derived from how tall each shape actually draws — and the shapes
 * vary wildly. A 'lash' is a thin bar at 0.35r; a 'spray' is a ring of orbiting
 * blobs reaching 1.6r. Spacing them all by `radius` would leave the lash with a
 * visible gap and still overlap the spray.
 *
 * These numbers are read straight off drawProjectile() below. If you change a
 * shape's drawing, change its entry here in the same edit.
 */
export const SHAPE_HALF_H = {
  wheel: 1, stream: 0.5, spark: 1.1, lash: 0.35, shard: 1,
  punch: 1.2, spray: 1.6, wave: 1, tornado: 1.2, orb: 1,
  swarm: 1.2, rock: 0.8, wisp: 1, breath: 0.7, boomerang: 1,
  blade: 1.2, bolt: 0.5,
};

/** Drawn half-height of a projectile in px, for spacing duplicate volleys. */
export const projectileHalfHeight = (shape, radius) =>
  radius * (SHAPE_HALF_H[shape] ?? SHAPE_HALF_H.bolt);

/**
 * Placeholder projectile shapes. 17 distinguishable forms so weapons read
 * differently on screen before any art exists. b.x/b.y are the CENTRE.
 */
export function drawProjectile(g, b, frame) {
  const c = hexNum(b.color);
  const r = b.radius;
  g.fillStyle(c, 1);
  switch (b.shape) {
    case 'wheel':
      g.fillCircle(b.x, b.y, r);
      g.fillStyle(0xffcc00, 1);
      g.fillRect(b.x - r * 0.3, b.y - r * 0.3, r * 0.6, r * 0.6);
      break;
    case 'stream':
      g.fillRect(b.x - r * 2, b.y - r * 0.5, r * 4, r);
      break;
    case 'spark':
      for (let i = 0; i < 3; i++) {
        g.fillRect(b.x - r + i * r, b.y + (i % 2 ? -r : r) * 0.6, r, r * 0.5);
      }
      break;
    case 'lash':
      g.fillRect(b.x - r * 2, b.y - r * 0.35, r * 4, r * 0.7);
      break;
    case 'shard':
      g.fillTriangle(b.x + r, b.y, b.x - r, b.y - r, b.x - r, b.y + r);
      break;
    case 'punch':
      g.fillCircle(b.x, b.y, r * 1.2);
      break;
    case 'spray':
      for (let i = 0; i < 3; i++) {
        const a = frame * 0.1 + i * 2.1;
        g.fillCircle(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, r * 0.6);
      }
      break;
    case 'wave':
      g.fillRect(b.x - r * 1.5, b.y - r * 0.4, r * 3, r * 0.8);
      g.fillRect(b.x - r * 0.8, b.y - r, r * 1.6, r * 2);
      break;
    case 'tornado':
      g.fillEllipse(b.x, b.y, r * 1.2, r * 2.4);
      break;
    case 'orb':
      g.fillCircle(b.x, b.y, r);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(b.x - r * 0.3, b.y - r * 0.3, r * 0.35);
      break;
    case 'swarm':
      for (let i = 0; i < 4; i++) {
        const a = frame * 0.4 + i * 1.6;
        g.fillRect(b.x + Math.cos(a) * r - 1, b.y + Math.sin(a) * r - 1, 2, 2);
      }
      break;
    case 'rock':
      g.fillRect(b.x - r, b.y - r * 0.8, r * 2, r * 1.6);
      break;
    case 'wisp':
      for (let i = 0; i < 3; i++) {
        g.fillStyle(c, 1 - i * 0.3);
        g.fillCircle(b.x - i * r * 0.7, b.y, r * (1 - i * 0.22));
      }
      break;
    case 'breath':
      g.fillTriangle(b.x - r * 1.4, b.y - r * 0.7, b.x + r * 1.2, b.y, b.x - r * 1.4, b.y + r * 0.7);
      break;
    case 'boomerang':
      g.fillRect(b.x - r, b.y - r * 0.3, r * 2, r * 0.6);
      g.fillRect(b.x - r * 0.3, b.y - r, r * 0.6, r * 2);
      break;
    case 'blade':
      g.fillRect(b.x - r * 1.2, b.y - r * 0.25, r * 2.4, r * 0.5);
      g.fillRect(b.x - r * 0.25, b.y - r * 1.2, r * 0.5, r * 2.4);
      break;
    default: // 'bolt'
      g.fillRect(b.x - r, b.y - r * 0.5, r * 2, r);
  }
}

/** Pickups: a bright core in a dark shell so they read against any terrain. */
export function drawPickup(g, p, style, frame) {
  const bob = Math.sin(frame * 0.12 + p.anim * 0.05) * 0.8;
  const y = p.y + bob;
  g.fillStyle(hexNum('#0A0A12'), 1);
  g.fillRect(p.x - 1, y - 1, p.w + 2, p.h + 2);
  g.fillStyle(hexNum(style.primary), 1);
  g.fillRect(p.x, y, p.w, p.h);
  g.fillStyle(hexNum(style.secondary), 1);
  // E-Tanks get a cross, EXP gets a bar — distinguishable without colour alone
  if (p.type === 'etank') {
    g.fillRect(p.x + 3, y + 1, 1, 5);
    g.fillRect(p.x + 1, y + 3, 5, 1);
  } else {
    g.fillRect(p.x + 1, y + 3, 5, 1);
  }
}

/**
 * PALETTE SWAPPING — the one gap this abstraction does not yet close.
 *
 * Equipping a weapon recolours the player live, which the placeholder does for
 * free by drawing with a different palette. Real art cannot: a Phaser tint
 * multiplies the whole texture, which would wreck a 3-colour sprite that already
 * has its own primary, secondary and outline baked in.
 *
 * The two honest options are per-weapon frames, or a palette-swap shader keyed
 * on index colours. Both need the art to exist before they can be designed
 * against it, so neither is built. `tintable` is provided for art authored as a
 * greyscale mask, which is the cheap third option if it suits the final style.
 */
