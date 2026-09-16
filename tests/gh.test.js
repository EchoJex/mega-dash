/**
 * docs/gh.js — the GitHub plumbing both web apps share.
 *
 * ONE thing is tested here and it is the reason the module exists: a rejected
 * token must degrade the app to READ-ONLY, never blank it. The tracker learned
 * that the hard way and the sprite editor carried its own copy that had not,
 * so one mistyped character in the token box took the whole editor down.
 *
 * `localStorage` and `fetch` are stubbed rather than reached for — this runs in
 * the 0.1s suite, not in a browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};

/** GitHub on a public repo: anonymous reads pass, everything with a bad token 401s. */
const calls = [];
globalThis.fetch = async (url, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  calls.push({ method, auth: !!(opts.headers || {}).Authorization });
  const bad = { ok: false, status: 401, statusText: 'Unauthorized', text: async () => '{}' };
  if ((opts.headers || {}).Authorization) return bad;
  if (method !== 'GET') return bad;
  return { ok: true, status: 200, text: async () => '{"ok":true}' };
};

const { gh, setToken, token, tokenRejected } = await import('../docs/gh.js');

test('a rejected token leaves reads working and says so', async () => {
  setToken('bad-token');
  assert.equal(tokenRejected(), false, 'a freshly typed token has not been rejected yet');

  assert.deepEqual(await gh('/repos/EchoJex/mega-dash'), { ok: true },
    'a public read must survive a bad token — blanking the app is far worse than "saving is off"');
  assert.equal(tokenRejected(), true, 'the UI needs to know saving is off NOW, not in an hour');
  assert.deepEqual(calls.map((c) => c.auth), [true, false], 'the retry must drop the token');
});

test('a write still fails loudly once the token is known bad', async () => {
  await assert.rejects(() => gh('/repos/EchoJex/mega-dash/git/refs', { method: 'POST' }),
    /401/, 'a silent no-op write is how edits get lost');
});

test('setToken forgets the rejection of the old token', () => {
  setToken('');
  assert.equal(tokenRejected(), false);
  assert.equal(token(), '', 'clearing must actually clear');
});

test('a 204 has no body and must not throw', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 204, text: async () => '' });
  assert.equal(await gh('/repos/EchoJex/mega-dash/merges', { method: 'POST' }), null,
    '/merges returns 204 when there is nothing to merge; res.json() on that throws');
});
