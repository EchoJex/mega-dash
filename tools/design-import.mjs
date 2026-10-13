/**
 * npm run design:import -- <zip | folder | .tar.gz> — bring a Claude Design
 * handoff into the game.
 *
 * THE LAST STEP OF THE ART LOOP: Claude Code builds a weapon with placeholder
 * sheets, Claude Design reads them from the repo and redraws them, and its
 * handoff comes back here as a zip. By the owner's call (12 Oct 2026) a
 * handoff's changes — pictures, timing, hit areas — GO STRAIGHT IN WHEN THE
 * CHECKS PASS, and the owner reads the list of what changed afterwards.
 *
 * So this is the checks, the list, and nothing else:
 *
 *   1. Every `.sprite` anywhere in the bundle is matched to a sheet the game
 *      knows, by the id on its first line. Anything else in the bundle (the
 *      design's own pages, its notes) is listed and left alone.
 *   2. Each must keep its contract: the right grid, every clip the code plays
 *      in the shape the code expects (docs/sprite-fmt.js, `checkFrameData`).
 *   3. The files go in, the build runs, and `npm test` runs. If ANY of that
 *      fails, every file is put back exactly as it was — nothing half-lands.
 *   4. What changed is written out in plain words, to the screen and to
 *      `design/handoffs/<date>-<name>.md` with the design's own note, so the
 *      record survives the session.
 *
 * Frames come in at `draft` (a frame Design marked `ready` is brought back to
 * `draft`: only the game can say a frame reached it) and `npm run
 * sprites:ship` promotes every one that genuinely reaches the game to `ready`.
 *
 * IT READS THE BUNDLE, IT DOES NOT RUN IT. A zip is read in memory and only
 * `.sprite` and `.md` text is looked at; nothing in it is executed or written
 * anywhere by its own name.
 */
import {
  readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, mkdtempSync, unlinkSync,
} from 'node:fs';
import { join, basename, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { inflateRawSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, serialize, frameDataOf, checkFrameData, actionsOf } from '../docs/sprite-fmt.js';

const REPO = fileURLToPath(new URL('..', import.meta.url));

// ── Reading a bundle ──────────────────────────────────────────────────

/**
 * Every file in a zip, as `{ name, data }`, read in memory. Stored and
 * deflated entries are what every zip tool writes for text; anything else is
 * reported rather than guessed at.
 */
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end-of-archive record)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('damaged zip (bad directory entry)');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;                       // a folder
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 0) out.push({ name, data: Buffer.from(raw) });
    else if (method === 8) out.push({ name, data: inflateRawSync(raw) });
    else out.push({ name, data: null, skipped: `compression method ${method}` });
  }
  return out;
}

/** Every file under a folder, as `{ name, data }`, skipping version-control and package folders. */
function readFolder(root, rel = '') {
  const out = [];
  for (const e of readdirSync(join(root, rel))) {
    if (e === '.git' || e === 'node_modules') continue;
    const r = rel ? `${rel}/${e}` : e;
    if (statSync(join(root, r)).isDirectory()) out.push(...readFolder(root, r));
    else out.push({ name: r, data: readFileSync(join(root, r)) });
  }
  return out;
}

function readBundle(path) {
  if (statSync(path).isDirectory()) return readFolder(path);
  if (/\.zip$/i.test(path)) return readZip(readFileSync(path));
  if (/\.(tar\.gz|tgz)$/i.test(path)) {
    const dir = mkdtempSync(join(tmpdir(), 'design-import-'));
    execFileSync('tar', ['-xzf', path, '-C', dir]);
    return readFolder(dir);
  }
  throw new Error(`${path}: expected a .zip, a .tar.gz or a folder`);
}

// ── Saying what changed ───────────────────────────────────────────────

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function describeArea(was, now) {
  const bits = [];
  const fwd = (now.x + now.w) - (was.x + was.w), back = was.x - now.x;
  const up = was.y - now.y, down = (now.y + now.h) - (was.y + was.h);
  if (fwd) bits.push(`reaches ${Math.abs(fwd)} px ${fwd > 0 ? 'further' : 'less far'} forward`);
  if (back) bits.push(`${Math.abs(back)} px ${back > 0 ? 'further' : 'less far'} back`);
  if (up) bits.push(`${Math.abs(up)} px ${up > 0 ? 'higher' : 'lower'} at the top`);
  if (down) bits.push(`${Math.abs(down)} px ${down > 0 ? 'lower' : 'higher'} at the bottom`);
  return bits.join(', ');
}

/**
 * Everything that differs between two versions of one sheet, as sentences a
 * person who has never seen the code can check against the game.
 */
