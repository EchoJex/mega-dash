/**
 * THE WINDOWS UPDATE BUTTON — the twin of android/.../Updater.java.
 *
 *   TAP         newest build of main
 *   LONG-PRESS  a list of every branch with a live build; pick one
 *
 * It downloads the GAME'S FILES, not the window program. `MegaDash-<code>-game.asar`
 * (see updater-core.js) goes into the user's data folder, the window reloads, and
 * that is the whole update: no restart, no installer, and it works wherever the
 * .exe happens to sit, including a folder that cannot be written to.
 *
 * THE SAVE DOES NOT LIVE IN THOSE FILES. localStorage belongs to the window
 * program's own data folder, so replacing the game never touches it.
 *
 * Everything the player needs to read goes out through `say()`, which the page
 * shows on the title screen's note line. Android uses toasts; there is no such
 * thing here, and a dialog box for "Checking…" would be worse than silence.
 */
const { app, net, dialog, Menu, ipcMain } = require('electron');
const fs = require('fs');
// ELECTRON TREATS ANY `.asar` FILE AS A FOLDER, so the normal `fs` cannot rename,
// delete or size one. `original-fs` is Electron's own way round that: it sees the
// same file as a plain file. It is used for every operation on the archive
// ITSELF, and plain `fs` for reading INSIDE it (which is the point of an archive).
const ofs = require('original-fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const core = require('./updater-core');

const UA = 'MegaDash-Updater';
const API_LATEST = `https://api.github.com/repos/${core.REPO}/releases/latest`;
const API_RELEASES = `https://api.github.com/repos/${core.REPO}/releases?per_page=50`;

const stateDir = () => path.join(app.getPath('userData'), 'game');
const stateFile = () => path.join(stateDir(), 'current.json');

/** The game that shipped inside the .exe. Build 0: any published build is newer. */
const baselineRoot = () => (app.isPackaged
  ? path.join(process.resourcesPath, 'game')
  : path.join(__dirname, '..', 'dist'));

/** What the last update left behind, or null if none has happened (or it vanished). */
function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (s && s.file && ofs.existsSync(path.join(stateDir(), s.file))) return s;
  } catch { /* no state is a normal state */ }
  return null;
}

/** Where the game's files are served from right now. */
const gameRoot = () => {
  const s = readState();
  return s ? path.join(stateDir(), s.file) : baselineRoot();
};

const installedCode = () => (readState() || {}).code || 0;
const installedBranch = () => (readState() || {}).branch || null;

/**
 * Written to a temp name and renamed, so a crash mid-write can never leave a
 * half-file that reads as "no state" and quietly throws the update away.
 */
function writeState(state) {
  fs.mkdirSync(stateDir(), { recursive: true });
  const tmp = stateFile() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, stateFile());
}

/**
 * Delete every game file except the one in use. Done at STARTUP, before the
 * window opens, because Windows will not delete a file that is open and the
 * running game's archive stays open for as long as the window does.
 */
function pruneOld() {
  try {
    const keep = (readState() || {}).file;
    for (const f of fs.readdirSync(stateDir())) {
      if (/^game-.*\.asar(\.part)?$/.test(f) && f !== keep) {
        try { ofs.unlinkSync(path.join(stateDir(), f)); } catch { /* next launch */ }
      }
    }
  } catch { /* nothing to prune */ }
}

let busy = false;
let getWindow = () => null;

function say(msg) {
  const w = getWindow();
  if (w && !w.isDestroyed()) w.webContents.send('updater:message', msg);
}

