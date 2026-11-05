/**
 * npm run design:system — rebuild the design system's NUMBERS from the game's code.
 *
 * WHAT IT IS FOR. The MEGA DASH design system in Claude (the page Claude Design
 * reads before it draws anything for this game; its link is at the bottom of
 * design/DESIGN-BRIEF.md) is kept as files in design/design-system/. Its WORDS are
 * written by hand: README.md, rooms.md, weapons.md, handoff.md, every card's
 * README. Its NUMBERS are not: every colour, size and timing in tokens.json, the
 * boss list in the BossFootprints card and the player's clips in the PlayerSprite
 * card are read out of the game's own code by this program, so the page cannot
 * quietly drift away from the game.
 *
 * HOW TO USE IT.
 *   npm run design:system               rewrite those files from the code
 *   npm run design:system -- --check    change nothing; list what is out of date
 * `npm test` runs the check (tests/design-system.test.js), so changing a boss's
 * colour, a size or a HUD colour fails the tests until this has been run. Then the
 * folder is published to the design system in Claude, which Claude does with its
 * Artifact tool (each file at `project/<its path>`).
 *
 * A VALUE THAT MOVED IS AN ERROR, NOT A GUESS. Some values are written inline in
 * the code rather than exported (the pause panel's colour, a spike's height). For
 * those this reads the code's own text, and stops with the file and the value's
 * name when it can no longer find it — the same rule as tests/contrast.test.js.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { BOSSES } from '../src/data/bosses.js';
import { MINIONS, ELITE_OUTLINE } from '../src/data/minions.js';
import { WEAPONS } from '../src/data/weapons.js';
import { PICKUP_STYLE } from '../src/systems/pickups.js';
import { DEPTH, VIEW_H, SPRITE_CLASS, FIXED_DT, computeViewWidth } from '../src/config/display.js';
import { FEEL } from '../src/config/feel.js';
import { themeFor, ARENA_WARP, BEAT_LEN } from '../src/systems/arena.js';
import { maxPitWidth, maxPlatformHeight } from '../src/systems/terrain.js';
import { parse, DEFAULT_HOLD } from '../docs/sprite-fmt.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const OUT = 'design/design-system';
const text = (p) => readFileSync(join(REPO, p), 'utf8');
const hex = (v) => '#' + (typeof v === 'number' ? v.toString(16).padStart(6, '0') : v.slice(1)).toLowerCase();

/** A value written inline in the code: its text, or a stop that names where it went. */
function lit(file, re, what) {
  const m = re.exec(text(file));
  if (!m) throw new Error(`design:system: ${what} is no longer where ${file} kept it. Find it and update tools/design-system.mjs.`);
  return m.length > 2 ? m.slice(1) : m[1];
}
const n = (s) => Number(s);
const H6 = '(0x[0-9a-fA-F]{6})';

// ── Colours ───────────────────────────────────────────────────────────