export function describeChanges(oldDoc, newDoc) {
  const lines = [];
  if (!oldDoc) return [`a new sheet: ${plural(newDoc.frames.length, 'frame')}`];
  const redrawn = newDoc.frames.filter((f) => {
    const o = oldDoc.frames.find((x) => x.action === f.action && x.index === f.index);
    return !o || o.rows.join('\n') !== f.rows.join('\n');
  }).length;
  if (redrawn) lines.push(`${plural(redrawn, 'frame')} redrawn`);
  const pal = (d) => new Map((d.palette || []).map((p) => [p.key, p.hex.toUpperCase()]));
  const po = pal(oldDoc), pn = pal(newDoc);
  const added = [...pn.keys()].filter((k) => !po.has(k)).length;
  const gone = [...po.keys()].filter((k) => !pn.has(k)).length;
  const recoloured = [...pn.keys()].filter((k) => po.has(k) && po.get(k) !== pn.get(k)).length;
  if (added || gone || recoloured) {
    lines.push(`colours: ${pn.size} in all (${[added && `${added} added`, gone && `${gone} removed`,
      recoloured && `${recoloured} changed`].filter(Boolean).join(', ')})`);
  }
  if (JSON.stringify(oldDoc.pivot) !== JSON.stringify(newDoc.pivot)) {
    lines.push(`the pivot (the pixel the game holds it by) moved from `
      + `${oldDoc.pivot ? `${oldDoc.pivot.x},${oldDoc.pivot.y}` : 'none'} to ${newDoc.pivot.x},${newDoc.pivot.y}`);
  }
  const A = frameDataOf(oldDoc).clips, B = frameDataOf(newDoc).clips;
  for (const name of actionsOf(newDoc)) {
    const a = A[name], b = B[name];
    if (!a) { lines.push(`${name}: a new clip, ${plural(b.holds.length, 'frame')}, ${b.total} steps`); continue; }
    const bits = [];
    if (a.holds.length !== b.holds.length) bits.push(`${b.holds.length} frames (was ${a.holds.length})`);
    if (a.total !== b.total) bits.push(`lasts ${b.total} steps (was ${a.total})`);
    else if (a.holds.join() !== b.holds.join()) bits.push('same length, frames re-timed');
    const ha = a.hits[0], hb = b.hits[0];
    if (ha && hb && ha.step !== hb.step) bits.push(`hits on step ${hb.step} (was ${ha.step})`);
    if (ha?.w && hb?.w) {
      const d = describeArea(ha, hb);
      if (d) bits.push(`its hit area ${d}`);
    }
    const ga = a.hits.length && a.hits[a.hits.length - 1], gb = b.hits.length && b.hits[b.hits.length - 1];
    if (ga && gb && !ga.w && (ga.step + ga.len) !== (gb.step + gb.len)) {
      bits.push(`hurts for ${gb.step + gb.len} steps (was ${ga.step + ga.len})`);
    }
    const sa = a.spawns[0], sb = b.spawns[0];
    if (sa && sb && (sa.x !== sb.x || sa.y !== sb.y)) bits.push(`its spawn point moved ${sb.x - sa.x}, ${sb.y - sa.y} px`);
    if (bits.length) lines.push(`${name}: ${bits.join('; ')}`);
  }
  for (const name of actionsOf(oldDoc)) if (!B[name]) lines.push(`${name}: removed`);
  return lines.length ? lines : ['unchanged'];
}

