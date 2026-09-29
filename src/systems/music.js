/**
 * MUSIC — background tracks, downloaded once and kept on the phone.
 *
 * WHY THIS IS NOT IN THE APK
 * --------------------------
 * Every push builds an APK and the in-app updater downloads the whole thing, so
 * anything inside it is re-downloaded for every one-line fix. Music is the one
 * asset big enough for that to hurt (3MB+ a track, dozens of tracks), so it
 * lives in `design/music/` in the repo and the game fetches it from there. Sound
 * effects are the opposite and stay built in — see `sfx.js`.
 *
 * HOW A TRACK REACHES THE SPEAKER
 * -------------------------------
 *   1. `syncMusic()` reads `pack.json` — a short list of track names, each with
 *      a fingerprint of the file's exact bytes (`npm run music` writes it).
 *   2. Any track the phone does not hold AT THAT FINGERPRINT is downloaded in
 *      the background, one at a time, checked against the fingerprint, and put
 *      in the browser's Cache Storage. A track held under an old fingerprint is
 *      deleted once its replacement lands.
 *   3. `playMusic(name)` plays the stored copy. If there is none yet, that is
 *      silence — and the moment the download lands, the track starts.
 *
 * Cache Storage lives in the app's own data on the phone. An APK update keeps
 * it (the same app, signed with the same key, updated in place); an uninstall
 * or "clear storage" removes it, and the next launch downloads it again.
 *
 * OFFLINE IS NORMAL. No signal means the last list the phone saw is used and
 * whatever it holds still plays. Nothing here may throw or make the game wait:
 * every failure is silence, the same contract `sfx.js` keeps.
 *
 * WHY A MEDIA ELEMENT AND NOT A DECODED BUFFER
 * --------------------------------------------
 * `decodeAudioData` unpacks a whole track into raw samples up front: a
 * three-minute stereo track is ~70MB of memory at 48kHz. An <audio> element
 * streams from the compressed file (a few MB) and is routed through the same
 * WebAudio graph, so the MUSIC and MASTER sliders and the fades still apply.
 */
import { audioGraph } from './sfx.js';

/**
 * Where the pack lives. `npm run dev` serves the working copy, so a track
 * dropped into `design/music/` can be heard before it is pushed. Every built
 * game — the APK included — reads `main` on GitHub, whichever branch it was
 * built from: there is one music pack, and it is the one on `main`.
 */
const BASE = import.meta.env?.DEV
  ? '/design/music/'
  : 'https://raw.githubusercontent.com/EchoJex/mega-dash/main/design/music/';

const CACHE = 'megadash-music-v1';
const PACK_KEY = 'megadash_music_pack_v1';

/** The track names the game asks for. The filename is the name plus `.ogg`. */
export const TRACK = {
  menu: 'bgm-menu-main',
  postFight: 'bgm-post-fight',
  stage: (bossId) => `bgm-${bossId}-stage`,
  arena: (bossId) => `bgm-${bossId}-arena`,
};

let pack = null;            // { tracks: { name: { file, bytes, sha } } }
const ready = new Map();    // name -> object URL of the stored copy
let syncing = null;

let wanted = null;          // { name, fadeIn } — what the game is asking for
let now = null;             // { name, el, gain } — what is actually playing
let parked = null;          // the fight's track, waiting out the pause menu
let rate = 1;               // follows the game's own speed (slow motion)
let hidden = false;

const keyFor = (t) => `${BASE}${t.file}?v=${t.sha}`;
const hasCaches = () => typeof caches !== 'undefined';

/**
 * Read the list, fetch what is missing, forget what is stale. Safe to call more
 * than once; a second call joins the first.
 */
export function syncMusic() {
  if (!syncing) syncing = doSync().catch(() => {}).finally(() => { syncing = null; });
  return syncing;
}

