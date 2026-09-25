/**
 * The browser harness shared by smoke.mjs, sim.mjs and pages-save.mjs.
 *
 * All three do the same three things before they start doing their own: check
 * that playwright is there, serve a directory over http, and launch Chromium.
 * They had three copies of it, and the copies had drifted — pages-save
 * hardcoded the container's browser path with no fallback, so it only ran
 * inside CI and not on the machine the game is developed on.
 *
 * ONE copy, for the same reason docs/gh.js is one copy.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/**
 * Playwright is deliberately NOT a devDependency — its postinstall would pull
 * ~150MB of browsers onto every APK build for a job CI does not run. So it may
 * genuinely be absent, and a bare top-level import turns that into eight lines
 * of ERR_MODULE_NOT_FOUND internals. Say the useful thing instead.
 *
 * `hint` is the command the reader was trying to run, so the last line of the
 * message is the one they retype.
 */
export async function requireChromium(hint) {
  try {
    return (await import('playwright')).chromium;
  } catch {
    console.log('playwright is not installed — this tool is deliberately opt-in.\n');
    console.log('  npx playwright@latest install chromium');
    console.log('  npm i --no-save playwright');
    console.log(`  ${hint}\n`);
    process.exit(1);
  }
}

/**
 * A pre-installed browser when the environment has one (CI images and container
 * sandboxes usually do), otherwise let Playwright find its own.
 *
 * THE FALLBACK IS THE POINT. Hardcoding the pinned path makes a tool that runs
 * in CI and nowhere else, which is the opposite of what these tools are for.
 */
export async function launchChromium(hint) {
  const chromium = await requireChromium(hint);
  const pinned = process.env.SMOKE_CHROMIUM || '/opt/pw-browsers/chromium';
  return chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png',
};

/**
 * Serve `root` on an ephemeral port. Returns the server and the base url.
 *
 * The port is never pinned: two of these tools running at once would otherwise
 * fight over it, and nothing here needs a memorable address.
 */
export function serve(root, index = 'index.html') {
  const base = resolve(root);
  const server = createServer((req, res) => {
    const url = req.url.split('?')[0];
    const file = join(base, url === '/' ? index : url);
    // Containment check: a dev server that will serve `../../.ssh` is a habit
    // worth not having, even when it only ever faces localhost.
    if (!file.startsWith(base) || !existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((done) => {
    server.listen(0, () => done({ server, url: `http://localhost:${server.address().port}` }));
  });
}
