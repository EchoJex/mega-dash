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
import { parse, rawOf, fieldsOf } from '../docs/tracker-md.js';

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
  const name = item.title.split('—')[0].trim();

  /**
   * THE MECHANICAL VALUES ARE FIELDS NOW, not a meta line.
   *
   * They used to be one raw `palette ... scale ... id` strip, which meant the
   * owner could read them in the tracker app but not change them — a colour is
   * exactly the kind of thing that moves as a game finds itself, and it was the
   * one part of a slice that needed a commit to edit. As fields they get a
   * status marker and a textbox like every other design decision.
   *
   * The meta line is still read as a FALLBACK so a slice written in the old
   * shape keeps working, and so this never becomes a flag day.
   */
  const f = (label) => fieldsOf(item).find((x) => x.label === label)?.text?.trim() || '';
  // A NON-GLOBAL copy: `HEX` carries /g for `match`, and calling `.test` on a
  // global regex advances its lastIndex, so the second hex of every boss failed
  // and every boss was skipped.
  const ONE_HEX = /^#[0-9A-Fa-f]{6}$/;
  const fieldHexes = [f('palette primary'), f('palette secondary'), f('palette outline')]
    .filter((h) => ONE_HEX.test(h));
  const hexes = fieldHexes.length === 3 ? fieldHexes : (meta.match(HEX) || []);
  const scaleText = f('scale') || meta;
  const scale = /([\d.]+)\s*x/.exec(scaleText) || /`scale`\s*([\d.]+)/.exec(meta);
  const attack = f('attack name') ? [null, f('attack name')] : /`attack`\s*([^·`]+)/.exec(meta);
  const weapon = f('weapon name') ? [null, f('weapon name')] : /`weapon`\s*([^·`]+)/.exec(meta);
  // The id is stamped in the meta line rather than derived from the name:
  // Tempest Man ships as 'torrent' after a rename, and deriving it would break
  // silently. Fall back to the name only if the stamp is missing.
  const stamped = /`id`\s*([a-z_]+)/.exec(meta);
  const id = stamped ? stamped[1] : name.toLowerCase().replace(/\s*man$/, '').trim();

  if (hexes.length < 3 || !scale) {
    console.warn(`  ! ${name}: incomplete palette/scale line, skipped`);
    continue;
  }
  // `weapon class` is the one FIELD that is mechanical rather than prose — the
  // code reads it as a key, so it is extracted here alongside the meta line and
  // asserted against weapons.js. The owner picks it from a dropdown precisely so
  // this can never be a typo.
  const clsField = fieldsOf(item).find((f) => f.label === 'weapon class');
  const cls = clsField ? clsField.text.trim().toLowerCase() : '';

  out.bosses[id] = {
    name,
    primary: hexes[0].toUpperCase(),
    secondary: hexes[1].toUpperCase(),
    outline: hexes[2].toUpperCase(),
    scale: parseFloat(scale[1]),
    attackName: attack ? attack[1].trim() : '',
    weaponName: weapon ? weapon[1].trim() : '',
    weaponClass: cls,
  };
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`boss-data.json: ${Object.keys(out.bosses).length} bosses from TRACKER.md`);
