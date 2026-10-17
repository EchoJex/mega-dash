import Phaser from 'phaser';
import { VIEW_H, viewWidthOf } from '../config/display.js';
import { fitCamera, label, plate, inkFor } from '../systems/text.js';
import { FEEL } from '../config/feel.js';
import { DEV, dev, layerFor, saveDevSettings } from '../config/dev.js';
import { BOSSES, bossLayer } from '../data/bosses.js';
import { UPGRADES } from '../data/upgrades.js';
import { save, persist } from '../systems/save.js';
import { MAX_RANK } from '../systems/loadout.js';
import { hexNum } from '../systems/assets.js';
import { sfx } from '../systems/sfx.js';
import { playMusic, TRACK } from '../systems/music.js';

/**
 * THE DEV MENU — every dev control in the game, in one place, off the title
 * screen, reachable only from a DEV MODE launch.
 *
 * It replaces the pause menu's DEV PANEL and BOSS SELECT, which are gone. A
 * playtester's pause menu is now RESUME and ABORT RUN and nothing else, which
 * is what shipping looks like — and a dev tool that cannot be reached by a
 * thumb during a fight cannot be pressed by one either.
 *
 * WHAT THAT COSTS, AND WHY IT IS WORTH IT. Adjusting anything mid-run now means
 * aborting the run. The owner asked for exactly that trade: the run is cheap
 * (the boss picker puts you at a door in two taps) and the alternative was dev
 * surfaces living inside the shipping UI forever.
 *
 * THREE GROUPS, and they are three different kinds of thing:
 *
 *   RUN      what the NEXT run starts as. Read them as the first frame of a
 *            run rather than as cheats — arsenal, levels, mastery, layer.
 *   OVERLAY  what gets drawn on top of a live run.
 *   META     the persistent save. These WRITE to it, so they are destructive in
 *            a way nothing else here is, and they say so by naming the verb.
 *
 * EVERY ROW IS ONE TAP. Name on the left, current value on the right, tapping
 * the row anywhere advances it. No steppers: a stepper is two 20px targets and
 * a value between them, which is three times the width of a row for the same
 * information, and this screen has twenty rows to fit into 224 virtual pixels.
 * Wrapping round is fine — every one of these has at most four states and the
 * value is read back in place.
 *
 * LAYOUT IS MEASURED, NEVER COMPUTED (see HubScene for the two times guessing
 * at glyph metrics put rows on top of each other). Column 2 is placed off the
 * measured width of column 1, and the row pitch off the measured line height.
 */
export default class DevMenuScene extends Phaser.Scene {
  constructor() { super('DevMenu'); }

  create() {
    playMusic(TRACK.menu);   // same track as the title: carries on, never restarts
    const w = viewWidthOf(this.scale);
    fitCamera(this, w);
    this.w = w;
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614).setOrigin(0);
    label(this, w / 2, 11, 'DEV MENU', { scale: 2, color: '#F5D328', origin: 0.5 });

    this.rows = [];
    /**
     * THE PICKER IS PER-VISIT STATE AND PHASER REUSES THE SCENE INSTANCE.
     *
     * Picking a boss calls `scene.start('Game')`, which tears down the display
     * list but leaves this field pointing at the destroyed container — only the
     * BACK button ever nulled it. `openBossPicker` bails on a truthy `picker`,
     * so after one pick the BOSS PICKER row silently did nothing for the rest
     * of the session: the row highlighted, the sound played, no picker opened.
     *
     * Reset here rather than on the pick, because `create()` is where every
     * other per-visit field is initialised and it covers every route back in.
     */
    this.picker = null;
    this.popup = null;      // the description box; per-visit, like the picker
    const left = this.runRows();
    const right = this.metaRows();

    /**
     * Two columns, placed off MEASURED text. The name field is padded to a
     * fixed width so the value column lines up down the page; that padding is
     * the only arithmetic here and it is in glyphs, not pixels.
     */
    this.refresh();
    const widest = (rows) => Math.max(...rows.map((r) => r.t.width));
    const lineH = Math.max(...this.rows.map((r) => r.t.height));
    /**
     * PITCH IS SET BY THE THUMB, not by the glyph. Eleven rows fit in the space
     * with room to spare, so the spare room goes into the touch targets: a 13px
     * row at 4-5x render scale is a 52-65 real-pixel band, which is a phone
     * button. Packed to the line height it would be half that and every miss
     * would land on the neighbouring setting. The rest of the slack buys the
     * description strip clear air above and below it.
     */
    const pitch = Math.max(lineH + 4, 13);

