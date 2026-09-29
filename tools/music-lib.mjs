/**
 * The music pack's list, worked out from the folder. Shared by `npm run music`,
 * which writes it, and the test that checks the written copy is current.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const musicDir = new URL('../design/music/', import.meta.url);
export const AUDIO_RE = /\.(ogg|mp3|wav|m4a)$/i;

/**
 * { tracks: { 'bgm-drake-stage': { file, bytes, sha } } }
 *
 * The TRACK NAME is the filename without its extension, because that is what
 * the game asks for — it knows it wants Drake Man's stage music, not whether
 * the owner handed it over as .ogg or .mp3. `sha` is the first 16 hex digits of
 * the file's SHA-256: a fingerprint of the exact bytes, which the phone checks
 * again after downloading.
 */
export function packFor(dir) {
  const tracks = {};
  for (const file of readdirSync(dir).filter((f) => AUDIO_RE.test(f)).sort()) {
    const buf = readFileSync(new URL(file, dir));
    const name = file.replace(AUDIO_RE, '');
    if (tracks[name]) throw new Error(`two files for one track: ${tracks[name].file} and ${file}`);
    tracks[name] = {
      file, bytes: buf.length,
      sha: createHash('sha256').update(buf).digest('hex').slice(0, 16),
    };
  }
  return { tracks };
}
