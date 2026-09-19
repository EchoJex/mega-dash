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

/**
 * PUBLISH IS THE OTHER REASON THIS MODULE EXISTS, and it earned a test the
 * expensive way. The sprite editor carried its own fast-forward-then-merge and
 * had drifted into a copy missing two of the four things the tracker's knew:
 * it caught EVERY error on the fast-forward rather than only the 422, and it
 * never reset the draft branch afterwards. The second one is the quiet killer —
 * the draft then diverges from the working branch forever, and since the editor
 * opens from the draft in preference to the working branch, the artist is
 * silently pinned to a stale fork of every file they draw. It took
 * `design/sprites/player.sprite` all the way to unpublishable.
 */
const ref = (b) => `/repos/EchoJex/mega-dash/git/refs/heads/${b}`;
const DRAFT = 'tracker-draft/main';

/**
 * A GitHub stand-in that records every write. `ff` / `merge` / `conflict` pick
 * what the working branch does when we try to move it.
 */
function stubGitHub(mode) {
  const seen = [];
  globalThis.fetch = async (url, opts = {}) => {
    const path = url.replace('https://api.github.com', '').replace(/[?&]t=\d+/, '');
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : null;
    seen.push({ method, path, body });
    const ok = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });
    const err = (s, t) => ({ ok: false, status: s, statusText: t, text: async () => `{"message":"${t}"}` });

    if (method === 'GET' && path.startsWith('/repos/EchoJex/mega-dash/git/ref/heads/')) {
      return ok({ object: { sha: path.endsWith('/main') ? 'MAINSHA' : 'DRAFTSHA' } });
    }
    if (method === 'PATCH' && path === ref('main')) {
      return mode === 'ff' ? ok({}) : err(422, 'Unprocessable Entity');
    }
    if (method === 'POST' && path === '/repos/EchoJex/mega-dash/merges') {
      return mode === 'conflict' ? err(409, 'Conflict') : ok({});
    }
    if (method === 'PATCH' && path === ref(DRAFT)) return ok({});
    return err(404, 'Not Found');
  };
  return seen;
}

const { publishDraft } = await import('../docs/gh.js');

test('a fast-forward publish resets the draft onto what it published', async () => {
  setToken('good-token');
  const seen = stubGitHub('ff');
  assert.equal(await publishDraft('main', 'tracker: publish'), 'ff');

  const reset = seen.find((c) => c.method === 'PATCH' && c.path === ref(DRAFT));
  assert.ok(reset, 'without this the draft diverges further on every publish, forever');
  assert.deepEqual(reset.body, { sha: 'MAINSHA', force: true },
    'the draft has to land on the WORKING branch head, and only a force gets it there');
});

test('a working branch that moved is merged, not clobbered — and still resets', async () => {
  setToken('good-token');
  const seen = stubGitHub('merge');
  assert.equal(await publishDraft('main', 'tracker: publish'), 'merge',
    "the caller re-reads the file on 'merge'; every write in both apps is a whole-file PUT");

  assert.ok(seen.some((c) => c.path === '/repos/EchoJex/mega-dash/merges'));
  assert.ok(seen.some((c) => c.method === 'PATCH' && c.path === ref(DRAFT)));
});

test('a real conflict is tagged, and publishes nothing', async () => {
  setToken('good-token');
  const seen = stubGitHub('conflict');
  await assert.rejects(() => publishDraft('main', 'tracker: publish'), /^Error: MERGE_CONFLICT$/,
    'untagged, this reached the status pill as the first 60 characters of GitHub\'s own JSON body');

  assert.ok(!seen.some((c) => c.method === 'PATCH' && c.path === ref(DRAFT)),
    'nothing was published, so resetting the draft would throw the work away');
});

test('only a 422 means the branch moved', async () => {
  setToken('good-token');
  const seen = stubGitHub('ff');
  const base = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const path = url.replace('https://api.github.com', '').replace(/[?&]t=\d+/, '');
    if ((opts.method || 'GET').toUpperCase() === 'PATCH' && path === ref('main')) {
      seen.push({ method: 'PATCH', path, body: null });
      return { ok: false, status: 403, statusText: 'Forbidden', text: async () => '{"message":"rate limited"}' };
    }
    return base(url, opts);
  };
  await assert.rejects(() => publishDraft('main', 'tracker: publish'), /403/,
    'a rate limit sent down the merge path comes back as a second, less honest error');
  assert.ok(!seen.some((c) => c.path === '/repos/EchoJex/mega-dash/merges'),
    'a 403 is not "the branch moved" and must never attempt a merge');
});
