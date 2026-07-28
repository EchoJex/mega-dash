import Phaser from 'phaser';
import { VIEW_H } from '../config/display.js';
import { TEXT_RES } from '../systems/text.js';
import { UPGRADES, upgradeLevel, upgradeCost } from '../data/upgrades.js';
import { save, persist } from '../systems/save.js';

/** Dr. Light's Lab — spend Chips on permanent Upgrades. */
export default class HubScene extends Phaser.Scene {
  constructor() { super('Hub'); }

  create() {
    const w = this.scale.gameSize.width;
    this.add.rectangle(0, 0, w, VIEW_H, 0x060614).setOrigin(0);
    this.add.text(w / 2, 10, "DR. LIGHT'S LAB",
      { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '10px', color: '#F5D328' }).setOrigin(0.5);
    this.chipText = this.add.text(w / 2, 22, '', { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '8px', color: '#E0F0FF' })
      .setOrigin(0.5);

    this.rows = [];
    UPGRADES.forEach((u, i) => {
      const y = 38 + i * 10;
      const t = this.add.text(6, y, '', { resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '7px' })
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.buy(u));
      this.rows.push({ u, t });
    });

    this.add.text(w / 2, VIEW_H - 10, 'BACK', {
      resolution: TEXT_RES, fontFamily: 'monospace', fontSize: '9px', color: '#5CADD5',
      backgroundColor: '#0d1420', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Title'));

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
      t.setColor(maxed ? '#2AAB1C' : save.chips >= cost ? u.color : '#555');
    }
  }
}