function colours() {
  const C = [];
  const c = (name, value, usage) => C.push({ name, value: hex(value), usage });

  const [warn] = lit('src/systems/bossFights.js', /const CORE_SHOT = \{ color: '(#[0-9A-Fa-f]{6})', rim: '(#[0-9A-Fa-f]{6})' \}/, "Proto Mk0's shot colour (CORE_SHOT)");
  c('outline', BOSSES[0].outline, 'The near-black outline the existing art uses round characters and bullets, and the rim round a boss\'s shots. How new art is outlined is Design\'s call.');
  c('warning-red', warn, "Proto Mk0's shots and his turrets' shots, always with a one-pixel outline rim; also the bunker's alarm light and warning marks. Red is kept for warnings in his room.");
  c('elite-outline', ELITE_OUTLINE, 'Replaces outline on an elite minion. The only thing that tells an elite from its base minion.');

  // The player's sheet declares its own twelve colours; key 0 is the outline above.
  const NAMES = { 1: 'white', 2: 'mid', 3: 'light', 4: 'shadow', 5: 'deep', 6: 'joint', 7: 'jointdark', 8: 'accentlight', 9: 'accent', a: 'accentshade', b: 'accentdim' };
  for (const p of parse(text('design/sprites/player.sprite')).palette) {
    if (!NAMES[p.key]) continue;
    c(`player-${NAMES[p.key]}`, p.hex, `The player's ${p.name} (key ${p.key} in player.sprite). He is never tinted or recoloured.`);
  }

  for (const b of BOSSES) {
    c(`boss-${b.id}-primary`, b.primary, `${b.name} (${b.element}) primary: his identity colour. Build his 16-bit shades from it.`);
    c(`boss-${b.id}-secondary`, b.secondary, `${b.name} secondary: the second half of his identity.`);
  }
  for (const m of MINIONS) {
    c(`${m.id}-primary`, m.primary, `${m.name} primary. Minion colours are separate from the boss palette; each boss's own copy of ${m.name} turns its most common colour into his primary.`);
    c(`${m.id}-secondary`, m.secondary, `${m.name} secondary.`);
  }

  // The HUD and menus (src/scenes/UIScene.js).
  const UI = 'src/scenes/UIScene.js';
  c('ui-text', lit('src/systems/font.js', /ctx\.fillStyle = '(#[0-9a-fA-F]{6})'/, 'the font\'s ink'), 'HUD and menu lettering, on ui-panel, ui-pad and every room.');
  c('ui-panel', n(lit(UI, /this\.pausePanel\.add\(this\.add\.rectangle\(0, 0, this\.w, VIEW_H, (0x[0-9a-fA-F]{6})/, 'the pause panel')), 'The ground of the pause menu, the level-up cards and the exit question, laid over the game at about 90% opacity; the title screen\'s ground.');
  c('ui-pad', n(lit(UI, /mkPad\(b, glyph\) \{\s*const r = this\.add\.rectangle\(b\.x, b\.y, b\.w, b\.h, (0x[0-9a-fA-F]{6})/, "the touch pads' fill")), "The touch pads' fill, now fully see-through (17 Oct 2026); also the ground of the dev menu's pop-up.");
  c('ui-cyan', n(lit(UI, /const CYAN = (0x[0-9a-fA-F]{6})/, 'CYAN')), 'Live and aimed markers, health pips and wheel highlights. A cyan border means a module is running its weapon; a solid cyan bar across its top means the fire button is aimed at it.');
  c('ui-gold', n(lit(UI, /const GOLD = (0x[0-9a-fA-F]{6})/, 'GOLD')), 'The NEW halo on a weapon a boss just dropped, and nothing else that means new; slots that would take what you hold, and the thin border round each touch pad (at 70%).');
  c('ui-frame', n(lit(UI, /const FRAME_DARK = (0x[0-9a-fA-F]{6})/, 'FRAME_DARK')), 'A wheel module frame when that module is not running.');
  c('ui-locked', n(lit(UI, /const LOCKED_FILL = (0x[0-9a-fA-F]{6})/, 'LOCKED_FILL')), 'Fill for anything not yet available (dev mode only: a playtester never sees locked content).');
  c('ui-module', n(lit(UI, /rectangle\(s\.x, s\.y, MOD, MOD, (0x[0-9a-fA-F]{6})\)/, 'the module body')), 'Inside of a wheel module: the black square.');
  c('ui-pip-off', n(lit(UI, /i < r\.hp \? 0x[0-9a-fA-F]{6} : (0x[0-9a-fA-F]{6})/, 'the empty health pip')), 'An empty health pip. A full one is ui-cyan.');
  c('ui-icon', n(lit(UI, /function drawPadlock[\s\S]*?lineStyle\([^,]+, (0x[0-9a-fA-F]{6})/, 'the icon line colour')), 'Small drawn icons on the controls.');
  const [scrim, scrimA] = lit(UI, /this\.scrim = this\.add\.rectangle\(0, 0, w, VIEW_H, (0x[0-9a-fA-F]{6}), ([0-9.]+)\)/, 'the wheel scrim');
  c('ui-scrim', n(scrim), `The veil behind the re-quip wheel, at ${Math.round(scrimA * 100)}%.`);

  // Pickups, as the game draws them today (systems/pickups.js, assets.js drawPickup).
  c('pickup-etank-primary', PICKUP_STYLE.etank.primary, "An E-Tank's body as the game draws it today: a 7x7 square in an outline shell.");
  c('pickup-etank-secondary', PICKUP_STYLE.etank.secondary, "The cross on an E-Tank. The cross and the EXP bar tell the two apart without colour.");
  c('pickup-exp-primary', PICKUP_STYLE.exp.primary, "An EXP orb's body as the game draws it today.");
  c('pickup-exp-secondary', PICKUP_STYLE.exp.secondary, 'The bar across an EXP orb.');

  // The area between boss rooms (scenes/GameScene.js draw()).
  const GS = 'src/scenes/GameScene.js';
  c('area-ground', n(lit(GS, /const AREA_GROUND\s*=\s*(0x[0-9a-fA-F]{6})/, 'AREA_GROUND')), 'The ground you stand on between rooms. It must stand apart from every area backdrop by brightness alone, at least 2 : 1, because a pit is only the gap in it (tests/contrast.test.js).');
  c('area-cap', n(lit(GS, /const AREA_CAP\s*=\s*(0x[0-9a-fA-F]{6})/, 'AREA_CAP')), "The ground's lit top edge, ground-cap tall: the line that shows where every pit starts. At least 4.5 : 1 against every backdrop, and always in the top ten rows of the ground band, above the thumb pads.");
  c('area-platform', n(lit(GS, /const AREA_PLAT\s*=\s*(0x[0-9a-fA-F]{6})/, 'AREA_PLAT')), 'Floating platforms between rooms, read against the backdrop.');
  c('area-spike', n(lit(GS, /for \(const s of this\.world\.spikes\) \{\s*g\.fillStyle\((0x[0-9a-fA-F]{6})/, 'the spike colour')), 'Spikes between rooms: a row of silver teeth about 5 pixels wide, spike-height tall.');
  const [exit, boss, off] = lit(GS, /live \? \(d\.wrap \? (0x[0-9a-fA-F]{6}) : (0x[0-9a-fA-F]{6})\) : (0x[0-9a-fA-F]{6})/, 'the door colours');
  const halo = lit(GS, /if \(live\) \{\s*g\.fillStyle\((0x[0-9a-fA-F]{6})/, 'the door halo');
  c('door-boss', n(boss), 'A boss door that will open: door-width x door-height, standing on the floor.');
  c('door-exit', n(exit), 'The exit door that appears in a room when its boss dies: gold-cored, to read as a way out rather than a threat.');
  c('door-unarmed', n(off), "A door that will not answer yet (it appeared under the player, who has to step off it first), at 55%: no halo, no pulse.");
  c('door-halo', n(halo), 'The pulsing edge round a door that will open, two pixels wide.');
  for (const b of BOSSES) {
    c(`area-backdrop-${b.id}`, themeFor(b).fill, `The area backdrop on the way to ${b.name}'s door: his primary, heavily darkened, so you can tell who is next.`);
  }
  return C;
}

// ── Lengths, layers and timing ────────────────────────────────────────

const px = (v) => `${v}px`;
const T = (name, value, usage) => ({ name, value: String(value), usage });

function families() {
  const GS = 'src/scenes/GameScene.js', TR = 'src/systems/terrain.js';
  const ground = n(lit(GS, /const GROUND_Y = VIEW_H - (\d+)/, 'the ground depth (GROUND_Y)'));
  const padH = n(lit('src/scenes/UIScene.js', /this\.padH = (\d+)/, 'the pad height (padH)'));
  const hudBand = n(lit('src/scenes/UIScene.js', /up to y=(\d+)/, 'the HUD band (the wheel geometry note)'));
  const cap = n(lit(GS, /g\.fillStyle\(AREA_CAP, 1\);\s*g\.fillRect\(sx\(s\.x1\), sy\(GROUND_Y\), s\.x2 - s\.x1, (\d+)\)/, 'the cap height'));
  const [swMin, swMax] = lit(TR, /const sw = rand\(rng, (\d+), (\d+)\)/, 'the spike width');
  const spikeH = lit(TR, /y: world\.groundY - \d+, w: sw, h: (\d+)/, 'the spike height');
  const [pwMin, pwMax] = lit(TR, /const pw = rand\(rng, (\d+), (\d+)\)/, 'the platform width');
  const platH = lit(TR, /w: pw, h: (\d+)/, 'the platform thickness');
  const platMin = lit(TR, /const PLAT_MIN = (\d+)/, 'PLAT_MIN');
  const pitMin = lit(TR, /const PIT_MIN = (\d+)/, 'PIT_MIN');
  const [doorW, doorH] = lit(TR, /doors\.push\(\{ x, y: world\.groundY, w: (\d+), h: (\d+)/, 'the door size');
  const pickup = lit('src/systems/pickups.js', /w: (\d+), h: \d+,\s*life:/, "a pickup's box");
  const radii = [...WEAPONS.map((w) => w.radius || 0),
    ...[...text('src/systems/bossFights.js').matchAll(/radius: ([0-9.]+)/g)].map((m) => n(m[1]))];
  const hb = FEEL.playerHitbox, hs = FEEL.playerHitboxSlide;

  return {
    screen: {
      note: 'In game pixels. The picture is scaled up by a whole number on the real screen.',
      tokens: [
        T('screen-height', px(VIEW_H), `The game is always ${VIEW_H} pixels tall.`),
        T('screen-width-min', px(computeViewWidth(1, 10)), 'Narrowest screen. Check every design here.'),
        T('screen-width-max', px(computeViewWidth(10, 1)), 'Widest screen. Check every design here too.'),
        T('floor-y', px(VIEW_H - ground), 'The floor line: characters stand on it, in the area and in a boss room.'),
        T('ground-depth', px(ground), 'The ground band below the floor line. The thumb pads cover its lower part, so only its top rows are always in view.'),
        T('pads-top', px(VIEW_H - padH), `Top of the thumb pads, which cover y ${VIEW_H - padH} to ${VIEW_H}: ${padH} pixels, see-through, each with a thin ui-gold border.`),
        T('hud-band', px(hudBand), 'The top band the HUD may use. Keep anything that must be read out of it.'),
      ],
    },
    grid: {
      note: 'Drawing boxes and hit boxes, in game pixels. The drawing is never stretched to fit a hit box.',
      tokens: [
        T('grid-player', px(SPRITE_CLASS.player.w), `The player's drawing box, ${SPRITE_CLASS.player.w} by ${SPRITE_CLASS.player.h}.`),
        T('grid-minion', px(SPRITE_CLASS.minion.w), "A minion's drawing box; elites share it."),
        T('grid-miniboss', px(SPRITE_CLASS.miniboss.w), 'Reserved; nothing uses it yet.'),
        T('grid-boss', px(SPRITE_CLASS.boss.w), `A boss's drawing box, ${SPRITE_CLASS.boss.w} by ${SPRITE_CLASS.boss.h}.`),
        T('grid-shot', px(SPRITE_CLASS.shot.w), "A bullet's drawing box; the room around the shot is for a glow or a trail."),
        T('grid-pickup', px(SPRITE_CLASS.pickup.w), "A pickup's drawing box."),
        T('hitbox-player-w', px(hb.w), 'Player hit box width, standing.'),
        T('hitbox-player-h', px(hb.h), 'Player hit box height, standing.'),
        T('hitbox-slide-w', px(hs.w), 'Player hit box width, sliding.'),
        T('hitbox-slide-h', px(hs.h), 'Player hit box height, sliding.'),
        T('shot-max', px(Math.max(...radii) * 2), 'The biggest shot the game draws, as a ball this wide.'),
        T('pickup-box', px(pickup), "A pickup's pick-up box."),
        T('outline-width', '1px', 'Outline and rim are one pixel.'),
      ],
    },
    world: {
      note: 'The area between boss rooms, in game pixels: what the ground, platforms, spikes and doors are built from. Sizes and collision stay as they are; art changes only the look.',
      tokens: [
        T('ground-cap', px(cap), "The ground's lit top edge, the pit edge (area-cap)."),
        T('pit-width-min', px(pitMin), 'The narrowest pit.'),
        T('pit-width-max', px(maxPitWidth()), 'The widest pit, worked out from the jump so every pit can be cleared.'),
        T('platform-thickness', px(platH), 'A floating platform is this thick.'),
        T('platform-width-min', px(pwMin), 'The narrowest platform.'),
        T('platform-width-max', px(pwMax), 'The widest platform.'),
        T('platform-rise-min', px(platMin), 'The lowest a platform sits above the floor.'),
        T('platform-rise-max', px(maxPlatformHeight()), 'The highest a platform sits, worked out from the jump.'),
        T('spike-height', px(spikeH), 'A spike bed is this tall, standing on the floor.'),
        T('spike-width-min', px(swMin), 'The narrowest spike bed.'),
        T('spike-width-max', px(swMax), 'The widest spike bed.'),
        T('door-width', px(doorW), 'A door, boss or exit.'),
        T('door-height', px(doorH), 'A door, standing on the floor.'),
      ],
    },
    depth: {
      note: 'How the game layers things today, back to front; bigger numbers are drawn in front. Not a fixed rule: layering follows ordinary 2D practice (the owner\'s call, 17 Oct 2026).',
      tokens: Object.entries(DEPTH).map(([k, v]) => T(`depth-${k}`, v, DEPTH_USAGE[k] || `The ${k} layer.`)),
    },
    timing: {
      note: 'In steps, 60 a second. "Frames" in a duration means steps.',
      tokens: [
        T('steps-per-second', Math.round(1000 / FIXED_DT), 'The game clock: every duration is a whole number of these steps.'),
        T('beat', BEAT_LEN, "One beat, in steps: two seconds, one bar of Volt Man's 120-beats-a-minute track. His room runs on it."),
        T('hold-default', DEFAULT_HOLD, 'How long a sprite frame shows when its sheet does not say.'),
        T('invuln', FEEL.invulnFrames, 'The flicker after a hit, in which nothing can hurt the player.'),
        T('slide-tap', FEEL.slideTapFrames, 'A second tap of jump inside this many steps slides instead.'),
        T('warp-out', ARENA_WARP.out, 'The slow fade to black at a boss door.'),
        T('arrival-room', ARENA_WARP.bg, 'A boss room fades in over this.'),
        T('arrival-furniture', ARENA_WARP.furn, 'Then its furniture, over this.'),
        T('arrival-beam', ARENA_WARP.beam, 'Then the boss beams down, over this.'),
      ],
    },
    radius: { tokens: [T('radius-none', '0', 'Every corner is square. Pixel art has no rounding.')] },
  };
}

const DEPTH_USAGE = {
  background: 'The far background.',
  arena: "A boss room's 16-bit art and furniture.",
  world: 'Ground, spikes, platforms, doors.',
  pickups: 'Pickups.',
  minions: 'Minions.',
  bullets: 'Every bullet.',
  boss: 'The boss.',
  effects: "A weapon's dust, spikes and sand: over the boss, behind the player.",
  heldBack: 'The weapon in his FAR hand: just behind his body, a quarter darker.',
  player: 'The player.',
  held: "The weapon in the player's NEAR hand, just in front of his body.",
  cover: "The Grass boss's ground cover: one layer above the player.",
};

// ── Type: the game's 5x7 font, and the font file made from it ─────────

function type() {
  const F = 'src/systems/font.js';
  const h = n(lit(F, /export const GLYPH_H = (\d+)/, 'GLYPH_H'));
  const adv = n(lit(F, /const GLYPH_W = (\d+)/, 'GLYPH_W')) + n(lit(F, /const TRACKING = (\d+)/, 'TRACKING'));
  const style = (k, sample, usage) => ({ name: `text-${k}x`, fontSize: px(h * k), lineHeight: px((h + 1) * k), fontWeight: 400, sample, usage });
  return {
    fonts: [{ family: 'Mega Dash 5x7', file: 'fonts/MegaDash5x7.woff', weight: '400' }],
    families: { pixel: '"Mega Dash 5x7", monospace' },
    groups: [{
      name: 'Game text', family: 'pixel', styles: [
        style(1, 'SC 000000 LV1', `Every word in the game: capitals ${h} pixels tall, ${adv} pixels per letter with its gap. Lower case is shown as capitals; a missing character shows as ?.`),
        style(2, 'RE-QUIP', `The same lettering at twice size. Only whole multiples of ${h}px stay sharp.`),
        style(4, 'MEGA DASH', 'Four times size, for titles in a design and for reading letter detail.'),
      ],
    }],
  };
}

// ── The two cards whose data is the game's ────────────────────────────

/** Replace what sits between a card's `@generated` marker lines. */
function fillBlock(path, body) {
  const src = text(path);
  const re = /(\/\/ @generated[^\n]*\n)[\s\S]*?(\n[ \t]*\/\/ @generated end)/;
  if (!re.test(src)) throw new Error(`design:system: ${path} has lost its @generated markers.`);
  return src.replace(re, (_, a, b) => a + body + b);
}

function footprintCard() {
  const t = JSON.parse(text('design/sprite-targets.json')).bosses;
  const rows = BOSSES.map((b) => `['${b.id}', '${b.name.split(' ')[0]}', ${t[b.id].box.w}, ${t[b.id].box.h}]`);
  const lines = [];
  for (let i = 0; i < rows.length; i += 4) lines.push('    ' + rows.slice(i, i + 4).join(', '));
  return fillBlock(`${OUT}/components/BossFootprints/preview.html`, `  const BOSSES = [\n${lines.join(',\n')}];`);
}

function playerCard() {
  const { anims, holds } = JSON.parse(text('src/data/sprite-art.json')).player;
  const clip = (name, keys) => {
    const f = keys.flatMap((k) => anims[k]);
    // The three jump pictures are picked by how fast he rises or falls, not by a
    // clock, so the card shows each for a third of a second.
    const h = keys.length > 1 ? f.map(() => 20) : holds[keys[0]];
    return `    ['${name}', [${f.join(', ')}], [${h.join(', ')}]],`;
  };
  return fillBlock(`${OUT}/components/PlayerSprite/preview.html`, [
    '  const CLIPS = [', clip('IDLE', ['idle']), clip('RUN', ['run']),
    clip('JUMP', ['jumpRise', 'jumpApex', 'jumpFall']), clip('SLIDE', ['slide']), '  ];',
  ].join('\n'));
}

// ── Build, check, write ───────────────────────────────────────────────

export function build() {
  const tokens = {
    name: 'MEGA DASH', version: 1,
    meta: {
      source: 'github', repo: 'EchoJex/mega-dash', ref: 'main',
      note: 'Written by tools/design-system.mjs from the game\'s code. Change the code, then run npm run design:system.',
    },
    color: { themes: [{ id: 'game', name: 'Game' }], tokens: colours() },
    type: type(),
    ...families(),
  };
  return {
    [`${OUT}/tokens.json`]: JSON.stringify(tokens, null, 2) + '\n',
    [`${OUT}/components/BossFootprints/preview.html`]: footprintCard(),
    [`${OUT}/components/PlayerSprite/preview.html`]: playerCard(),
  };
}

/** The files whose copy on disk differs from what the code says now. */
export function stale() {
  return Object.entries(build()).filter(([p, body]) => {
    try { return text(p) !== body; } catch { return true; }
  }).map(([p]) => p);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const s = stale();
    console.log(s.length ? `Out of date:\n  ${s.join('\n  ')}\nRun npm run design:system.` : 'The design system matches the code.');
    process.exit(s.length ? 1 : 0);
  }
  for (const [p, body] of Object.entries(build())) writeFileSync(join(REPO, p), body);
  console.log('design/design-system/ rewritten from the code. Publish it to the design system in Claude.');
}
