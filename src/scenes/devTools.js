/**
 * THE DEV OVERLAY'S TOOLS — only on a dev launch, only while DEBUG HUD is on (owner, 11 Nov 2026).
 *
 *   SPEED   the first plate under the pause button: tap to step through full speed, a half,
 *           a quarter and a tenth.
 *   FREEZE  the second plate: stops the game where it is. The picture stays live.
 *   STEP    the third plate: while frozen, moves the game on by exactly one step (1/60 s).
 *   LOUPE   press and hold anywhere that is not a button: a box opens there showing the game
 *           under it three times bigger. Drag the box to move it; tap outside it to close it.
 *
 * The thin red and green outlines themselves are drawn by GameScene.draw, because they belong
 * to the world, not the screen. Everything here asks GameScene to do the real work
 * (`devTime`, `setLoupe`), so this file only draws plates and reads fingers.
 */
import { VIEW_H } from '../config/display.js';
import { label } from '../systems/text.js';
import { DEV } from '../config/dev.js';

const SPEEDS = [1, 0.5, 0.25, 0.1];
const HOLD_MS = 350;        // how long a press must stay put to open the loupe
const SLIP = 6;             // how far it may wander meanwhile, in screen pixels
const LOUPE = { w: 128, h: 80, zoom: 3 };

export const devToolsOn = (ui) => DEV.enabled && DEV.debugHud && !ui.mode && !ui.cards && !ui.exitPanel;

export function installDevTools(ui, w) {
  if (!DEV.enabled) return;
  const gm = () => ui.game_;
  const vpt = (p) => ui.cameras.main.getWorldPoint(p.x, p.y);
  const plates = [];
  const plateAt = (i, text, fn) => {
    const x = w - 20 - (3 - i) * 22, r = ui.add.rectangle(x, 2, 20, 12, 0x0d1420, 0.7).setOrigin(0).setInteractive();
    const t = label(ui, x + 10, 8, text, { color: '#FFD040', origin: 0.5 });
    r.on('pointerdown', fn);
    plates.push(r, t);
    return t;
  };
  const speedTxt = plateAt(0, '1', () => {
    const d = gm().devTime;
    d.scale = SPEEDS[(SPEEDS.indexOf(d.scale) + 1) % SPEEDS.length];
  });
  const freezeTxt = plateAt(1, '=', () => { const d = gm().devTime; d.frozen = !d.frozen; });
  plateAt(2, '+1', () => { const d = gm().devTime; if (d.frozen) d.steps++; });

  // The loupe's frame. The magnified picture itself is a second camera on the game.
  const frame = ui.add.rectangle(0, 0, LOUPE.w, LOUPE.h).setOrigin(0).setStrokeStyle(1, 0xFFD040, 1).setVisible(false);
  let box = null, press = null, drag = null;
  const place = (x, y) => {
    box = { x: Math.round(Math.max(0, Math.min(w - LOUPE.w, x))), y: Math.round(Math.max(0, Math.min(VIEW_H - LOUPE.h, y))),
      w: LOUPE.w, h: LOUPE.h, zoom: LOUPE.zoom };
    frame.setPosition(box.x, box.y).setVisible(true);
    gm().setLoupe(box);
  };
  const close = () => { box = null; drag = null; frame.setVisible(false); gm()?.setLoupe(null); };
  const inside = (v) => box && v.x >= box.x && v.x <= box.x + box.w && v.y >= box.y && v.y <= box.y + box.h;

  ui.input.on('pointerdown', (p, over) => {
    if (!devToolsOn(ui)) return;
    const v = vpt(p);
    if (inside(v)) { drag = { id: p.id, dx: v.x - box.x, dy: v.y - box.y }; return; }
    if (over.length) return;   // a button, a pad, a wheel: theirs, not ours
    if (box) { close(); return; }
    press = { id: p.id, x: v.x, y: v.y, at: performance.now() };
  });
  ui.input.on('pointermove', (p) => {
    const v = vpt(p);
    if (drag && p.id === drag.id) place(v.x - drag.dx, v.y - drag.dy);
    if (press && p.id === press.id && Math.hypot(v.x - press.x, v.y - press.y) > SLIP) press = null;
  });
  ui.onRelease((p) => {
    if (drag && p.id === drag.id) drag = null;
    if (press && p.id === press.id) press = null;
  });

  // Called from UIScene.update, every frame.
  ui.devToolsTick = () => {
    const on = devToolsOn(ui);
    for (const o of plates) o.setVisible(on);
    if (!on) { if (box) close(); press = null; return; }
    const d = gm().devTime;
    speedTxt.setText(d.scale === 1 ? '1' : d.scale === 0.5 ? '/2' : d.scale === 0.25 ? '/4' : '/10');
    freezeTxt.setText(d.frozen ? '>' : '=');
    if (press && performance.now() - press.at >= HOLD_MS) {
      place(press.x - LOUPE.w / 2, press.y - LOUPE.h / 2);
      drag = { id: press.id, dx: LOUPE.w / 2, dy: LOUPE.h / 2 };   // the same finger carries straight on
      press = null;
    }
  };
}
