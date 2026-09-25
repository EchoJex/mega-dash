/**
 * docs/autosave.js — HOW BOTH WEB APPS KEEP WHAT YOU WRITE.
 *
 * ONE COPY, SHARED, for the same reason `gh.js` is one copy: the tracker and
 * the sprite editor each grew their own saving code, the two drifted, and each
 * ended up holding half a lesson the other needed.
 *
 * ── WHAT THIS REPLACED, AND WHY IT HAD TO GO ──────────────────────────────
 *
 * The old design put your work in TWO places. Typing saved to a side branch
 * called `tracker-draft/main`, and a PUBLISH button moved it across to `main`,
 * which is the branch the game, the tools and Claude actually read. Three
 * things went wrong with that, over and over:
 *
 *   1. Forgetting PUBLISH left the work somewhere nothing reads. No error, no
 *      warning — the app said "saved", and it was, just not anywhere useful.
 *   2. The tracker had a branch dropdown and the sprite editor did not, so the
 *      two apps could be pointed at different branches with nothing on screen
 *      saying so. Picking the wrong one sent the work somewhere you would
 *      never think to look.
 *   3. Moving work between two branches is a merge, and a merge can fail. That
 *      is where the 409 errors came from.
 *
 * All three are the same root cause: A SECOND PLACE YOUR WORK CAN BE. So there
 * is no second place any more. There is one branch, `main`, and no button to
 * forget. The side branch, the PUBLISH button and the branch dropdown are all
 * gone.
 *
 * ── WHAT IT DOES INSTEAD ──────────────────────────────────────────────────
 *
 * Two steps, and the status line always tells you which one you are on:
 *
 *   you type or draw
 *     → straight away: THE KEEP — a copy in this browser's own storage. No
 *       network, so it cannot fail, and it survives closing the tab, losing
 *       signal, the battery dying, or the phone shutting the browser down.
 *     → a few seconds after you stop: GITHUB, on `main`.
 *
 * THE KEEP IS DELETED THE MOMENT GITHUB CONFIRMS THE WRITE. That is the whole
 * trick, and it makes one sentence true: IF THERE IS A KEEP, THERE IS WORK
 * THAT HAS NOT REACHED GITHUB. So when a page opens and finds a keep, it knows
 * without being told that the last session ended with something unsent — and
 * it puts it back and sends it, rather than quietly loading the older copy
 * from GitHub over the top of it. That recovery is what the old design had no
 * answer for at all.
 *
 * ── WHEN TWO COPIES DISAGREE ──────────────────────────────────────────────
 *
 * Every write here replaces the WHOLE file, so a tab holding an older copy
 * does not "conflict" — it silently reverts whatever it did not know about.
 * That ate seven tracker fields once. The guard is that every write names the
 * exact version it believes it is replacing (GitHub calls it a blob sha); if
 * the file has moved on, GitHub refuses the write instead of taking it.
 *
 * A refusal is not an error to show and give up on. It means this tab and
 * GitHub both changed the file — nearly always because Claude committed while
 * you were typing. So we fetch what is there now and hand both versions, plus
 * the version you started from, to the app's own `merge`. The tracker merges
 * field by field and keeps both sides. Nobody has to resolve anything by hand.
 */

import { OWNER, REPO, token, gh, b64encode, b64decode } from './gh.js';

/**
 * THE ONE BRANCH. Not a setting, not a dropdown, not remembered between
 * visits — a constant, so "which branch am I on?" stops being a question that
 * can have a wrong answer. CLAUDE.md's rule is that work lands on `main`
 * unless the owner asks otherwise, and asking otherwise means saying so to
 * Claude, not steering a web app onto a branch it cannot see the rest of.
 */
export const BRANCH = 'main';

/** Wait this long after the last change before writing to GitHub. */
const IDLE_MS = 6000;
/** Write the browser copy this soon after a change. Short enough to be safe. */
const KEEP_MS = 400;
/** Backoff when GitHub cannot be reached. The last figure repeats. */
const RETRY_MS = [4000, 10000, 30000, 60000];

const keepKey = (path) => `megadash_keep:${path}`;

/**
 * A timer that does not, on its own, hold a program open.
 *
 * In a browser this is the plain setTimeout it looks like. Under Node, where
 * the tests run, setTimeout hands back an object with an `unref` — "do not
 * stay running just for this one" — and without it a retry waiting on a
 * network that is never coming back keeps the whole test suite hanging.
 */
