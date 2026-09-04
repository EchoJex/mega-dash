/**
 * A MINIMAL PNG WRITER — one copy, imported by both sprite tools.
 *
 * WHY IT IS ITS OWN FILE. This exact encoder — the CRC table, `chunk`, and the
 * IHDR/IDAT/IEND assembly — existed verbatim in BOTH `sprite-templates.mjs` and
 * `sprites-build.mjs`, the second of which said so in a comment rather than
 * fixing it. That is the same deal `docs/tracker-md.js` and `docs/sprite-fmt.js`
 * already state for themselves: two copies of a format drift, and the one that
 * drifts is always the one nobody is looking at. A sprite sheet written by a
 * subtly different encoder from the one that wrote the templates is a bug that
 * shows up as art being wrong, months later, with no obvious cause.
 *
 * WHY NOT A DEPENDENCY. `node:zlib` does the only hard part. A PNG is a
 * signature, three chunks and a CRC, and pulling an image library into a
 * project whose whole build is Vite plus Phaser would cost more than these
 * forty lines ever will.
 *
 * WHAT IT WRITES. 8-bit RGBA, no interlacing, filter 0 (None) on every
 * scanline. The images are flat pixel art with large runs of identical colour,
 * so they compress fine without per-line filter heuristics and the writer stays
 * short enough to read in one sitting.
 */

import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** length + type + data + CRC — the PNG chunk framing. */
export function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * Encode a raw RGBA buffer as a PNG.
 *
 * @param {number} w
 * @param {number} h
 * @param {Uint8Array} px  w * h * 4 bytes, row-major, RGBA.
 * @returns {Buffer}
 */
export function encodePng(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type: RGBA
  // 10, 11, 12 stay 0: deflate, adaptive filtering, no interlace.

  // One filter byte per scanline, filter 0 (None) throughout.
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    const dst = y * (stride + 1);
    raw[dst] = 0;
    // `byteOffset` rather than assuming 0: a Uint8Array can be a view onto a
    // larger buffer, and reading from the wrong offset would shear the image.
    Buffer.from(px.buffer, px.byteOffset + y * stride, stride).copy(raw, dst + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
