/**
 * SCENE INTEGRITY — every `this.method()` a scene calls has to exist.
 *
 * WHY THIS TEST EXISTS. `stepAttributes` called `this.gameOver()` for the whole
 * life of the elemental attribute layer, and no such method was ever written.
 * Burning to death — which Blaze Man and the Blaze Wheel both do — threw a
 * TypeError inside the fixed step, so the one way a status effect can finish
 * you produced the crash overlay instead of the results screen.
 *
 * Nothing caught it. The scenes import Phaser, which dereferences `window` at
 * module scope and therefore cannot be loaded under `node --test` at all, so
 * every existing test walks around them. It took a headless simulation playing
 * thousands of fights to find a typo.
 *
 * So this reads the SOURCE rather than importing it. That is a weaker check
 * than executing the code, and it is the strongest one available without a
 * browser in the loop — it costs nothing and it catches exactly the class of
 * mistake that got through: a call to a method that is not there.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../src/scenes/', import.meta.url).pathname;

/**
 * Names that live on Phaser.Scene rather than on our subclass. Not a guess —
 * these are the scene's injected plugins and systems, which is a short and
 * stable list.
 */
const PHASER = new Set([
  'add', 'anims', 'cache', 'cameras', 'children', 'data', 'events', 'game',
  'input', 'load', 'make', 'physics', 'plugins', 'registry', 'renderer',
  'scale', 'scene', 'sound', 'sys', 'textures', 'time', 'tweens',
]);

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.js'))) {
  test(`${file}: every this.method() call resolves`, () => {
    /**
     * COMMENTS ARE STRIPPED FIRST. This file's own first version failed on the
     * comment that documents the bug it was written for — the words
     * `this.gameOver()` in prose are not a call, and a scanner that cannot tell
     * the difference makes every explanation a liability.
     */
    const src = readFileSync(join(DIR, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

    // Class methods: `  name(...) {` at one level of indentation.
    const defined = new Set(
      [...src.matchAll(/^ {2}(?:static\s+|async\s+|\*)*([a-zA-Z_]\w*)\s*\(/gm)].map((m) => m[1]),
    );
    // ...plus anything assigned onto the instance, e.g. `this.nextBoss = ...`.
    for (const m of src.matchAll(/this\.([a-zA-Z_]\w*)\s*=/g)) defined.add(m[1]);

    const called = new Set(
      [...src.matchAll(/this\.([a-zA-Z_]\w*)\s*\(/g)].map((m) => m[1]),
    );

    const missing = [...called].filter((n) => !defined.has(n) && !PHASER.has(n));
    assert.deepEqual(missing, [],
      `${file} calls this.${missing.join('(), this.')}() which is never defined`);
  });
}