async function doSync() {
  let fresh = false;
  try {
    const r = await fetch(`${BASE}pack.json`, { cache: 'no-store' });
    if (r.ok) {
      pack = await r.json();
      fresh = true;
      try { localStorage.setItem(PACK_KEY, JSON.stringify(pack)); } catch { /* fine */ }
    }
  } catch { /* offline */ }
  if (!pack) {
    try { pack = JSON.parse(localStorage.getItem(PACK_KEY) || 'null'); } catch { pack = null; }
  }
  if (!pack?.tracks) return;

  // No Cache Storage (an insecure page, e.g. `npm run dev` opened by IP on a
  // phone): stream straight from the URL every time. Nothing is kept.
  if (!hasCaches()) {
    for (const [name, t] of Object.entries(pack.tracks)) ready.set(name, `${BASE}${t.file}`);
    startIfWanted();
    return;
  }

  const cache = await caches.open(CACHE);
  const keep = new Set();
  // The wanted track first, so the thing you are listening for arrives first.
  const names = Object.keys(pack.tracks)
    .sort((a, b) => (b === wanted?.name) - (a === wanted?.name));
  for (const name of names) {
    const t = pack.tracks[name];
    const key = keyFor(t);
    keep.add(key);
    let hit = await cache.match(key);
    if (!hit) {
      try {
        const r = await fetch(`${BASE}${t.file}?v=${t.sha}`);
        if (!r.ok) continue;
        const bytes = await r.arrayBuffer();
        // A copy that does not match its fingerprint — a half-finished
        // download, or a server still handing out the previous version — is
        // not kept. The next launch tries again.
        if ((await shaOf(bytes)) !== t.sha) continue;
        await cache.put(key, new Response(bytes, { headers: { 'Content-Type': mimeOf(t.file) } }));
        hit = await cache.match(key);
      } catch { continue; }
    }
    if (!hit) continue;
    if (!ready.has(name)) ready.set(name, URL.createObjectURL(await hit.blob()));
    startIfWanted();
  }
  // Only a list read fresh from GitHub may delete anything: an offline launch
  // reading an old list must never throw away a track that has since arrived.
  if (fresh) {
    for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
  }
}