    const TOP = 28, LEFT = 6, GUTTER = 8;
    const col2 = Math.min(w - widest(right) - LEFT,
      Math.max(LEFT + widest(left) + GUTTER, Math.round(w * 0.5)));

    left.forEach((r, i) => this.place(r, LEFT, TOP + i * pitch));
    right.forEach((r, i) => this.place(r, col2, TOP + i * pitch));

    /**
     * THE ROW SAYS WHAT IT IS. Every name here is an abbreviation — NO LOCKS
     * and FREE CARDS mean nothing to anyone who has not read the code. So
     * tapping a row changes it AND pops up a box with one sentence, about 120
     * characters, saying what it does and what its values mean (the owner's
     * call of 17 Oct 2026). Every row wraps, so tapping to find out is always
     * a tap from where you were; the three WIPE rows ARM instead — see `place`.
     */
    const rows = Math.max(left.length, right.length);
    label(this, LEFT, TOP + (rows - 1) * pitch + lineH + 8,
      'TAP A ROW TO CHANGE IT AND SEE WHAT IT DOES', { color: '#4A6A7A' });

    // The two ways out, and the one action. BOSS PICKER starts a run rather
    // than arming a setting — the whole point of it is to be at the door.
    const y = VIEW_H - 12;
    this.btn(w / 2 - 62, y, 'BOSS PICKER', '#F5D328', () => this.openBossPicker());
    this.btn(w / 2 + 46, y, 'BACK', '#5CADD5', () => this.scene.start('Title'));

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  btn(x, y, text, colour, fn) {
    const { rect } = plate(this, x, y, text, { color: colour, padX: 8, padY: 3 });
    rect.on('pointerdown', fn);
    return rect;
  }

  // ── The rows ────────────────────────────────────────────────────────

  /**
   * A tappable row. `read` returns the value column; `tap` advances it and may
   * return false to mean "nothing happened", which suppresses the click.
   *
   * `head` rows are captions — no value, no hit area.
   */
  row(name, read, tap, opts = {}) {
    const r = {
      name, read, tap, head: !!opts.head, pad: opts.pad ?? 12,
      // One sentence, about 120 characters: what it does and what its values mean.
      desc: opts.desc || '',
      // Destructive and irreversible — the first tap only arms it.
      confirm: !!opts.confirm, armed: false,
      colour: opts.colour || (opts.head ? '#6A6A5A' : '#B8C4D0'),
      t: label(this, 0, 0, '', { color: opts.head ? '#6A6A5A' : '#B8C4D0' }),
      hit: null,
    };
    this.rows.push(r);
    return r;
  }

