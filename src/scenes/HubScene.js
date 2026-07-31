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

    this.rows = [];
    UPGRADES.forEach((u, i) => {
      const y = 38 + i * 10;
      const t = label(this, 6, y, '', { color: '#E0F0FF' });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.buy(u));
      this.rows.push({ u, t });
    });

    plate(this, w / 2, VIEW_H - 10, 'BACK', { color: '#5CADD5', padX: 8, padY: 3 })
      .rect.on('pointerdown', () => this.scene.start('Title'));

    this.refresh();
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
    for (const { u, t } of this.rows) {
      const lv = upgradeLevel(save, u.id);
      const maxed = lv >= u.maxLv;
      const cost = maxed ? 0 : upgradeCost(u, lv);
      t.setText(`${u.name.padEnd(16)} ${lv}/${u.maxLv}  ${maxed ? 'MAX' : cost + 'c'}`);
      t.setTint(hexNum(maxed ? '#2AAB1C' : save.chips >= cost ? u.color : '#555555'));
    }
  }
}