async function shaOf(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function mimeOf(file) {
  if (/\.mp3$/i.test(file)) return 'audio/mpeg';
  if (/\.wav$/i.test(file)) return 'audio/wav';
  if (/\.m4a$/i.test(file)) return 'audio/mp4';
  return 'audio/ogg';
}

/**
 * Ask for a track. The same track again is a no-op, so a scene may call this
 * every time it opens. A name with no file (most bosses, today) is silence —
 * the old track still fades out, because music that carries on into a place
 * it does not belong reads as a bug.
 *
 *   fadeIn   ms for the new track to reach full volume
 *   fadeOut  ms for the old one to go, if it has not already been faded
 */
export function playMusic(name, { fadeIn = 1000, fadeOut = 500, sync = false } = {}) {
  const at = performance.now();
  if (now?.name === name && !now.leaving) { wanted = { name, fadeIn, at, sync }; return; }
  wanted = { name, fadeIn, at, sync };
  stopMusic(fadeOut);
  startIfWanted();
}

/** Fade whatever is playing to nothing over `ms`, and want nothing after it. */
export function fadeOutMusic(ms = 500) {
  wanted = null;
  stopMusic(ms);
}

function stopMusic(ms) {
  const cur = now;
  if (!cur) return;
  now = null;
  if (cur.leaving) return;
  cur.leaving = true;
  const g = audioGraph();
  if (g) {
    const t = g.ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
    cur.gain.gain.linearRampToValueAtTime(0, t + ms / 1000);
  }
  setTimeout(() => { cur.el.pause(); cur.el.removeAttribute('src'); cur.el.load(); }, ms + 50);
}

function startIfWanted() {
  if (!wanted || now || hidden) return;
  const url = ready.get(wanted.name);
  const g = audioGraph();
  if (!url || !g) return;
  const el = new Audio();
  // Needed for the direct-from-GitHub fallback: without it WebAudio is handed
  // silence from a file on another site. Harmless for a stored copy.
  el.crossOrigin = 'anonymous';
  el.src = url;
  el.loop = true;
  el.preservesPitch = false;         // slow motion drops the pitch, like tape
  el.playbackRate = rate;
  const gain = g.ctx.createGain();
  try { g.ctx.createMediaElementSource(el).connect(gain); } catch { return; }
  gain.connect(g.bus);
  /**
   * THE FADE IS COUNTED FROM THE MOMENT THE GAME ASKED, not from the moment
   * the file happened to open. Opening a stored track takes a few
   * milliseconds on a fast phone and longer on a slow one; counted from
   * the request, the fade always ends when the picture's does.
   */
  const w = wanted;
  const fade = Math.max(1, w.fadeIn);
  const elapsed = performance.now() - w.at;
  const t = g.ctx.currentTime;
  gain.gain.setValueAtTime(Math.min(1, elapsed / fade), t);
  gain.gain.linearRampToValueAtTime(1, t + Math.max(0, fade - elapsed) / 1000);
  now = { name: w.name, el, gain, leaving: false };
  /**
   * SYNC: THE TRACK IS WHERE IT WOULD BE HAD IT STARTED ON TIME. A beat-locked
   * room (Volt Man's) only lines up with its music if the track's position
   * at the room's first beat is the same on every visit and every phone. So
   * once playback really begins, any delay since the request is skipped
   * over: the track jumps forward by exactly the time it lost. Once, at the
   * start — never mid-track, where a jump would be heard.
   */
  if (w.sync) {
    el.addEventListener('playing', () => {
      const lag = (performance.now() - w.at) / 1000;
      if (lag > 0.02 && lag < 10) el.currentTime = el.duration ? lag % el.duration : lag;
    }, { once: true });
  }
  el.play().catch(() => {});
}

/**
 * MUSIC RUNS AT THE GAME'S SPEED. The re-quip wheel's slow motion slows the
 * track by the same factor, and its ramp back to full speed ramps the track
 * with it — so a beat-locked room and its music slow down and speed up
 * together instead of sliding apart. Pitch falls with the speed, the way a
 * slowed tape does. The browser will not play slower than 1/16th.
 */
export function setMusicRate(r) {
  const next = Math.max(0.0625, Math.min(4, r));
  if (Math.abs(next - rate) < 0.005) return;
  rate = next;
  if (now) now.el.playbackRate = rate;
}

/**
 * RESYNC: hold a track to where the game says it should be.
 *
 * The scene calls this every half second with the position its own clock
 * implies (for a boss room: 3.0s plus the room clock). Slow motion, a
 * struggling phone and a paused screen all move the game's clock and the
 * track's clock differently; this pulls the track back into line. Only the
 * named track is touched, so a stray call can never yank a different one.
 *
 * Small drift is left alone — a jump is itself audible, and 60ms is well
 * inside what the ear forgives on a beat.
 */
const RESYNC_S = 0.06;
export function syncMusicTo(name, seconds) {
  const el = now?.name === name && !now.leaving ? now.el : null;
  if (!el || el.paused || el.readyState < 2 || !el.duration) return;
  const target = seconds % el.duration;
  let drift = el.currentTime - target;
  // A loop wraps: 0.1s past the start is only 0.2s from 0.1s before the end.
  if (drift > el.duration / 2) drift -= el.duration;
  if (drift < -el.duration / 2) drift += el.duration;
  if (Math.abs(drift) > RESYNC_S) el.currentTime = target;
}

/**
 * THE PAUSE MENU PLAYS THE MAIN MENU TRACK, and the fight's track waits.
 * It is stopped where it was — not faded out and thrown away — so leaving
 * the menu resumes it at the same point, and the room's clock (stopped
 * with it) still agrees.
 */
export function parkMusic(menuName = null) {
  if (parked) return;
  parked = now && !now.leaving ? now : null;
  if (parked) { parked.el.pause(); now = null; }
  // No menu track (the level-up cards): silence while the fight's track waits.
  if (menuName) playMusic(menuName, { fadeIn: 300, fadeOut: 0 });
  else wanted = null;
}

/** Leave the pause menu or the cards: the fight's track comes back, fading in over `ms`. */
export function unparkMusic(ms = 300) {
  const back = parked;
  parked = null;
  if (!back) { fadeOutMusic(200); return; }
  stopMusic(150);
  now = back;
  wanted = { name: back.name, fadeIn: ms, at: performance.now(), sync: false };
  const g = audioGraph();
  if (g) {
    const t = g.ctx.currentTime;
    back.gain.gain.cancelScheduledValues(t);
    back.gain.gain.setValueAtTime(0, t);
    back.gain.gain.linearRampToValueAtTime(1, t + ms / 1000);
  }
  back.el.playbackRate = rate;
  if (!hidden) back.el.play().catch(() => {});
}

/** The run ended from the pause menu: the waiting track will never be wanted. */
export function dropParkedMusic() {
  if (!parked) return;
  const el = parked.el;
  parked = null;
  el.pause(); el.removeAttribute('src'); el.load();
}

/**
 * The first touch unlocks audio on a phone. A track asked for before it — the
 * title screen's — was refused by the browser, so try it again now.
 */
export function resumeMusic() {
  if (now && now.el.paused && !hidden) now.el.play().catch(() => {});
  startIfWanted();
}

/**
 * THE APP GOING TO THE BACKGROUND STOPS THE MUSIC. An Android WebView keeps
 * playing an <audio> element after the home button, so a game you switched
 * away from would carry on in your pocket.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.visibilityState === 'hidden';
    if (hidden) now?.el.pause();
    else resumeMusic();
  });
}

/** For tests and the smoke run: what is wanted, what is playing, what is held. */
export const musicState = () => ({
  wanted: wanted?.name ?? null,
  playing: now?.name ?? null,
  // Seconds into the track — moving means the file is really being played.
  at: now ? now.el.currentTime : 0,
  gain: now ? now.gain.gain.value : 0,
  rate: now ? now.el.playbackRate : rate,
  parked: parked?.name ?? null,
  held: [...ready.keys()],
});