function later(fn, ms) {
  const h = setTimeout(fn, ms);
  h?.unref?.();
  return h;
}

/**
 * Browser storage throws rather than returning null in a few real situations —
 * private windows, a full quota, site data blocked. None of them should take
 * an app down, so every touch of it is wrapped and a failure just means this
 * safety net is not available on this device.
 */
function keepRead(path) {
  try {
    const raw = localStorage.getItem(keepKey(path));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function keepWrite(path, entry) {
  try { localStorage.setItem(keepKey(path), JSON.stringify(entry)); return true; }
  catch { return false; }
}
function keepClear(path) {
  try { localStorage.removeItem(keepKey(path)); } catch { /* already gone, or unavailable */ }
}

/** Every keep this browser is holding, for the "unsent work" check on startup. */
export function keptPaths() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('megadash_keep:')) out.push(k.slice('megadash_keep:'.length));
    }
  } catch { /* storage unavailable — nothing is kept, so nothing to list */ }
  return out;
}

/**
 * Make the thing that saves one app's files.
 *
 *   textNow()            → the file's current contents, as a string
 *   apply(text, how)     → replace what is on screen with this text.
 *                          `how` is 'restored' (your own unsent work came back)
 *                          or 'merged' (this tab and GitHub both changed it)
 *   merge(theirs, mine, base) → optional. Return the text that keeps both
 *                          sides. Left out, this tab's version wins.
 *   message(path)        → the commit message
 *   onState(state, note) → for the status line. States are 'idle', 'holding',
 *                          'sending', 'saved', 'offline' and 'blocked'.
 */
