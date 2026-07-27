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
 * Real art, once it exists. Empty today — every lookup falls through to a
 * placeholder, which is exactly how the game is meant to run until art lands.
 */
export const MANIFEST = {};

export const hasArt = (id) => Object.prototype.hasOwnProperty.call(MANIFEST, id);

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
        frameRate: def.fps ?? 8,
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
  constructor(scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0);
    this.g = scene.add.graphics();
    this.root.add(this.g);
    this.pools = new Map();   // manifest id -> Sprite[]
    this.cursor = new Map();  // manifest id -> how many used this frame
  }

  begin() {
    this.g.clear();
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
  g.fillStyle(hexNum(palette.primary), 1);
  g.fillRect(x, y, w, h);

  // accent band across the upper third — reads as a "head" and shows which
  // colour is the secondary without needing real art
  g.fillStyle(hexNum(palette.secondary), 1);
  g.fillRect(x, y, w, Math.max(2, Math.round(h * 0.28)));

  g.lineStyle(1, hexNum(palette.outline || '#0A0A12'), 1);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
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

/** Sprite footprint for an actor id, falling back to its collision size. */
export function spriteSize(id, fallbackW, fallbackH) {
  const def = MANIFEST[id];
  if (def?.frameW) return { w: def.frameW, h: def.frameH };
  if (id === 'player') return { w: PLAYER_SPRITE_W, h: PLAYER_SPRITE_H };
  return { w: fallbackW, h: fallbackH };
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
