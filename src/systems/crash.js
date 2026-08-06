/**
 * CRASH OVERLAY — make the game say what went wrong instead of just stopping.
 *
 * WHY THIS EXISTS
 * ---------------
 * When a boss died and the fight loop dereferenced the boss it had just nulled,
 * the exception escaped Phaser's update loop and killed it. On a phone that
 * looks like nothing at all: the picture freezes. The report was two
 * screenshots and a guess, and finding the cause took a round trip that a
 * visible stack trace would have ended in ten seconds.
 *
 * Every playtest happens on a device with no console attached, so an error that
 * is not drawn on screen is an error that does not exist.
 *
 * WHY RAW DOM AND NOT A PHASER SCENE
 * ----------------------------------
 * The failure this is for is "the render loop is dead". Anything that needs
 * Phaser to draw it cannot report Phaser failing to draw. This is a plain
 * absolutely-positioned <div> written straight into the document, which needs
 * nothing but the browser.
 *
 * It also deliberately avoids importing anything from the game. A module that
 * throws while loading would take the crash handler down with it.
 */

/** Filled in by whoever knows it; all optional, all best-effort. */
const context = {};

/** Add to what a crash report will carry. Safe to call from anywhere, any time. */
export function setCrashContext(patch) {
  Object.assign(context, patch);
}

let shown = false;
let extra = 0;

const style = (el, css) => { for (const k in css) el.style[k] = css[k]; };

/**
 * Trim a stack to the frames that mean anything.
 *
 * A full Phaser stack is mostly framework internals and a bundled filename per
 * line, which on a 400px-wide screen pushes the one useful frame off the
 * bottom. Six frames is enough to see where it came from.
 */
function trimStack(stack) {
  if (!stack) return '';
  return String(stack)
    .split('\n')
    .slice(0, 7)
    .map((l) => l.trim().replace(/^at\s+/, '').replace(/https?:\/\/[^/]+\//, ''))
    .join('\n');
}

function report(kind, message, stack) {
  const lines = [
    `MEGA DASH ${kind}`,
    context.build ? `build ${context.build}` : null,
    context.seed !== undefined ? `seed ${context.seed}` : null,
    context.where || null,
    context.display || null,
    '',
    String(message || 'unknown error'),
    '',
    trimStack(stack),
  ].filter((l) => l !== null);
  return lines.join('\n');
}

function show(kind, message, stack) {
  // Only the FIRST error gets the screen. A dead update loop can throw sixty
  // times a second, and a report that repaints itself is unreadable and
  // unphotographable — the first one is the one that matters anyway.
  if (shown) { extra++; return; }
  shown = true;

  const text = report(kind, message, stack);

  const box = document.createElement('div');
  style(box, {
    position: 'fixed', inset: '0', zIndex: '99999',
    background: '#12060A', color: '#FFD7D7',
    font: '12px/1.45 ui-monospace,Menlo,Consolas,monospace',
    padding: '10px', overflow: 'auto', whiteSpace: 'pre-wrap',
    wordBreak: 'break-word', WebkitUserSelect: 'text', userSelect: 'text',
  });

  const hint = document.createElement('div');
  style(hint, { color: '#FF8A8A', marginBottom: '8px', fontWeight: 'bold' });
  hint.textContent = 'TAP TO COPY';

  const body = document.createElement('div');
  body.textContent = text;

  box.appendChild(hint);
  box.appendChild(body);

  // Tap to copy. The clipboard needs a user gesture on Android, which a tap on
  // the overlay is — so the whole report reaches a message without transcribing
  // a stack trace off a photograph of a screen.
  box.addEventListener('click', () => {
    const full = extra ? `${text}\n\n(+${extra} more errors after this one)` : text;
    navigator.clipboard?.writeText(full)
      .then(() => { hint.textContent = 'COPIED'; })
      .catch(() => { hint.textContent = 'SELECT AND COPY MANUALLY'; });
  });

  (document.body || document.documentElement).appendChild(box);
}

/**
 * Install the handlers.
 *
 * Called as a SIDE EFFECT of importing this module, at the bottom of the file,
 * rather than left for a caller to invoke. Import statements are hoisted and
 * every module body runs before the importing module's first statement, so a
 * `installCrashHandler()` call in main.js would run AFTER every other module had
 * already been evaluated — too late to catch anything thrown during load, which
 * is exactly the case with no other way to report itself.
 *
 * Never throws: a crash reporter that can crash is worse than none, because it
 * would mask the error it exists to show.
 */
export function installCrashHandler() {
  try {
    globalThis.addEventListener('error', (e) => {
      show('CRASH', e?.error?.message || e?.message, e?.error?.stack);
    });
    // A rejected promise never reaches the 'error' handler. Asset loading and
    // the audio context are both promise-based, so without this a failure in
    // either is silent.
    globalThis.addEventListener('unhandledrejection', (e) => {
      const r = e?.reason;
      show('UNHANDLED REJECTION', r?.message || r, r?.stack);
    });
  } catch { /* no window; nothing to install */ }
}

// Installed on import — see the note on installCrashHandler above.
installCrashHandler();

/** For tests: what a report would look like, without touching the DOM. */
export const _report = report;
