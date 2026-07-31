#!/usr/bin/env node
/**
 * Regenerate design/boss-data.json from design/TRACKER.md.
 *
 * TRACKER.md is the source of truth and is natural language — the owner writes
 * prose, not data. But a handful of MECHANICAL values live in it (palette hexes,
 * sprite scale, names) and code needs those exactly. This extracts only those,
 * so `tests/data.test.js` can keep asserting bosses.js has not drifted from the
 * design doc.
 *
 * The owner never edits or even sees boss-data.json. Run this after the tracker
 * changes; `npm test` fails loudly if the two disagree.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, rawOf } from '../docs/tracker-md.js';

const SRC = new URL('../design/TRACKER.md', import.meta.url);
const OUT = new URL('../design/boss-data.json', import.meta.url);

const doc = parse(readFileSync(SRC, 'utf8'));
const slices = doc.sections.find((s) => s.title === 'SLICES');
if (!slices) throw new Error('TRACKER.md has no "# SLICES" section');

const HEX = /#[0-9A-Fa-f]{6}/g;
const out = { _note: 'GENERATED from design/TRACKER.md by tools/sync-tracker.js. Do not edit.', bosses: {} };

for (const item of slices.items) {
  if (item.title === null) continue;                 // section intro, not a boss
  const meta = rawOf(item).join(' ');
  const hexes = meta.match(HEX) || [];
  const scale = /`scale`\s*([\d.]+)/.exec(meta);
  const attack = /`attack`\s*([^·`]+)/.exec(meta);
  const weapon = /`weapon`\s*([^·`]+)/.exec(meta);
  const name = item.title.split('—')[0].trim();
  // The id is stamped in the meta line rather than derived from the name:
  // Tempest Man ships as 'torrent' after a rename, and deriving it would break
  // silently. Fall back to the name only if the stamp is missing.
  const stamped = /`id`\s*([a-z_]+)/.exec(meta);
  const id = stamped ? stamped[1] : name.toLowerCase().replace(/\s*man$/, '').trim();

  if (hexes.length < 3 || !scale) {
    console.warn(`  ! ${name}: incomplete palette/scale line, skipped`);
    continue;
  }
  out.bosses[id] = {
    name,
    primary: hexes[0].toUpperCase(),
    secondary: hexes[1].toUpperCase(),
    outline: hexes[2].toUpperCase(),
    scale: parseFloat(scale[1]),
    attackName: attack ? attack[1].trim() : '',
    weaponName: weapon ? weapon[1].trim() : '',
  };
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`boss-data.json: ${Object.keys(out.bosses).length} bosses from TRACKER.md`);
