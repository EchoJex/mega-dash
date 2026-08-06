/**
 * SOUND — chiptune effects synthesised at runtime. No audio files, ever.
 *
 * WHY SYNTHESISED
 * ---------------
 * Every sound here is a handful of numbers: a waveform, a pitch envelope, a
 * volume envelope, a duration. That is exactly how the NES sound hardware
 * worked, so the idiom is authentic rather than an imitation of one, and it
 * means the whole audio layer costs zero bytes of assets and zero art time.
 *
 * It also means a sound is TUNABLE the same way FEEL is: change a number, hear
 * the difference next run. A .wav would have to be re-recorded.
 *
 * WHY NOT PHASER'S AUDIO
 * ----------------------
 * Phaser's audio manager plays loaded files. There are no files. This talks to
 * the WebAudio graph directly, which is less code than wiring synthesised
 * buffers through the asset pipeline would be.
 *
 * MOBILE AUTOPLAY: browsers refuse to start an AudioContext until the user has
 * touched the screen, so the context is created lazily on the first play() and
 * resumed on the first input. Until then every call is a silent no-op — the game
 * must never wait on or throw because of audio.
 */

let ctx = null;
let master = null;
let enabled = true;

/** Lazily build the graph. Returns null until the browser allows audio. */
function audio() {
  if (!enabled) return null;
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume?.().catch(() => {});
    return ctx;
  }
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) { enabled = false; return null; }
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;      // headroom: several effects can overlap
    master.connect(ctx.destination);
  } catch {
    enabled = false;               // no audio available; the game plays on
    return null;
  }
  return ctx;
}

/** Call once from a real input event so mobile browsers unlock the context. */
export function unlockAudio() {
  const c = audio();
  if (c && c.state === 'suspended') c.resume?.().catch(() => {});
}

export function setMuted(m) {
  enabled = !m;
  if (master) master.gain.value = m ? 0 : 0.32;
}

/**
 * One voice.
 *
 *   wave     'square' | 'triangle' | 'sawtooth' | 'sine' | 'noise'
 *   f0 -> f1 pitch sweep across the sound's life. A downward sweep is the
 *            classic "hit"; upward is the classic "pickup".
 *   dur      seconds
 *   vol      peak gain before the master
 *   decay    'exp' snaps and rings out; 'flat' holds then cuts
 */
/**
 * ONE CACHED NOISE BUFFER, REUSED FOR EVERY NOISE VOICE.
 *
 * White noise is white noise — there is no reason to synthesise a fresh one per
 * play, and doing so was expensive in exactly the wrong place. The old code
 * allocated a Float32Array of `sampleRate * dur` and filled it with Math.random()
 * SYNCHRONOUSLY ON THE MAIN THREAD, inside the call that starts the sound. For a
 * short hit that is a few thousand samples and invisible. For the rumble — 2-3
 * seconds long — it is a six-figure loop and a megabyte of allocation, running
 * at the precise frame the screen starts shaking, so the telegraph announced
 * itself with a stutter.
 *
 * One buffer, built on first use and looped to whatever length the caller wants.
 * Two seconds is long enough that the loop point is inaudible in noise, and a
 * small random playback rate per voice decorrelates repeats so consecutive
 * rumbles do not sound like the same recording twice.
 */
const NOISE_SECONDS = 2;
let noiseBuf = null;

