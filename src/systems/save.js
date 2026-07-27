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

const BLANK = {
  hi: 0,
  runs: 0,
  dist: 0,
  bossKills: {},
  chips: 0,
  upgrades: {},
};

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...BLANK };
    const parsed = JSON.parse(raw);
    return { ...BLANK, ...parsed, bossKills: { ...parsed.bossKills }, upgrades: { ...parsed.upgrades } };
  } catch {
    return { ...BLANK };
  }
}

export function persist() {
  try {
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
 * FULL RESET — wipes every kind of client-side persistence this page could
 * have touched, then hard-reloads with a cache-busting param.
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
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* ignore */ }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* ignore */ }
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      dbs.forEach((d) => d.name && indexedDB.deleteDatabase(d.name));
    }
  } catch { /* ignore */ }
  location.replace(location.href.split('?')[0].split('#')[0] + '?reset=' + Date.now());
}