async function json(url) {
  const res = await net.fetch(url, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  return res.json();
}

const fetchLatest = async () => core.channelFrom(await json(API_LATEST), 'main');
const fetchChannels = async () => core.channelsFrom(await json(API_RELEASES));

async function install(channel) {
  fs.mkdirSync(stateDir(), { recursive: true });
  /**
   * A fresh name every time, never `game-<code>.asar`. Reinstalling the build
   * you are on is a legitimate way to recover a bad install, and renaming a
   * file onto the archive the window currently has open fails on Windows.
   */
  const file = `game-${channel.code}-${Date.now().toString(36)}.asar`;
  const dest = path.join(stateDir(), file);
  const part = `${dest}.part`;

  say(`Downloading ${channel.branch} build ${channel.code}…`);
  const res = await net.fetch(channel.url, { headers: { 'User-Agent': UA } });
  if (!res.ok || !res.body) throw new Error(`download HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || channel.size || 0;

  let done = 0, mark = 25;
  const src = Readable.fromWeb(res.body);
  src.on('data', (b) => {
    done += b.length;
    // A word every quarter, so a slow connection still shows life.
    if (total && Math.floor((done * 100) / total) >= mark) {
      say(`Downloading build ${channel.code}… ${mark}%`);
      mark += 25;
    }
  });
  await pipeline(src, ofs.createWriteStream(part));
  if (total && ofs.statSync(part).size !== total) {
    ofs.unlinkSync(part);
    throw new Error('the download was cut short');
  }
  ofs.renameSync(part, dest);

  // The archive must actually contain a game before the window is pointed at it.
  if (!fs.existsSync(path.join(dest, 'index.html'))) {
    try { ofs.unlinkSync(dest); } catch { /* pruned next launch */ }
    throw new Error('the download was damaged');
  }

  writeState({ file, code: channel.code, branch: channel.branch });
  const w = getWindow();
  if (w && !w.isDestroyed()) {
    w.webContents.once('did-finish-load',
      () => say(`Updated to ${channel.branch} build ${channel.code}`));
    w.webContents.reloadIgnoringCache();
  }
}

async function run(job) {
  if (busy) return say('Update already in progress…');
  busy = true;
  try { await job(); } catch (e) { say(`Update failed: ${core.describe(e)}`); } finally { busy = false; }
}

/** TAP — newest main. */
const tap = () => run(async () => {
  say('Checking for updates…');
  const latest = await fetchLatest();
  const d = core.decideTap({ installed: installedCode(), installedBranch: installedBranch(), latest });
  if (d.install) await install(latest); else say(d.message);
});

/** After the player has chosen a channel from the list. */
async function choose(channel) {
  await run(async () => {
    const installed = installedCode();
    if (core.isOlder(channel, installed)) {
      const w = getWindow();
      const { response } = await dialog.showMessageBox(w, {
        type: 'warning', buttons: ['Go back', 'Cancel'], defaultId: 1, cancelId: 1,
        title: 'Older build',
        message: `${channel.branch} build ${channel.code} is older than the one you are on (${installed}).`,
        detail: 'Going back can reset your saved progress if the save format changed in between.',
      });
      if (response !== 0) return;
    }
    await install(channel);
  });
}

/** LONG-PRESS — a menu at the pointer listing every channel. */
function pick() {
  if (busy) return say('Update already in progress…');
  busy = true;
  say('Loading build channels…');
  fetchChannels().then((channels) => {
    busy = false;
    if (!channels.length) return say('No channels found');
    const installed = installedCode();
    const menu = Menu.buildFromTemplate([
      { label: 'Update from channel', enabled: false },
      { type: 'separator' },
      ...channels.map((c, i) => ({ label: core.labelFor(c, installed, i), click: () => choose(c) })),
      { type: 'separator' },
      { label: 'Cancel' },
    ]);
    menu.popup({ window: getWindow() });
    return undefined;
  }).catch((e) => { busy = false; say(`Update failed: ${core.describe(e)}`); });
}

function registerUpdater(windowGetter) {
  getWindow = windowGetter;
  ipcMain.on('updater:check', tap);
  ipcMain.on('updater:pick', pick);
}

module.exports = { registerUpdater, gameRoot, pruneOld };
