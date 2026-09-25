/**
 * docs/autosave.js — keeping what the owner writes.
 *
 * THESE TESTS ARE THE FAILURES THAT ACTUALLY HAPPENED, not a checklist. The
 * old design could put work somewhere nothing reads and say "saved", and the
 * owner hit that three separate ways: forgetting the PUBLISH button, the two
 * apps pointing at different branches, and errors nobody could explain. So
 * what is checked here is the one promise the module makes — WORK THAT HAS
 * NOT REACHED GITHUB IS STILL THERE WHEN YOU COME BACK — plus the two ways it
 * could be quietly broken: a save that drops the browser copy too early, and a
 * write that reverts somebody else's changes.
 *
 * `localStorage` and `fetch` are stubs. This runs in the 0.1s suite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i],
  get length() { return store.size; },
};

const PATH = 'design/TRACKER.md';
const KEEP = `megadash_keep:${PATH}`;
const enc = (s) => Buffer.from(s, 'utf8').toString('base64');

/**
 * A stand-in GitHub holding one file. `fail` makes every write throw, which is
 * what a phone with no signal looks like from in here.
 */
function stubGitHub({ text = 'v1', sha = 'sha1', fail = null } = {}) {
  const state = { text, sha, writes: 0 };
  globalThis.fetch = async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase();
    const ok = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });
    const err = (s, t) => ({ ok: false, status: s, statusText: t, text: async () => `{"message":"${t}"}` });
    if (method === 'GET') return ok({ content: enc(state.text), sha: state.sha });
    if (fail) return err(fail, 'nope');
    const body = JSON.parse(opts.body);
    // The real API refuses a write whose named version is not the current one.
    if ((body.sha || null) !== state.sha) return err(409, 'Conflict');
    state.text = Buffer.from(body.content, 'base64').toString('utf8');
    state.sha = `sha${++state.writes + 1}`;
    return ok({ content: { sha: state.sha } });
  };
  return state;
}

const { setToken } = await import('../docs/gh.js');
const { createSaver } = await import('../docs/autosave.js');

/** A saver over one string, the way both apps use it. */
function makeSaver(merge) {
  const held = { text: '' };
  const saver = createSaver({
    textNow: () => held.text,
    apply: (t) => { held.text = t; },
    merge,
    message: () => 'test',
    onState: () => {},
  });
  return { saver, held };
}

test('work that never reached GitHub comes back next time the page opens', async () => {
  setToken('good');
  stubGitHub({ text: 'v1', sha: 'sha1', fail: 500 });     // GitHub is unreachable
  const a = makeSaver();
  await a.saver.open(PATH);
  a.held.text = 'the owner typed this';
  await a.saver.push();

  assert.ok(store.has(KEEP), 'unsent work must be kept in the browser, or closing the tab loses it');

  // The tab closes. A new one opens, and GitHub still only has the old copy.
  stubGitHub({ text: 'v1', sha: 'sha1' });
  const b = makeSaver();
  const got = await b.saver.open(PATH);
  assert.equal(got.text, 'the owner typed this',
    'this is the whole point: the older copy from GitHub must not load over the top of it');
  assert.equal(got.restored, true, 'and the page has to be able to say so');
});

test('the browser copy is dropped only once GitHub has confirmed the write', async () => {
  setToken('good');
  const remote = stubGitHub({ text: 'v1', sha: 'sha1' });
  const { saver, held } = makeSaver();
  await saver.open(PATH);
  held.text = 'v2';

  assert.equal(await saver.push(), 'saved');
  assert.equal(remote.text, 'v2');
  assert.ok(!store.has(KEEP),
    'a keep that outlives its save would restore stale work over newer work later');
});

test('a save that lands while Claude is committing keeps both sides', async () => {
  setToken('good');
  const remote = stubGitHub({ text: 'base', sha: 'sha1' });
  const { saver, held } = makeSaver(
    // Stand-in for mergeTracker / mergeSprite: keep a line from each side.
    (theirs, mine) => `${theirs}+${mine}`,
  );
  await saver.open(PATH);
  held.text = 'owner edit';

  // Claude commits before the owner's save goes out, so the version this tab
  // named is no longer current and GitHub refuses the write.
  remote.text = 'claude edit'; remote.sha = 'moved';

  assert.equal(await saver.push(), 'saved');
  assert.match(remote.text, /claude edit/, "the owner's tab must not revert Claude's commit");
  assert.match(remote.text, /owner edit/, 'and the owner must not lose what they typed');
  assert.ok(!store.has(KEEP), 'the merged result did reach GitHub, so nothing is outstanding');
});

test('switching file writes out what the last one was still holding', async () => {
  setToken('good');
  const remote = stubGitHub({ text: 'sprite A', sha: 'sha1' });
  const { saver, held } = makeSaver();
  await saver.open('design/sprites/a.sprite');
  held.text = 'a last stroke';
  await saver.open('design/sprites/b.sprite');
  assert.equal(remote.text, 'a last stroke',
    '"I picked another sprite and lost my last stroke" is exactly the quiet loss this stops');
});

test('a missing file is reported, not invented', async () => {
  setToken('good');
  globalThis.fetch = async () => ({
    ok: false, status: 404, statusText: 'Not Found', text: async () => '{}',
  });
  const { saver } = makeSaver();
  const got = await saver.open('design/sprites/never-drawn.sprite');
  assert.equal(got.missing, true, 'the editor starts a new sprite from its own blank on this');
});
