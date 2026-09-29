/**
 * MUSIC — the plumbing that turns a place in the game into a track name.
 *
 * The game asks for `bgm-<boss id>-stage` and the owner hands off a file of
 * that name. Two parts of the project have to spell it the same way, and if
 * one drifts nothing crashes — that boss just stays silent. So the spelling is
 * checked against the tracker's own lines, for every boss.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACK, playMusic, fadeOutMusic, musicState } from '../src/systems/music.js';
import { BOSSES } from '../src/data/bosses.js';

const tracker = readFileSync(new URL('../design/TRACKER.md', import.meta.url), 'utf8');

test('every boss\'s tracker lines name the file the game will ask for', () => {
  for (const b of BOSSES) {
    for (const kind of ['stage', 'arena']) {
      const want = `\`${TRACK[kind](b.id)}.ogg\``;
      assert.ok(tracker.includes(want), `${b.id}: tracker never mentions ${want}`);
    }
  }
  assert.ok(tracker.includes(`\`${TRACK.menu}.ogg\``));
  assert.ok(tracker.includes(`\`${TRACK.postFight}.ogg\``));
});

test('with no audio at all, asking for music is silence and never throws', () => {
  playMusic(TRACK.menu);
  assert.equal(musicState().wanted, TRACK.menu);
  assert.equal(musicState().playing, null);
  fadeOutMusic(10);
  assert.equal(musicState().wanted, null);
});