function noiseBuffer(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = Math.floor(c.sampleRate * NOISE_SECONDS);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

function voice({ wave = 'square', f0 = 440, f1 = f0, dur = 0.12, vol = 0.3, decay = 'exp', delay = 0 }) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const g = c.createGain();
  g.connect(master);

  let src;
  if (wave === 'noise') {
    // White noise for hits and explosions — the NES had a dedicated noise
    // channel, and percussive sounds are unconvincing without one.
    src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    // Anything longer than the cached buffer loops rather than allocating.
    if (dur > NOISE_SECONDS * 0.9) src.loop = true;
  } else {
    src = c.createOscillator();
    src.type = wave;
    src.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) src.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  }

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.012, dur * 0.2));
  if (decay === 'flat') {
    g.gain.setValueAtTime(vol, t0 + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  src.connect(g);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  src.onended = () => { try { g.disconnect(); } catch { /* already gone */ } };
}

/**
 * THE SOUND SET.
 *
 * Every entry is a list of voices, so a sound can layer a tone and a noise burst
 * the way NES effects did. These are first-pass numbers chosen to be readable
 * and distinct from each other — tune them freely, nothing reads them but here.
 */
const SOUNDS = {
  shoot:     [{ wave: 'square', f0: 880, f1: 330, dur: 0.07, vol: 0.18 }],
  shootBig:  [{ wave: 'sawtooth', f0: 660, f1: 160, dur: 0.20, vol: 0.26 },
              { wave: 'noise', dur: 0.10, vol: 0.10 }],
  charge:    [{ wave: 'triangle', f0: 220, f1: 880, dur: 0.45, vol: 0.12, decay: 'flat' }],
  jump:      [{ wave: 'square', f0: 320, f1: 720, dur: 0.11, vol: 0.20 }],
  land:      [{ wave: 'noise', dur: 0.05, vol: 0.10 }],
  slide:     [{ wave: 'noise', dur: 0.22, vol: 0.13, decay: 'flat' }],
  hitEnemy:  [{ wave: 'square', f0: 520, f1: 260, dur: 0.06, vol: 0.16 },
              { wave: 'noise', dur: 0.05, vol: 0.12 }],
  hurt:      [{ wave: 'sawtooth', f0: 300, f1: 90, dur: 0.30, vol: 0.30 },
              { wave: 'noise', dur: 0.14, vol: 0.16 }],
  enemyDie:  [{ wave: 'noise', dur: 0.18, vol: 0.20 },
              { wave: 'square', f0: 400, f1: 80, dur: 0.18, vol: 0.14 }],
  bossDie:   [{ wave: 'noise', dur: 0.5, vol: 0.26 },
              { wave: 'sawtooth', f0: 300, f1: 50, dur: 0.6, vol: 0.22 },
              { wave: 'noise', dur: 0.4, vol: 0.20, delay: 0.25 }],
  pickupExp: [{ wave: 'square', f0: 660, f1: 990, dur: 0.08, vol: 0.16 }],
  pickupTank:[{ wave: 'square', f0: 520, f1: 780, dur: 0.09, vol: 0.20 },
              { wave: 'square', f0: 780, f1: 1170, dur: 0.09, vol: 0.20, delay: 0.09 }],
  levelUp:   [{ wave: 'square', f0: 523, dur: 0.09, vol: 0.20 },
              { wave: 'square', f0: 659, dur: 0.09, vol: 0.20, delay: 0.09 },
              { wave: 'square', f0: 784, dur: 0.09, vol: 0.20, delay: 0.18 },
              { wave: 'square', f0: 1047, dur: 0.16, vol: 0.22, delay: 0.27 }],
  requip:    [{ wave: 'triangle', f0: 700, f1: 1200, dur: 0.07, vol: 0.16 }],
  select:    [{ wave: 'square', f0: 900, dur: 0.04, vol: 0.14 }],
  door:      [{ wave: 'triangle', f0: 180, f1: 900, dur: 0.5, vol: 0.22, decay: 'flat' }],
  warp:      [{ wave: 'sine', f0: 1200, f1: 120, dur: 0.55, vol: 0.20 }],
  beam:      [{ wave: 'sine', f0: 200, f1: 1600, dur: 0.35, vol: 0.18 }],
  // Arena hazards. The rockfall shake and Blaze Man's flood need to be heard
  // coming, not just seen — the shake is the telegraph and this is its voice.
  //
  // Long and LOW on purpose: it is meant to read as an earthquake building, not
  // as a short hit. The pitch sits under the rest of the sound set so it never
  // competes with a shot or a jump, and callers stretch it to match the length
  // of the shake it is announcing (see the `shake` hook in GameScene).
  //
  // HOW "DEEPER" IS ACTUALLY ACHIEVED. A phone speaker cannot move enough air to
  // reproduce a 15Hz fundamental at all, so simply dropping the numbers makes the
  // sound quieter, not deeper. What the ear reads as depth on a small speaker is
  // the HARMONIC SERIES of a very low tone — a sawtooth at 15Hz puts energy at
  // 30/45/60/75Hz, which the speaker can move, and the brain reconstructs the
  // missing fundamental underneath it. So the sawtooth carries the depth, the
  // triangle adds body, and the sine is there for headphones and any device with
  // a real driver, where it is felt rather than heard.
  rumble:    [{ wave: 'noise', dur: 1.6, vol: 0.15, decay: 'flat' },
              { wave: 'sawtooth', f0: 33, f1: 13, dur: 1.6, vol: 0.20, decay: 'flat' },
              { wave: 'triangle', f0: 25, f1: 11, dur: 1.6, vol: 0.16, decay: 'flat' },
              { wave: 'sine', f0: 19, f1: 9, dur: 1.6, vol: 0.15, decay: 'flat' }],
  lava:      [{ wave: 'noise', dur: 1.6, vol: 0.14, decay: 'flat' }],
  turret:    [{ wave: 'square', f0: 420, f1: 300, dur: 0.05, vol: 0.12 }],
};

/**
 * Play a named sound. Unknown names are a silent no-op rather than a throw:
 * audio must never be able to break a run.
 *
 * `opts.dur` and `opts.pitch` are MULTIPLIERS, so a caller can stretch or drop
 * a sound without inventing a second copy of it. The rumble uses this to match
 * the length of the screen shake it announces — a layer that shakes twice as
 * long should sound like it, or the telegraph and the tell disagree.
 */
export function sfx(name, opts = {}) {
  const s = SOUNDS[name];
  if (!s) return;
  const dur = opts.dur || 1, pitch = opts.pitch || 1;
  for (const v of s) {
    voice(dur === 1 && pitch === 1 ? v : {
      ...v,
      dur: v.dur * dur,
      delay: (v.delay || 0) * dur,
      f0: v.f0 ? v.f0 * pitch : v.f0,
      f1: v.f1 ? v.f1 * pitch : v.f1,
    });
  }
}

export const SFX_NAMES = Object.keys(SOUNDS);
