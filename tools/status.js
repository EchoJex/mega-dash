#!/usr/bin/env node
/**
 * ELEMENT SLICE BOARD — `npm run status`.
 *
 * The project builds one ELEMENT at a time: a boss, its arena, its hazards, its
 * attribute and its weapon, finished together and playtested before the next one
 * starts. This prints where every slice actually stands, read from live code and
 * from the tracker.
 *
 * WHY A TOOL AND NOT A TABLE IN CLAUDE.md: a hand-written progress table is
 * wrong within a day and nobody notices, which is exactly the class of drift
 * this project has already been bitten by twice. This cannot go stale — it has
 * no memory of its own.
 */
import { readFileSync } from 'node:fs';
import { parse, fieldsOf } from '../docs/tracker-md.js';
import { BOSSES } from '../src/data/bosses.js';
import { FIGHTS } from '../src/data/bossFights.js';
import { FURNISHED } from '../src/systems/arena.js';
import { WEAPON_BY_ID, hasLadder } from '../src/data/weapons.js';
import { THEMES } from '../src/systems/terrain.js';

// Read the tracker's own Markdown, so the board reflects what the owner sees.
const md = parse(readFileSync(new URL('../design/TRACKER.md', import.meta.url), 'utf8'));
const slices = md.sections.find((s) => s.title === 'SLICES');
const byId = {};
for (const item of slices.items) {
  if (item.title === null) continue;
  const meta = item.content.filter((c) => c.type === 'raw').map((c) => c.line).join(' ');
  const id = (/`id`\s*([a-z_]+)/.exec(meta) || [])[1];
  if (id) byId[id] = fieldsOf(item);
}
const furnished = new Set(FURNISHED());

// The field labels that make up a slice's design, as they read in TRACKER.md.
const DESIGN_FIELDS = [
  'arena', 'hazard L1', 'hazard L2', 'hazard L3',
  'attack L1', 'attack L2', 'attack L3',
  'weapon', 'weapon Lv1', 'weapon Lv3', 'weapon Lv6', 'weapon Lv10',
];

const layers = (table) => [1, 2, 3].filter((l) => table?.[l]).length;
const bar = (n, of) => '#'.repeat(n) + '.'.repeat(of - n);

const rows = BOSSES.map((b) => {
  const fields = byId[b.id] || [];
  const of = (label) => fields.find((f) => f.label === label);
  const written = DESIGN_FIELDS.filter((k) => of(k)?.text?.trim()).length;
  // MARKERS, under the current scheme: `[draft]` is the go-ahead to build,
  // `[wip]` means the owner is still writing it and it must be skipped, and
  // `[ready]` means built and settled. See design/TRACKER.md — this is the
  // reverse of the original scheme and the reason a "draft" is not a warning.
  const buildable = DESIGN_FIELDS.filter((k) => of(k)?.mark === 'draft').length;
  const unready = DESIGN_FIELDS.filter((k) => of(k)?.mark === 'wip').length;
  const atk = layers(FIGHTS[b.id]?.attack);
  const haz = layers(FIGHTS[b.id]?.hazard);
  const wpn = hasLadder(b.dropWeapon);
  const built = atk + haz + (furnished.has(b.id) ? 1 : 0) + (wpn ? 1 : 0);
  return {
    b, written, buildable, unready, atk, haz, wpn,
    furn: furnished.has(b.id),
    theme: !!THEMES[b.id],
    built,
    // A slice is DONE when its weapon has a real ladder, it has at least one
    // attack and hazard layer, its arena is furnished, and no design field is
    // still waiting: nothing left `[draft]` to build, nothing left `[wip]` to
    // write.
    done: wpn && atk >= 1 && haz >= 1 && furnished.has(b.id)
      && buildable === 0 && unready === 0,
  };
});

const W = 13;
console.log('\nELEMENT SLICE BOARD — one element built end to end at a time\n');
console.log(
  'ELEMENT'.padEnd(10) + 'BOSS'.padEnd(W)
  + 'DESIGN'.padEnd(20) + 'ATK'.padEnd(6) + 'HAZ'.padEnd(6)
  + 'ARENA'.padEnd(7) + 'WEAPON'.padEnd(8) + 'STATE',
);
console.log('-'.repeat(82));

for (const r of rows) {
  const notes = [];
  if (r.buildable) notes.push(`${r.buildable} to build`);
  if (r.unready) notes.push(`${r.unready} wip`);
  const design = notes.length ? `${r.written}/12 (${notes.join(', ')})` : `${r.written}/12`;
  const state = r.done ? 'DONE'
    : r.buildable > 0 ? 'READY TO BUILD'
      : r.built > 0 ? 'in progress'
        : r.written > 0 ? 'design only' : '-';
  console.log(
    r.b.element.padEnd(10)
    + r.b.name.replace(' MAN', '').padEnd(W)
    + design.padEnd(20)
    + bar(r.atk, 3).padEnd(6)
    + bar(r.haz, 3).padEnd(6)
    + (r.furn ? 'built' : '-').padEnd(7)
    + (r.wpn ? 'ladder' : 'flat').padEnd(8)
    + state,
  );
}

const done = rows.filter((r) => r.done).length;
const started = rows.filter((r) => r.built > 0).length;
const buildable = rows.reduce((s, r) => s + r.buildable, 0);
const unready = rows.reduce((s, r) => s + r.unready, 0);

console.log('-'.repeat(82));
console.log(`slices complete: ${done}/17   started: ${started}/17`);
console.log(`design fields ready to build [draft]: ${buildable}   `
  + `still being written [wip]: ${unready}`);
console.log(`\nATK/HAZ show which of the 3 layers are built, not which are designed —`);
console.log(`a boss whose tracker only defines one layer is complete at 1/3.`);
console.log(`WEAPON reads 'flat' until the weapon gains a WEAPON_LADDERS entry.`);
if (buildable) {
  console.log(`\n${buildable} design fields are [draft]: the owner has finished them and`);
  console.log(`they are waiting to be built. ${unready} more are [wip] and must be left alone.`);
} else if (unready) {
  console.log(`\nNothing is [draft], so there is nothing to build. ${unready} fields are`);
  console.log(`[wip] — the owner is still writing them.`);
}
console.log('');
