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

/**
 * REFUSE TO RUN IF THE PARSER READ NOTHING. This tool OVERWRITES a committed
 * file, so "produced garbage quietly" is its worst possible failure and it
 * happened: on a CRLF checkout FIELD_RE matched nothing, every field degraded
 * into a raw line, the meta-line fallback below still found the palette hexes in
 * that raw text — so the `hexes.length < 3` skip never fired — and this wrote
 * `attackName`, `weaponName` and `weaponClass` BLANK on all seventeen bosses,
 * then printed `boss-data.json: 17 bosses from TRACKER.md` and exited 0.
 *
 * A slice with a `- **label** \`[mark]\`` line in it MUST parse as a field. If
 * none of them do, the parser is broken, not the design — so stop before the
 * write rather than after it.
 */
const fieldLines = slices.items
  .flatMap((it) => rawOf(it))
  .filter((l) => /^- \*\*.+\*\* `\[\w+\]`/.test(l));
if (fieldLines.length) {
  throw new Error(
    `${fieldLines.length} field lines did not parse as fields — the parser is not `
    + 'reading TRACKER.md correctly, so boss-data.json was NOT written.\n'
    + `First unparsed: ${fieldLines[0]}`,
  );
}

const out = { _note: 'GENERATED from design/TRACKER.md by tools/sync-tracker.js. Do not edit.', bosses: {} };

for (const item of slices.items) {
  if (item.title === null) continue;                 // section intro, not a boss
  const meta = rawOf(item).join(' ');
  const name = item.title.split('—')[0].trim();

  /**
   * THE MECHANICAL VALUES ARE FIELDS. The meta-line fallback that used to sit
   * behind each of these is gone.
   *
   * It was here so a slice written in the old raw `palette ... scale ...` shape
   * kept working and this never became a flag day. All seventeen have been in
   * the field shape for a while, so it was supporting nothing — and it had a
   * real cost: on a CRLF checkout every field degraded into a raw line, the
   * fallback found the palette hexes in that raw text, the `hexes.length < 3`
   * skip never fired, and this wrote three fields BLANK on all seventeen
   * bosses and exited 0. The guard above now stops that case outright, and
   * without a fallback underneath it a missing field is a missing field.
   */
  const f = (label) => fieldsOf(item).find((x) => x.label === label)?.text?.trim() || '';
  const ONE_HEX = /^#[0-9A-Fa-f]{6}$/;
  const hexes = [f('palette primary'), f('palette secondary'), f('palette outline')]
    .filter((h) => ONE_HEX.test(h));
  const scale = /([\d.]+)\s*x/.exec(f('scale'));

  /**
   * THE ID IS STILL A RAW STAMP, and that is not a leftover — it is the join
   * key boss-data.json, the status board and every save depend on, so it stays
   * readable and not editable rather than becoming a textbox nobody can undo.
   *
   * What IS gone is deriving it from the display name when the stamp is
   * missing. Tempest Man ships as `torrent`, so that path produced a wrong id
   * rather than an error — and a wrong join key is the one failure here that
   * nothing downstream can notice.
   */
  const stamped = /`id`\s*([a-z_]+)/.exec(meta);
  if (!stamped) throw new Error(`${name}: no \`id\` stamp — cannot join this slice to the code`);
  const id = stamped[1];

  if (hexes.length < 3 || !scale) {
    console.warn(`  ! ${name}: incomplete palette/scale fields, skipped`);
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
    attackName: f('attack name'),
    weaponName: f('weapon name'),
    weaponClass: cls,
  };
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`boss-data.json: ${Object.keys(out.bosses).length} bosses from TRACKER.md`);
