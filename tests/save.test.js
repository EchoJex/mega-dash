/**
 * THE SAVE BREAK — the deal that replaced open-ended save compatibility.
 *
 * The game is in development and losing save data is normal. What must never
 * happen is losing it SILENTLY, or an older save surviving into a build whose
 * shape it no longer matches — so the break number is checked, a mismatch is
 * wiped, and `saveWiped` is what the title screen says it out loud from.
 *
 * localStorage is stubbed rather than reached for; this runs in the 0.1s suite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const KEY = 'megadash_save_v1';
/** save.js reads localStorage at import, so each case needs its own module. */
const boot = async (stored) => {
  store.clear();
  if (stored !== undefined) store.set(KEY, JSON.stringify(stored));
  return import(`../src/systems/save.js?case=${Math.random()}`);
};

test('a save from an older break is wiped, and says so', async () => {
  const { save, saveWiped, SAVE_BREAK } = await boot({
    n: -1, hi: 9999, chips: 500, bossKills: { core: 3 }, upgrades: { magnet: 2 },
  });
  assert.equal(saveWiped, true, 'the title screen has nothing to announce without this');
  assert.equal(save.chips, 0);
  assert.equal(save.hi, 0);
  assert.deepEqual(save.bossKills, {});
  assert.equal(save.n, SAVE_BREAK.n);
});

test('a save with NO break number at all is wiped', async () => {
  // Every save written before the break existed looks like this, so this is
  // the case that actually fires on the update that introduces it.
  const { save, saveWiped } = await boot({ hi: 1234, chips: 77 });
  assert.equal(saveWiped, true);
  assert.equal(save.hi, 0);
  assert.equal(save.chips, 0);
});

test('a save from the current break is kept untouched', async () => {
  const mod = await boot(undefined);
  const cur = mod.SAVE_BREAK.n;
  const { save, saveWiped } = await boot({
    n: cur, hi: 4242, chips: 300, bossKills: { blaze: 2 }, upgrades: { magnet: 1 },
  });
  assert.equal(saveWiped, false, 'wiping a valid save is the one unforgivable bug here');
  assert.equal(save.hi, 4242);
  assert.equal(save.chips, 300);
  assert.deepEqual(save.bossKills, { blaze: 2 });
});

test('a field added without a break still defaults instead of crashing', async () => {
  const mod = await boot(undefined);
  const { save, saveWiped } = await boot({ n: mod.SAVE_BREAK.n, hi: 10 });
  assert.equal(saveWiped, false);
  assert.equal(save.runs, 0, 'a key the old save never had must default, not read undefined');
  assert.deepEqual(save.upgrades, {});
});

test('a fresh install is not a wipe', async () => {
  const { saveWiped, save } = await boot(undefined);
  assert.equal(saveWiped, false, 'nothing was lost, so nothing should be announced');
  assert.equal(save.chips, 0);
});

test('corrupt JSON degrades to a blank save without throwing', async () => {
  store.clear();
  store.set(KEY, '{not json');
  const { save } = await import(`../src/systems/save.js?case=${Math.random()}`);
  assert.equal(save.chips, 0);
});

test('the note is written for a person, not for a log line', async () => {
  const { SAVE_BREAK } = await boot(undefined);
  assert.ok(SAVE_BREAK.note.length > 10, 'this is the only thing anyone reads about it');
  assert.equal(typeof SAVE_BREAK.n, 'number');
});

test('persisting stamps the current break', async () => {
  const mod = await boot(undefined);
  mod.save.chips = 42;
  mod.persist();
  assert.equal(JSON.parse(store.get(KEY)).n, mod.SAVE_BREAK.n,
    'an unstamped write would wipe itself on the very next boot');
});
