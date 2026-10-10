/**
 * MEGA DASH FOR WINDOWS — the game in its own window with its own Chromium.
 *
 * WHY THIS EXISTS. The Android app ships inside a known WebView so the game
 * behaves the same on every phone. This is the same idea for a PC: a Chromium
 * that is pinned in package.json (an exact version, never a range) travels
 * inside the .exe, so the game never depends on whichever browser a player
 * happens to have. It is deliberately not Edge's WebView2.
 *
 * WHAT IT DOES. Opens a window, serves the game's files to it, and gives it the
 * update button. It adds nothing to the game: the same bundle that runs in the
 * APK runs here, which is the reason there is almost nothing in this file.
 */
const { app, BrowserWindow, Menu, protocol, session } = require('electron');
const fs = require('fs');
const path = require('path');
const { registerUpdater, gameRoot, pruneOld } = require('./updater');

/**
 * `app://game/` rather than file://. The game keeps its music in Cache Storage,
 * which only exists on a "secure" origin, and its scripts are modules, which a
 * file:// page cannot load. The scheme also gives the save one stable home.
 */
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
};

async function serve(request) {
  const root = gameRoot();
  let rel = decodeURIComponent(new URL(request.url).pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.join(root, path.normalize(rel));
  // Nothing outside the game's own folder, whatever the URL says.
  if (full !== root && !full.startsWith(root + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const body = await fs.promises.readFile(full);
    return new Response(body, {
      headers: {
        'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
        // An update swaps the files under the same address, so nothing may be cached.
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360,
    backgroundColor: '#060614',       // the title screen's own colour, so there is no white flash
    autoHideMenuBar: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      // The game's music must be able to start without a click first.
      autoplayPolicy: 'no-user-gesture-required',
      spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());

  // F11 and Alt+Enter toggle fullscreen. Esc is NOT bound: the game uses it to pause.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  // This window shows the game and nothing else.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://game/')) event.preventDefault();
  });

  if (process.argv.includes('--devtools')) win.webContents.openDevTools({ mode: 'detach' });
  win.loadURL('app://game/index.html');
}

if (!app.requestSingleInstanceLock()) {
  // A second copy would fight the first one over the same saved game.
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.megadash.game');
    Menu.setApplicationMenu(null);
    // The game needs no camera, location or anything else a page can ask for.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, done) => done(false));
    protocol.handle('app', serve);
    pruneOld();
    registerUpdater(() => win);
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
