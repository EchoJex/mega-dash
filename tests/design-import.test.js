/**
 * `npm run design:import` — the two parts that are pure enough to check here:
 * reading a handoff zip, and turning two versions of a sheet into the plain
 * list of what changed. The rest of the tool is running the build and
 * `npm test`, which are checked by being them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync, crc32 } from 'node:zlib';
import { readZip, describeChanges } from '../tools/design-import.mjs';
import { parse } from '../docs/sprite-fmt.js';

/** The smallest honest zip: one stored and one deflated entry, central directory and all. */
function zip(entries) {
  const locals = [], dir = [];
  let at = 0;
  for (const { name, text, deflate } of entries) {
    const raw = Buffer.from(text), body = deflate ? deflateRawSync(raw) : raw;
    const n = Buffer.from(name), method = deflate ? 8 : 0, crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(at, 42);
    locals.push(lh, n, body);
    dir.push(ch, n);
    at += 30 + n.length + body.length;
  }
  const cd = Buffer.concat(dir), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(at, 16);
  return Buffer.concat([...locals, cd, end]);
}

test('a handoff zip is read in memory, stored and deflated entries alike', () => {
  const files = readZip(zip([
    { name: 'project/HANDOFF.md', text: '# note\n' },
    { name: 'project/sprites/x.sprite', text: '# x\ngrid 2x1\n'.repeat(20), deflate: true },
  ]));
  assert.deepEqual(files.map((f) => f.name), ['project/HANDOFF.md', 'project/sprites/x.sprite']);
  assert.equal(files[0].data.toString(), '# note\n');
  assert.equal(files[1].data.toString(), '# x\ngrid 2x1\n'.repeat(20));
  assert.throws(() => readZip(Buffer.from('not a zip at all, honestly')), /not a zip/);
});

const BASE = `# w
grid      8x4
fudge     0.70 x 1.00
pivot     2 2

[jab 1] status=ready hold=4
........
........
........
........

[jab 2] status=ready hold=3 hit=2,0,4,3
........
........
........
........
`;

test('the change list says what moved, in words', () => {
  const now = BASE.replace('hold=4', 'hold=6').replace('hit=2,0,4,3', 'hit=2,0,5,4')
    .replace('[jab 2] status=ready hold=3 hit=2,0,5,4\n........', '[jab 2] status=ready hold=3 hit=2,0,5,4\n..11....');
  const lines = describeChanges(parse(BASE), parse(now));
  assert.deepEqual(lines, [
    '1 frame redrawn',
    'jab: lasts 9 steps (was 7); hits on step 6 (was 4); its hit area reaches 1 px further forward, 1 px lower at the bottom',
  ]);
  assert.deepEqual(describeChanges(parse(BASE), parse(BASE)), ['unchanged']);
  assert.deepEqual(describeChanges(null, parse(BASE)), ['a new sheet: 2 frames']);
});
