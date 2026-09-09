import Phaser from 'phaser';
import { VIEW_H, viewWidthOf } from '../config/display.js';
import { fitCamera, label, plate } from '../systems/text.js';
import { UPGRADES, upgradeLevel, upgradeCost } from '../data/upgrades.js';
import { save, persist } from '../systems/save.js';
import { hexNum } from '../systems/assets.js';

/** Dr. Light's Lab — spend Chips on permanent Upgrades. */
export default class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  create() {
    const w = viewWidthOf(this.scale);
    fitCamera(this, w);
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614).setOrigin(0);
    label(this, w / 2, 8, "DR. LIGHT'S LAB", { scale: 2, color: '#F5D328', origin: 0.5 });
    this.chipText = label(this, w / 2, 26, '', { color: '#E0F0FF', origin: 0.5 });

    /**
     * TWO COLUMNS, SPLIT BY KIND — ordinary upgrades left, the MASTERY ladders
     * right.
     *
     * The masteries are a different sort of purchase from everything else and
     * mixing them into one list buried that. The others are percentages: a bit
     * more damage, a bit more range, and skipping one costs you nothing you can
     * name. A mastery rank unlocks an ABILITY — the slide, the ledge grab, a
     * loadout slot — and skipping one means a part of the game stays closed.
     * A player scanning the list should be able to see that split without
     * reading every row.
     *
     * ROW PITCH IS DERIVED per column, not fixed. The list has grown twice and
     * will grow again; a hard 10px step silently ran the last rows under the
     * BACK plate when Loadout Mastery added two. The glyph is 7px tall, so 8 is
     * the floor at which rows still read as separate lines.
     */
    const TOP = 38, BOTTOM = VIEW_H - 28, LEFT = 6, GUTTER = 8;

    const main = UPGRADES.filter((u) => !u.mastery);
    const mastery = UPGRADES.filter((u) => u.mastery);

    this.rows = [];
    const addRow = (u, short) => {
      const t = label(this, LEFT, 0, '', { color: '#E0F0FF' });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.buy(u));
      // PAD COMES FROM THE LONGEST NAME IN ITS OWN COLUMN, not a constant. It
      // was 16, and CONT. INTEGRATION is 17 — so the row silently rendered as
      // "CONT. INTEGRATIO". The shrink loop below still trims when the two
      // columns cannot both fit, which is the case the constant was guarding.
      const row = { u, t, short, pad: short ? 10 : 16 };
      this.rows.push(row);
      return row;
    };
    const mainRows = main.map((u) => addRow(u, false));
    const mastRows = mastery.map((u) => addRow(u, true));
    const widestName = Math.max(...main.map((u) => u.name.length));
    for (const r of mainRows) r.pad = Math.max(r.pad, widestName);
    this.headTxt = label(this, LEFT, 0, 'MASTERY', { color: '#F5D328' });

    /**
     * EVERY MEASUREMENT HERE IS READ BACK OFF THE TEXT, NEVER ARITHMETIC.
     *
     * Two earlier attempts got this wrong in the same way. The first placed the
     * second column at a constant derived from "5px glyph + 1px tracking" and
     * the columns overlapped, because the real advance is wider than the cell.
     * The second assumed an 8px row pitch would clear a 7px glyph and the rows
     * overlapped, because the rendered line box is taller than the glyph. Text
     * metrics are the only numbers that cannot disagree with what is drawn.
     */
    this.refresh();
    const widest = (rows) => Math.max(...rows.map((r) => r.t.width));
    const lineH = Math.max(...this.rows.map((r) => r.t.height));

    /**
     * TWO COLUMNS ALWAYS — and at the narrow end that is not a luxury, it is the
     * only layout that fits. Nineteen rows at a legible pitch need more vertical
     * space than the 224px screen has, so a single list overlaps itself before
     * it ever runs out of width. Splitting 15 and 4 is what makes the page fit
     * at all; the mastery grouping is the reason it is a good split rather than
     * an arbitrary one.
     *
     * When the two columns are too WIDE — a 4:3 tablet drives the virtual width
     * down to 320 — the left column's name field is trimmed a character at a
     * time until they clear each other. Truncated names beat overlapping ones,
     * and it only ever bites on the narrowest device.
     */
    /**
     * THE SPLIT IS DECIDED BEFORE THE NAMES ARE TRIMMED, because it changes
     * what the trim has to clear. While the right-hand column held only the
     * four narrow mastery rows, "does the left column fit" was the whole
     * question. Once main rows overflow into it, the right side needs a FULL
     * row's width, and a loop still measuring against the mastery rows lets
     * three upgrades run off the screen edge — which is exactly what happened
     * at 320 and 398 virtual px before this was measured.
     */
    const step = lineH + 1;
    const cap = Math.max(1, Math.floor((BOTTOM - TOP) / step) + 1);
    const colA = mainRows.slice(0, cap);
    const colB = mainRows.slice(cap);

    const rightNeeds = () => Math.max(widest(mastRows), colB.length ? widest(colB) : 0);
    const roomForNames = () => w - LEFT - GUTTER - rightNeeds() - LEFT;
    while (widest(mainRows) > roomForNames() && mainRows[0].pad > 8) {
      for (const r of mainRows) r.pad--;
      this.refresh();
    }

    const col2 = LEFT + Math.max(widest(mainRows) + GUTTER, w * 0.5);
    const pitch = (n, top) => Math.max(lineH + 1,
      Math.min(11, Math.floor((BOTTOM - top) / Math.max(1, n - 1))));

    /**
     * THE LEFT COLUMN HAS A CAPACITY AND THE LIST OUTGREW IT.
     *
     * `pitch` cannot shrink past `lineH + 1` without rows overlapping, so once
     * the main list needs more than that many rows it stops being a fit problem
     * and starts being an overflow: the six upgrades added on 9 Sep pushed
     * SALVAGE and TWIN ARSENAL under the BACK plate, where nothing can buy them.
     *
     * So the remainder wraps into the SECOND column, beneath the mastery block —
     * which is four rows tall in a column that runs the full height, and was
     * therefore mostly empty space the layout had already paid for. The split is
     * still "mastery is its own group", it is just no longer the ONLY thing on
     * that side. It stays derived, so the next upgrade does not need this note
     * read again.
     */
    const p = pitch(colA.length, TOP);
    colA.forEach((r, i) => r.t.setPosition(LEFT, TOP + i * p));
    this.headTxt.setPosition(col2, TOP);
    const q = pitch(mastRows.length, TOP + p);
    mastRows.forEach((r, i) => r.t.setPosition(col2, TOP + p + i * q));

    // The overflow starts a clear line below the last mastery row rather than
    // continuing its pitch, so the two groups still read as two groups.
    if (colB.length) {
      const after = TOP + p + Math.max(1, mastRows.length) * q + step;
      const rr = pitch(colB.length, after);
      colB.forEach((r, i) => r.t.setPosition(col2, after + i * rr));
    }

    plate(this, w / 2, VIEW_H - 10, 'BACK', { color: '#5CADD5', padX: 8, padY: 3 })
      .rect.on('pointerdown', () => this.scene.start('Title'));
  }

  buy(u) {
    const lv = upgradeLevel(save, u.id);
    if (lv >= u.maxLv) return;
    const cost = upgradeCost(u, lv);
    if (save.chips < cost) return;
    save.chips -= cost;
    save.upgrades[u.id] = lv + 1;
    persist();
    this.refresh();
  }

  refresh() {
    this.chipText.setText(`CHIPS: ${save.chips}`);
    for (const row of this.rows) {
      const { u, t, short } = row;
      const lv = upgradeLevel(save, u.id);
      const maxed = lv >= u.maxLv;
      const cost = maxed ? 0 : upgradeCost(u, lv);
      // The mastery column drops the trailing word its own heading already
      // carries. `pad` is the name field's width, which the layout shrinks on a
      // narrow screen until the two columns clear each other.
      const name = short ? u.name.replace(/ ?MASTERY$/, '') : u.name;
      t.setText(`${name.slice(0, row.pad).padEnd(row.pad)} ${lv}/${u.maxLv}  ${maxed ? 'MAX' : cost + 'c'}`);
      t.setTint(hexNum(maxed ? '#2AAB1C' : save.chips >= cost ? u.color : '#555555'));
    }
  }
}