// ── The import ────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const path = args.find((a) => !a.startsWith('--'));
  if (!path || !existsSync(path)) {
    console.error('usage: npm run design:import -- <handoff.zip | folder | .tar.gz> [--dry]');
    process.exit(1);
  }
  const targets = JSON.parse(readFileSync(join(REPO, 'design/sprite-targets.json'), 'utf8'));
  const targetOf = (id) => (id === 'player' ? targets.player
    : targets.minions.find((x) => x.id === id) || targets.bosses[id] || targets.shots[id]
    || targets.pickups[id] || targets.furniture?.[id] || targets.menu?.[id] || targets.weapons?.[id] || null);

  const files = readBundle(path);
  const sprites = files.filter((f) => f.data && extname(f.name) === '.sprite');
  const notes = files.filter((f) => f.data && /(^|\/)handoff[^/]*\.md$/i.test(f.name));
  const other = files.filter((f) => !sprites.includes(f) && !notes.includes(f));
  if (!sprites.length) {
    console.error(`${basename(path)} has no .sprite files — nothing to bring in.`
      + `\nIts files: ${files.map((f) => f.name).join(', ') || '(none)'}`);
    process.exit(1);
  }

  const problems = [], incoming = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const f of sprites) {
    const text = f.data.toString('utf8');
    const doc = parse(text);
    const id = doc.id;
    if (!id) { problems.push(`${f.name}: no '# id' first line`); continue; }
    if (basename(f.name, '.sprite') !== id) problems.push(`${f.name}: the file is named for a different sheet than its first line (${id})`);
    const t = targetOf(id);
    if (!t) { problems.push(`${f.name}: '${id}' is not a sheet the game knows`); continue; }
    if (doc.w !== t.grid.w || doc.h !== t.grid.h) {
      problems.push(`${id}: it is ${doc.w}x${doc.h} pixels; the game's paper for it is ${t.grid.w}x${t.grid.h}`);
      continue;
    }
    if (t.cls === 'weapon') for (const b of checkFrameData(doc, t)) problems.push(`${id}: ${b}`);
    const dest = join(REPO, 'design/sprites', `${id}.sprite`);
    const before = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
    const oldDoc = before ? parse(before) : null;
    // Only the game can say a frame reached it: `ready` comes from sprites:ship.
    for (const fr of doc.frames) if (fr.status === 'ready') fr.status = 'draft';
    /**
     * EVERY AI-MADE SPRITE IS LABELLED WHERE IT LIVES (CLAUDE.md). The note
     * line is the one the editor keeps as written, so a redrawn sheet that
     * still carries the placeholder's note, or no label, gets the label here.
     */
    const changed = !oldDoc || doc.frames.some((fr) => {
      const o = oldDoc.frames.find((x) => x.action === fr.action && x.index === fr.index);
      return !o || o.rows.join() !== fr.rows.join();
    });
    if (changed && !/Drawn by/i.test(doc.note || '')) {
      const keep = doc.note && !doc.note.startsWith('PLACEHOLDER') ? ` ${doc.note}` : '';
      doc.note = `Drawn by Claude Design at the owner's request, ${today}.${keep}`;
    }
    incoming.push({ id, dest, before, oldDoc, doc, text: serialize(doc) });
  }

  console.log(`\n${basename(path)}: ${plural(sprites.length, 'sheet')}`
    + `${notes.length ? `, a handoff note` : ', no handoff note'}`
    + `${other.length ? `, ${plural(other.length, 'other file')} (not used)` : ''}`);
  if (problems.length) {
    console.error('\nREFUSED — nothing was changed:');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }

  const changes = incoming.map((x) => ({ id: x.id, lines: describeChanges(x.oldDoc, x.doc) }));
  const report = changes.map((c) => `- **${c.id}**\n${c.lines.map((l) => `  - ${l}`).join('\n')}`).join('\n');
  console.log(`\nWHAT CHANGES:\n${changes.map((c) => `  ${c.id}\n${c.lines.map((l) => `    - ${l}`).join('\n')}`).join('\n')}`);
  if (dry) { console.log('\n--dry: nothing written.'); return; }

  // In, built, briefed, tested — or all of it put back. The weapons' briefs
  // are regenerated from the new frame data, so Design's next read matches.
  const briefs = readdirSync(join(REPO, 'design/weapon-art')).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => ({ path: join(REPO, 'design/weapon-art', f), text: readFileSync(join(REPO, 'design/weapon-art', f), 'utf8') }));
  const restore = () => {
    for (const x of incoming) {
      if (x.before === null) { if (existsSync(x.dest)) unlinkSync(x.dest); }
      else writeFileSync(x.dest, x.before);
    }
    for (const b of briefs) writeFileSync(b.path, b.text);
    try { execFileSync('node', [join(REPO, 'tools/sprites-build.mjs')], { stdio: 'ignore' }); } catch { /* reported above */ }
  };
  for (const x of incoming) writeFileSync(x.dest, x.text);
  try {
    execFileSync('node', [join(REPO, 'tools/sprites-ship.mjs')], { stdio: 'inherit' });
    execFileSync('node', [join(REPO, 'tools/art-brief.mjs')], { stdio: 'inherit' });
  } catch {
    restore();
    console.error('\nCHECKS FAILED at the build — every file was put back as it was.');
    process.exit(1);
  }
  try {
    execFileSync('npm', ['test', '--silent'], { cwd: REPO, stdio: 'pipe' });
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    const fails = out.split('\n').filter((l) => /^not ok|^\s+error:/.test(l)).slice(0, 20);
    restore();
    console.error(`\nCHECKS FAILED in npm test — every file was put back as it was.\n${fails.join('\n')}`);
    process.exit(1);
  }

  // The record, in the repo, for the owner to read afterwards.
  const slug = basename(path).replace(/\.(zip|tar\.gz|tgz)$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'handoff';
  const dir = join(REPO, 'design/handoffs');
  mkdirSync(dir, { recursive: true });
  const rec = join(dir, `${today}-${slug}.md`);
  const note = notes.map((n) => n.data.toString('utf8').trim()).join('\n\n---\n\n');
  writeFileSync(rec, `# Design handoff, ${today}: ${basename(path)}

Brought in by \`npm run design:import\`. Every check passed (the sheets' contracts,
the build, \`npm test\`), so by the owner's call it went straight in.

## What changed

${report}

## The design's own note

${note ? note.split('\n').map((l) => `> ${l}`).join('\n') : '_None came with the bundle._'}
${other.length ? `\n## Also in the bundle, not used\n\n${other.map((f) => `- \`${f.name}\``).join('\n')}\n` : ''}`);
  console.log(`\nIN. Every check passed. Record: ${rec.replace(REPO, '')}`
    + '\nNext: npm run build && npm run smoke, look at it in the game, commit, push.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
