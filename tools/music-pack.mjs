/**
 * `npm run music` — write design/music/pack.json, the list the game downloads.
 *
 * MUSIC SHIPS OUTSIDE THE APK (see CLAUDE.md, "the size budget"). The phone
 * reads this one small file on launch, compares each track's fingerprint with
 * the copy it already holds, and downloads only what is new or changed. So the
 * fingerprint is the whole versioning scheme: re-export a track under the same
 * name and its fingerprint moves, and every phone fetches it once.
 *
 * The computer works the list out from the folder, so it cannot go out of date
 * as long as this is re-run after a hand-off — and `tests/tracker.test.js`
 * fails if it was not.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { musicDir, packFor } from './music-lib.mjs';

const pack = packFor(musicDir);
const out = new URL('pack.json', musicDir);
const text = JSON.stringify(pack, null, 2) + '\n';
let before = '';
try { before = readFileSync(out, 'utf8'); } catch { /* first run */ }
writeFileSync(out, text);

const names = Object.keys(pack.tracks);
console.log(`design/music/pack.json: ${names.length} track(s)`);
for (const n of names) {
  const t = pack.tracks[n];
  console.log(`  ${n.padEnd(24)} ${t.file.padEnd(28)} ${(t.bytes / 1e6).toFixed(1)}MB  ${t.sha}`);
}
console.log(before === text ? 'unchanged' : 'UPDATED — commit it with the audio');