  /**
   * Pop up the touched row's sentence, in a box on the half of the screen the
   * row is NOT in, so it never covers what you just tapped. It goes away after
   * a few seconds or on the next tap, and never blocks a row.
   */
  describe(r) {
    this.popup?.destroy(true);
    this.popup = null;
    if (!r?.desc) return;
    const words = r.desc.split(' '), lines = [''];
    for (const wd of words) {
      if ((lines[lines.length - 1] + ' ' + wd).trim().length > 40) lines.push('');
      lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + wd).trim();
    }
    const colour = r.armed ? '#F5D328' : '#5CADD5';
    const t = label(this, 0, 0, lines.join('\n'), { color: colour });
    const bw = Math.min(this.w - 16, t.width + 14), bh = t.height + 12;
    const x = Math.round((this.w - bw) / 2);
    const y = r.t.y < VIEW_H / 2 ? VIEW_H - 26 - bh : 26;
    const box = this.add.rectangle(x, y, bw, bh, 0x0d1420, 0.97).setOrigin(0)
      .setStrokeStyle(1, hexNum(colour));
    t.setPosition(x + 7, y + 6);
    this.popup = this.add.container(0, 0, [box, t]).setDepth(10);
    const mine = this.popup;
    this.time.delayedCall(4500, () => { if (this.popup === mine) { mine.destroy(true); this.popup = null; } });
  }

  /** Put a built row on the page and give it a full-width touch target. */
  place(r, x, y) {
    r.t.setPosition(x, y);
    if (r.head) return;
    // The hit area is the whole row, not the glyphs: at 4-5x render scale a 7px
    // line is a comfortable target, but only if the pixels between the lines
    // belong to it too. Invisible rather than absent so it can be seen in a
    // debug pass by nudging the alpha.
    const h = Math.max(9, r.t.height + 2);
    r.hit = this.add.rectangle(x - 2, y - 1, r.t.width + 6, h, 0x5cadd5, 0)
      .setOrigin(0).setInteractive({ useHandCursor: true });
    r.hit.on('pointerdown', () => {
      /**
       * ARM, THEN FIRE. Every other row wraps, so tapping one to find out what
       * it does is free; WIPE CHIPS, WIPE UPGRADE and WIPE KILLS delete save
       * data that cannot be got back, and "tap it to see what it says" would
       * be the most natural way in the world to lose a save. The first tap
       * describes it and turns the row gold; the second does it.
       */
      // ANY tap anywhere disarms everything. An arm that survived a trip
      // through the other rows would sit there indefinitely, and coming back
      // to a row that looks idle and wiping the save on one tap is exactly
      // the accident this is here to prevent.
      const wasArmed = r.armed;
      for (const o of this.rows) o.armed = false;
      if (r.confirm && !wasArmed) {
        r.armed = true;
        sfx('select');
        this.refresh();
        this.describe(r);
        return;
      }
      if (r.tap() === false) { this.describe(r); return; }
      sfx('select');
      saveDevSettings();
      this.refresh();
      this.describe(r);
    });
  }

  refresh() {
    for (const r of this.rows) {
      const value = r.head ? '' : r.armed ? 'SURE?' : r.read();
      r.t.setText(r.head ? r.name : `${r.name.slice(0, r.pad).padEnd(r.pad)} ${value}`);
      r.t.setTint(hexNum(r.armed ? '#F5D328' : r.colour));
    }
  }

  /** A boolean perk: tap flips it. */
  flag(name, key, desc, on = 'ON', off = 'OFF') {
    return this.row(name,
      () => (DEV[key] ? on : off),
      () => { DEV[key] = !DEV[key]; }, { desc });
  }

  /**
   * A dial with a small fixed set of values, wrapping. `opts` is [value, label]
   * pairs and the first one is what a fresh setting means.
   */
  wheel(name, key, opts, desc) {
    const at = () => Math.max(0, opts.findIndex(([v]) => v === DEV[key]));
    return this.row(name,
      () => opts[at()][1],
      () => { DEV[key] = opts[(at() + 1) % opts.length][0]; }, { desc });
  }

  runRows() {
    const rank = [[null, 'AUTO'], [0, '0'], [1, '1'], [2, '2'], [3, '3']]
      .filter(([v]) => v === null || v <= MAX_RANK);
    return [
      this.row('RUN', null, null, { head: true }),
      /**
       * The arsenal, and the rung it arrives at. Level 1 is the default on
       * purpose — the point is to have everything available to slot and
       * compare, not to skip the ladder — but a slice testing a Lv10 rung
       * should not have to play most of a run to see it.
       */
      this.flag('WEAPONS', 'startUnlocked',
        'WHAT THE RUN STARTS WITH. ALL: EVERY WEAPON UNLOCKED FROM THE FIRST STEP. EARNED: ONLY WHAT BOSSES DROP, LIKE THE REAL GAME.',
        'ALL', 'EARNED'),
      this.row('START LV',
        () => `LV ${DEV.startLevel}`,
        () => { DEV.startLevel = DEV.startLevel % FEEL.weaponMaxLevel + 1; },
        { desc: 'THE LEVEL EVERY WEAPON ARRIVES AT. NEW FEATURES ONLY LAND AT LV 1, 3, 6 AND 10; THE LEVELS BETWEEN ADD DAMAGE.' }),
      /**
       * AUTO here means `maxMastery`'s blanket 3. The numbered ranks are the
       * only way to feel 0-2, which is exactly what that switch cannot show.
       */
      this.wheel('OFF RANK', 'offRank', rank,
        'HOW BIG THE OFFENSIVE ROW IS. 0: SIDE ARM ONLY. 1: A SPECIAL OR THE SIDE ARM. 3: TWO SPECIALS LIVE. AUTO MEANS 3.'),
      this.wheel('DEF RANK', 'defRank', rank,
        'HOW BIG THE DEFENSIVE ROW IS. 0: NO SLOTS. 1: ONE. 2: TWO, ONE LIVE AT A TIME. 3: TWO, BOTH LIVE. AUTO MEANS 3.'),
      /**
       * An OVERRIDE, never a write to `save.bossKills`. Faking clears to reach
       * layer 3 would permanently raise that boss's shipped layer on this
       * device with no way back short of a full reset.
       */
      this.wheel('BOSS LAYER', 'nextLayer',
        [[0, 'AUTO'], [1, 'L1'], [2, 'L2'], [3, 'L3']],
        'HOW HARD EVERY BOSS FIGHTS. AUTO: THE LAYER YOUR CLEARS HAVE EARNED HIM. L1 TO L3 FORCE ONE WITHOUT TOUCHING THE SAVE.'),
      this.flag('LAYER WRAP', 'cycleLayers',
        'AFTER THREE CLEARS OF ONE BOSS. ON: HIS FOURTH FIGHT IS LAYER 1 AGAIN, THEN 2, THEN 3. OFF: HE STAYS AT LAYER 3.'),
      /**
       * WHICH WHEEL THE RE-QUIP BUTTON OPENS. `POST BOSS` is for working ON
       * that wheel: reaching it otherwise costs a whole fight, and slow motion
       * is not the state you want to inspect a layout in. It changes the
       * CONTROL, never the rules — `canRequip` still decides what may change.
       */
      this.wheel('WHEEL', 'wheelMode',
        [['playtest', 'PLAYTEST'], ['postboss', 'POST BOSS']],
        'WHAT THE RE-QUIP BUTTON OPENS. PLAYTEST: THE ACTIVE WHEEL IN A FIGHT, LIKE THE REAL GAME. POST BOSS: THE LOADOUT WHEEL, ALWAYS.'),
      this.flag('HP FLOOR', 'hpFloor',
        'ON: EVERY HIT STILL LANDS, FLINCHES AND KNOCKS YOU BACK, BUT YOUR ENERGY STOPS AT 1, SO THE RUN NEVER ENDS.'),
      this.flag('NO LOCKS', 'unlockAnyWeapon',
        'ON: A LOCKED SLOT STILL SHOWS ITS PADLOCK, BUT TAPPING IT EQUIPS IT ANYWAY. OFF: LOCKS WORK LIKE THE REAL GAME.'),
      this.flag('FREE CARDS', 'cardsFromAllWeapons',
        'ON: LEVEL-UP CARDS MAY OFFER WEAPONS YOU HAVE NOT UNLOCKED YET, AND TAKING ONE UNLOCKS IT FOR THE REST OF THE RUN.'),
    ];
  }

  metaRows() {
    const bought = () => UPGRADES.reduce((n, u) => n + (save.upgrades[u.id] || 0), 0);
    const capacity = UPGRADES.reduce((n, u) => n + u.maxLv, 0);
    const kills = () => Object.values(save.bossKills).reduce((n, k) => n + k, 0);
    const write = () => { persist(); return true; };

    return [
      this.row('OVERLAY', null, null, { head: true }),
      // The diagnostic line only. The [DEV] marker beside the score is not
      // optional — a playtest note that does not say it came from a dev build
      // is a playtest note that gets misread as balance data.
      this.flag('DEBUG HUD', 'debugHud',
        'ON: A LINE UNDER THE SCORE SHOWS THE BUILD, THE WORLD SEED AND SCREEN SHARPNESS. THE DEV MARKER STAYS ON EITHER WAY.'),
      this.row('', null, null, { head: true }),
      this.row('META  SAVE', null, null, { head: true }),
      this.row('CHIPS +250',
        () => `${save.chips}`,
        () => { save.chips += 250; return write(); },
        { desc: 'ADDS 250 CHIPS TO THE SAVE ON EVERY TAP. THE NUMBER IS WHAT YOU HAVE. CHIPS BUY PERMANENT UPGRADES IN THE HUB.' }),
      this.row('WIPE CHIPS', () => '',
        () => { save.chips = 0; return write(); },
        { confirm: true, desc: 'SETS YOUR SAVED CHIPS BACK TO ZERO. IT CANNOT BE UNDONE, SO THE FIRST TAP ONLY ARMS IT: TAP AGAIN TO CONFIRM.' }),
      this.row('MAX UPGRADE',
        () => `${bought()}/${capacity}`,
        () => {
          for (const u of UPGRADES) save.upgrades[u.id] = u.maxLv;
          return write();
        },
        { desc: 'BUYS EVERY HUB UPGRADE TO ITS TOP RANK, INCLUDING THE SLIDE, THE CLIFF GRAB AND BOTH LOADOUT MASTERY LADDERS.' }),
      this.row('WIPE UPGRADE', () => '',
        () => { save.upgrades = {}; return write(); },
        { confirm: true, desc: 'REMOVES EVERY HUB UPGRADE YOU HAVE BOUGHT. IT CANNOT BE UNDONE, SO THE FIRST TAP ONLY ARMS IT: TAP AGAIN.' }),
      /**
       * Lifetime clears, which is what earns a boss his LAYER. Wiping them puts
       * every boss back to layer 1 honestly — which the BOSS LAYER override
       * above deliberately cannot do, because it does not touch the save.
       */
      this.row('WIPE KILLS',
        () => `${kills()}`,
        () => { save.bossKills = {}; return write(); },
        { confirm: true, desc: 'LIFETIME CLEARS EARN EACH BOSS HIS LAYER. WIPING THEM PUTS EVERY BOSS BACK TO LAYER 1. TAP TWICE TO CONFIRM.' }),
    ];
  }

  // ── Boss picker ─────────────────────────────────────────────────────

  /**
   * Pick a boss and START A RUN with his door a short walk ahead.
   *
   * Element-slice development means fighting one boss over and over, and
   * reaching him normally costs a 60-second door timer plus a shuffle bag that
   * might not offer him for sixteen doors.
   *
   * The door, not the arena: the warp, the fade and the room building on the
   * far side are all part of what needs testing, and starting inside the fight
   * would skip every transition bug.
   *
   * Each tile shows the layer you will actually get, which is the BOSS LAYER
   * override when one is set and his earned layer otherwise.
   */
  openBossPicker() {
    if (this.picker || !dev('bossSelect')) return;
    const cx = this.w / 2;
    this.picker = this.add.container(0, 0).setDepth(20);
    this.picker.add(this.add.rectangle(0, 0, this.w, VIEW_H, 0x060614, 1)
      .setOrigin(0).setInteractive());
    this.picker.add(label(this, cx, 8, 'START AT BOSS', { color: '#F5D328', origin: 0.5 }));
    this.picker.add(label(this, cx, 20, 'outside his door · number = layer',
      { color: '#6A6A5A', origin: 0.5 }));

    // 17 tiles laid out to fit the narrowest supported width without scrolling.
    const cols = 6, tw = Math.floor((this.w - 12) / cols) - 2, th = 26;
    const x0 = Math.round((this.w - (cols * (tw + 2) - 2)) / 2);
    BOSSES.forEach((b, i) => {
      const x = x0 + (i % cols) * (tw + 2);
      const y = 34 + Math.floor(i / cols) * (th + 3);
      const layer = layerFor(bossLayer(save, b.id, dev('cycleLayers')));
      const tile = this.add.rectangle(x, y, tw, th, hexNum(b.primary), 0.85).setOrigin(0)
        .setStrokeStyle(1, hexNum(b.outline), 1)
        .setInteractive({ useHandCursor: true });
      const ink = inkFor(b.primary);
      // 7 chars, not 6 — TEMPEST, GRANITE and ECLIPSE all lose their last
      // letter at 6 and read as TEMPES / GRANIT / ECLIPS.
      const name = label(this, x + tw / 2, y + 5, b.name.split(' ')[0].slice(0, 7),
        { color: ink, origin: 0.5 });
      const lv = label(this, x + tw / 2, y + 16, 'L' + layer, { color: ink, origin: 0.5 });
      tile.on('pointerdown', () => {
        sfx('select');
        // Consumed by GameScene on the next run and then cleared, so a plain
        // START from the title is never quietly redirected to a boss picked
        // twenty minutes ago.
        DEV.startBoss = b.id;
        this.scene.start('Game');
      });
      this.picker.add([tile, name, lv]);
    });

    const { rect, txt } = plate(this, cx, VIEW_H - 14, 'BACK',
      { color: '#5CADD5', padX: 10, padY: 3 });
    rect.on('pointerdown', () => { this.picker.destroy(true); this.picker = null; });
    this.picker.add([rect, txt]);
  }
}