export function createSaver({ textNow, apply, merge, message, onState = () => {} }) {
  let path = null;
  let sha = null;        // the version on GitHub that `base` came from
  let base = null;       // the last text this tab and GitHub agreed on
  let sendTimer = null, keepTimer = null;
  let sending = false, again = false, tries = 0;

  const state = (s, note) => onState(s, note);
  const mine = () => (path ? textNow() : null);
  /**
   * No separate "there are unsaved changes" flag. A flag has to be set and
   * cleared in every branch of every path, and getting that wrong is precisely
   * how the old code ended up saying "saved" over work it had not saved.
   * Comparing the text to the last agreed copy cannot go out of step with
   * reality, because it IS reality.
   */
  const unsent = () => {
    if (path === null || base === null) return false;
    // `textNow` reaches into the app's own document, and there is a moment
    // during `open` where the app has been handed the text but has not put it
    // anywhere yet. Asking then is not an error — it just means there is
    // nothing to send at this instant.
    try { return textNow() !== base; } catch { return false; }
  };

  function stash() {
    if (!path) return;
    const text = textNow();
    if (text === base) { keepClear(path); return; }
    keepWrite(path, { text, sha, base, at: Date.now() });
  }

  /** Something changed on screen. */
  function touch() {
    if (!path) return;
    clearTimeout(keepTimer);
    keepTimer = later(stash, KEEP_MS);
    clearTimeout(sendTimer);
    sendTimer = later(() => { push(); }, IDLE_MS);
    tries = 0;
    state('holding');
  }

  /**
   * Send the restored work, but NOT UNTIL THE PAGE HAS PUT IT ON SCREEN.
   *
   * `open` hands the text back to the app, which then assigns it to whatever
   * it draws from. A microtask here ran BEFORE that assignment, so the saver
   * asked the app for its text while the app was still holding the previous
   * file — or nothing at all on the first load. A plain timer waits for the
   * caller to finish, which is all the ordering this needs.
   */
  function sendSoon() { later(() => push(), 0); }

  async function read(p) {
    const r = await gh(`/repos/${OWNER}/${REPO}/contents/${p}?ref=${BRANCH}&t=${Date.now()}`);
    return { text: b64decode(String(r.content).replace(/\n/g, '')), sha: r.sha };
  }

  /**
   * Open a file. Flushes whatever the last one was still holding first — the
   * sprite editor switches file every time you pick another sprite, and
   * "I changed sprite and lost my last stroke" is exactly the kind of quiet
   * loss this module exists to stop.
   *
   * Returns { text, restored, missing }. `missing` means the file is not in
   * the repo yet and the app should start from its own blank.
   */
  async function open(p) {
    await flush();
    clearTimeout(sendTimer); clearTimeout(keepTimer);
    path = p; sha = null; base = null; tries = 0;

    let live = null;
    try { live = await read(p); }
    catch (e) {
      if (!/404/.test(String(e.message))) throw e;
    }

    const kept = keepRead(p);
    if (!kept) {
      if (!live) { state('idle'); return { text: null, restored: false, missing: true }; }
      sha = live.sha; base = live.text;
      state('saved', 'up to date');
      return { text: live.text, restored: false, missing: false };
    }

    /**
     * THERE IS UNSENT WORK. Because the keep is deleted on every confirmed
     * write, its mere existence says the last session ended with something
     * that never reached GitHub — a closed tab, a dead battery, no signal.
     *
     * Which copy wins depends on whether GitHub moved in the meantime, and the
     * keep records the version it was built from so that question has a real
     * answer rather than a guess. Unmoved: this is simply newer, put it back.
     * Moved: both sides changed, which is the same situation as a refused
     * write, so it goes through the same merge rather than a second code path.
     */
    if (!live) {
      base = ''; sha = null;
      state('holding', 'unsent work restored');
      sendSoon();
      return { text: kept.text, restored: true, missing: false };
    }
    sha = live.sha;
    if (live.sha === kept.sha) {
      base = live.text;
      state('holding', 'unsent work restored');
      sendSoon();
      return { text: kept.text, restored: true, missing: false };
    }
    const merged = merge
      ? merge(live.text, kept.text, kept.base ?? live.text)
      : kept.text;
    base = live.text;
    state('holding', 'unsent work restored and merged');
    sendSoon();
    return { text: merged, restored: true, missing: false, merged: true };
  }

  async function put(text) {
    const body = {
      message: message(path),
      content: b64encode(text),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;
    const r = await gh(`/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.content.sha;
  }

  /**
   * GitHub refused the write because the file moved. Fetch what is there now,
   * combine it with this tab's version, put the result on screen, and let the
   * caller write again — the app is now holding something that contains both
   * sides, so the next write is no longer a revert.
   */
  async function reconcile() {
    const live = await read(path);
    const combined = merge ? merge(live.text, textNow(), base ?? live.text) : textNow();
    sha = live.sha;
    base = live.text;
    apply(combined, 'merged');
    stash();
  }

  /** Write to GitHub now, if there is anything to write. */
  async function push() {
    clearTimeout(sendTimer);
    if (!path || !unsent()) {
      if (path && base !== null) state('saved', 'up to date');
      return 'nothing';
    }
    if (!token()) { stash(); state('blocked', 'no access token'); return 'blocked'; }
    if (sending) { again = true; return 'busy'; }

    sending = true;
    state('sending');
    try {
      let text = textNow();
      try {
        sha = await put(text);
      } catch (e) {
        if (!/\b409\b/.test(String(e.message))) throw e;
        await reconcile();
        text = textNow();
        sha = await put(text);
      }
      base = text;
      keepClear(path);
      tries = 0;
      state('saved');
      return 'saved';
    } catch (e) {
      const msg = String(e.message || e);
      stash();
      if (msg === 'TOKEN_REJECTED') {
        state('blocked', 'access token rejected');
        return 'blocked';
      }
      /**
       * Anything else is treated as "GitHub is not reachable right now", which
       * on a phone it frequently is not. The work is in the keep, so this is a
       * delay rather than a loss — and saying so is the difference between the
       * owner trusting the app and the owner retyping a paragraph.
       */
      const wait = RETRY_MS[Math.min(tries++, RETRY_MS.length - 1)];
      clearTimeout(sendTimer);
      sendTimer = later(() => { push(); }, wait);
      state('offline', msg.slice(0, 80));
      return 'offline';
    } finally {
      sending = false;
      if (again) { again = false; later(() => push(), 0); }
    }
  }

  /** Write now and wait for it. Used before switching files and on the way out. */
  async function flush() {
    if (!path || !unsent()) return 'nothing';
    stash();
    return push();
  }

  /**
   * A phone does not reliably run anything when a tab closes, so the browser
   * copy is the real safety net and these are best-effort speed-ups: write
   * early when the app goes to the background, and try again when it comes
   * back or the network returns.
   */
  function watch() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { stash(); push(); }
      else if (unsent()) { tries = 0; push(); }
    });
    window.addEventListener('pagehide', () => { stash(); });
    window.addEventListener('online', () => { if (unsent()) { tries = 0; push(); } });
  }

  return {
    open, touch, push, flush, watch, stash,
    unsent,
    get path() { return path; },
    /** The app replaced the file wholesale — treat this as the agreed copy. */
    adopt(text, newSha) { base = text; sha = newSha; keepClear(path); },
  };
}
