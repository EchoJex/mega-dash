/**
 * THE WINDOWS APP'S UPDATE LOGIC, and the few places where two files have to
 * agree. None of this opens a window or touches the network; the part that does
 * was driven in a real Electron run (see desktop/ and the README).
 *
 * `updater-core.js` is plain CommonJS so it can be loaded here directly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../desktop/updater-core.js');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const release = (body, names) => ({
  body, assets: names.map((name) => ({ name, browser_download_url: `https://x/${name}`, size: 9 })),
});

test('a channel takes its build number from the FILE, not the release notes', () => {
  // The notes are rewritten the moment the APK job publishes; the game file
  // arrives minutes later. In between, notes say 1100 and the file is 1099.
  const c = core.channelFrom(
    release('versionCode=1100\nbranch=main\nabc', ['MegaDash-1100.apk', 'MegaDash-1099-game.asar']), 'x');
  assert.equal(c.code, 1099);
  assert.equal(c.branch, 'main');
  assert.equal(c.url, 'https://x/MegaDash-1099-game.asar');
});

test('a release with no game file is not a channel', () => {
  assert.equal(core.channelFrom(release('versionCode=5\nbranch=main', ['MegaDash-5.apk']), 'main'), null);
  assert.equal(core.channelFrom(null, 'main'), null);
});

test('the branch falls back to the tag when the notes do not say', () => {
  const c = core.channelFrom(release('nothing useful', ['MegaDash-7-game.asar']), 'ch-fallback');
  assert.equal(c.branch, 'ch-fallback');
});

test('the channel list keeps only ch-* releases, newest build first', () => {
  const list = core.channelsFrom([
    { tag_name: 'latest', ...release('branch=main', ['MegaDash-9-game.asar']) },
    { tag_name: 'ch-a', ...release('branch=a', ['MegaDash-3-game.asar']) },
    { tag_name: 'ch-b', ...release('branch=b', ['MegaDash-8-game.asar']) },
    { tag_name: 'ch-empty', ...release('branch=e', ['MegaDash-8.apk']) },
  ]);
  assert.deepEqual(list.map((c) => c.branch), ['b', 'a']);
});

test('a tap installs only something newer, and never silently steps a branch back to main', () => {
  const latest = { code: 1200, branch: 'main' };
  assert.equal(core.decideTap({ installed: 0, installedBranch: null, latest }).install, true);
  assert.equal(core.decideTap({ installed: 1100, installedBranch: 'main', latest }).install, true);

  const same = core.decideTap({ installed: 1200, installedBranch: 'main', latest });
  assert.equal(same.install, false);
  assert.match(same.message, /up to date/i);

  // On a branch whose number is higher than main's: told so, and nothing happens,
  // because going back can wipe the save.
  const onBranch = core.decideTap({ installed: 1300, installedBranch: 'feature', latest });
  assert.equal(onBranch.install, false);
  assert.match(onBranch.message, /feature/);
  assert.match(onBranch.message, /Hold UPDATE/);

  assert.equal(core.decideTap({ installed: 0, installedBranch: null, latest: null }).install, false);
});

test('the list says newer, installed or older, and only older asks first', () => {
  const c = (code) => ({ branch: 'main', code });
  assert.match(core.labelFor(c(5), 3, 1), /newer/);
  assert.match(core.labelFor(c(3), 3, 1), /installed/);
  assert.match(core.labelFor(c(2), 3, 1), /older/);
  assert.match(core.labelFor(c(5), 3, 0), /\(latest\)/);
  assert.equal(core.isOlder(c(2), 3), true);
  assert.equal(core.isOlder(c(3), 3), false);   // reinstalling the same build is allowed
});

test('errors are reported in words a person can act on', () => {
  assert.equal(core.describe({ code: 'ENOTFOUND' }), 'no internet connection');
  assert.equal(core.describe(new Error('net::ERR_INTERNET_DISCONNECTED')), 'no internet connection');
  assert.equal(core.describe({ code: 'ETIMEDOUT' }), 'the network timed out');
  assert.equal(core.describe(new Error('the download was damaged')), 'the download was damaged');
});

test('the page only trusts the Windows bridge if it says so in exactly the same word', () => {
  // Two files have to spell `desktop` the same way. If one is changed alone
  // nothing crashes: the title screen just stops showing update messages.
  assert.match(read('desktop/preload.js'), /desktop:\s*true/);
  assert.match(read('src/systems/updater.js'), /p\?\.desktop === true/);
});

test('the Windows tools stay out of the game\'s own install', () => {
  // Electron downloads ~100MB when it installs. In the root package.json it
  // would be fetched on every APK build, for a job the APK does not need.
  const root = JSON.parse(read('package.json'));
  const all = { ...root.dependencies, ...root.devDependencies };
  assert.equal(all.electron, undefined);
  assert.equal(all['electron-builder'], undefined);
  // And the pinned version has no range in it, so the Chromium inside never moves by itself.
  const desktop = JSON.parse(read('desktop/package.json'));
  assert.match(desktop.devDependencies.electron, /^\d+\.\d+\.\d+$/);
});

test('the APK job only ever deletes APKs, so the Windows game files survive it', () => {
  const wf = read('.github/workflows/build-apk.yml');
  assert.match(wf, /grep -E '\^MegaDash-\[0-9\]\+\\\.apk\$'/);
});
