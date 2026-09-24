/**
 * SAVE — persistent (meta) state only.
 *
 * Everything here survives between runs. Anything that resets each run lives in
 * the run state object instead (see scenes/GameScene.js), never here.
 *
 * Persisted:
 *   hi         best score
 *   runs/dist  lifetime totals
 *   bossKills  per-boss lifetime clears -> drives boss LAYER escalation
 *   chips      meta currency
 *   upgrades   purchased meta upgrade levels
 *
 * Deliberately NOT persisted: EXP, player level, weapon levels, unlocked
 * weapons. Those are run-scoped by design.
 */

const KEY = 'megadash_save_v1';

/**
 * THE SAVE BREAK — bump `n` when a change makes existing saves WRONG.
 *
 * This game is in development and will be for a long time, so losing save data
 * is normal and expected. What is NOT acceptable is losing it silently, or
 * carrying compatibility shims forever to avoid losing it: both make every
 * later change more expensive than the save was worth.
 *
 * So the deal is explicit. A save carries the break number it was written
 * under; a mismatch is wiped on the spot and the title screen says so, in the
 * owner's own words, once. That is the whole mechanism — there is no migration
 * path and there is deliberately not going to be one.
 *
 * `note` is shown verbatim, so write it for whoever taps UPDATE and finds their
 * chips gone. If a build needs a full uninstall and reinstall rather than just
 * a wipe, SAY THAT HERE — it is the one line anybody reads about it.
 */
export const SAVE_BREAK = {
  n: 1,
  /**
   * ONE LINE, 44 CHARACTERS AT THE ABSOLUTE MOST, AND `-` RATHER THAN `—`.
   *
   * It is drawn in the HUD bitmap font on the title screen's note line, and
   * the playfield is 320 virtual pixels wide at its narrowest. THE FONT'S
   * ADVANCE IS ~7 PIXELS, not the 5 the glyph is drawn in — so 45 glyphs fit
   * and the 46th clips, at BOTH ends, with nothing on screen to say it did.
   * Two earlier drafts of this very note overflowed; the number came off a
   * screenshot rather than the arithmetic, which is the house rule for this
   * font and the reason it is written down here.
   *
   * One line rather than two because the band between the UPDATE hint and the
   * full reset link is 20 pixels tall and a second line lands on one of them.
   * Any character the font lacks is drawn as `?`; the em dash is one of them.
   */
  note: 'SAVE RESET - CHIPS AND LAYERS ARE FRESH',
};

const BLANK = {
  n: SAVE_BREAK.n,
  hi: 0,
  runs: 0,
  dist: 0,
  bossKills: {},
  chips: 0,
  upgrades: {},
};

/**
 * True when THIS boot threw an older save away, so the title screen can say so.
 * Read once and only meaningful for the life of the process.
 */
export let saveWiped = false;

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...BLANK };
    const parsed = JSON.parse(raw);
    // A DIFFERENT BREAK NUMBER IS A WIPE, not a merge. An older save read
    // through the spread below would look valid and play wrong.
    if (parsed.n !== SAVE_BREAK.n) {
      saveWiped = true;
      return { ...BLANK };
    }
    // Same break, so the shape is known. The spread is still here because a
    // field can be ADDED without breaking anything, and a missing key must
    // default rather than crash the boot.
    return { ...BLANK, ...parsed, bossKills: { ...parsed.bossKills }, upgrades: { ...parsed.upgrades } };
  } catch {
    return { ...BLANK };
  }
}

export function persist() {
  try {
    save.n = SAVE_BREAK.n;
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private browsing / quota — fail silently, the game still plays */
  }
}

export function recordBossKill(id) {
  save.bossKills[id] = (save.bossKills[id] || 0) + 1;
  persist();
}

/**
 * FULL RESET — wipes every kind of local persistence this build could have
 * touched, then hard-reloads.
 *
 * Kept because iterative development regularly leaves stale save shapes behind
 * and "is this a bug or is it my old save?" is expensive to debug.
 */
export async function fullReset() {
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  try {
    document.cookie.split(';').forEach((c) => {
      const n = c.split('=')[0].trim();
      if (n) document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  } catch { /* ignore */ }
  // NOTE: service-worker unregistration and Cache Storage clearing used to live
  // here. Both were removed with the rest of the networked-distribution code —
  // nothing in this project ever registered a service worker, and the game ships
  // as a bundled APK with no remote content to cache.
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      dbs.forEach((d) => d.name && indexedDB.deleteDatabase(d.name));
    }
  } catch { /* ignore */ }
  location.replace(location.href.split('?')[0].split('#')[0] + '?reset=' + Date.now());
}
