/**
 * THE BRIDGE: makes the game see the same `Capacitor.Plugins.Updater` the
 * Android app gives it, so src/systems/updater.js needs no Windows branch.
 *
 * Runs in an isolated world, so the page can reach only what is exposed below.
 * `onMessage` is how progress arrives (Android uses toasts). A message that
 * lands before the title screen has registered its listener is held and handed
 * over when it does, because after an update the page reloads and the "Updated
 * to build N" line is sent before the new scene exists.
 */
const { contextBridge, ipcRenderer } = require('electron');

let listener = null;
let held = null;

ipcRenderer.on('updater:message', (_event, msg) => {
  if (listener) listener(msg); else held = msg;
});

contextBridge.exposeInMainWorld('Capacitor', {
  Plugins: {
    Updater: {
      // The game checks for exactly this before using `onMessage`; see src/systems/updater.js.
      desktop: true,
      checkForUpdate: () => ipcRenderer.send('updater:check'),
      pickChannel: () => ipcRenderer.send('updater:pick'),
      onMessage: (cb) => {
        listener = typeof cb === 'function' ? cb : null;
        if (listener && held !== null) { const m = held; held = null; listener(m); }
      },
    },
  },
});
