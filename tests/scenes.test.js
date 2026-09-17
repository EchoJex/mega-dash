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
import { fileURLToPath } from 'node:url';

// `fileURLToPath`, NOT `.pathname`. On Windows a file: URL's pathname is
// `/C:/Users/...`, which readdirSync then resolves against cwd — producing
// `C:\C:\Users\...` and an ENOENT at import time. The whole file died before a
// single test ran, so `node --test` showed one generic failure and the seven
// per-scene checks below silently did not exist on the machine the game is
// actually developed on. tools/sim.mjs and tools/smoke.mjs already do this.
const DIR = fileURLToPath(new URL('../src/scenes/', import.meta.url));

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


/**
 * PER-VISIT STATE MUST BE RESET IN `create()`, and this catches the whole class.
 *
 * PHASER REUSES THE SCENE INSTANCE across `scene.start()`, so a field still
 * holding a destroyed object looks alive to every guard that tests it. The dev
 * menu's boss picker died exactly this way: picking a boss started the game
 * without nulling `this.picker`, `openBossPicker` bails on a truthy picker, and
 * the row silently did nothing for the rest of the session — it highlighted,
 * it played its sound, and no picker opened.
 *
 * The rule that catches it: a field the scene sets to `null` ANYWHERE is a
 * field with a teardown path, so `create()` has to establish it. Source-read
 * like the rest of this file, because scenes import Phaser and cannot be loaded
 * under `node --test`.
 */
test('every scene field with a teardown path is reset in create()', () => {
  const dir = new URL('../src/scenes/', import.meta.url);

  /** A method's body, by brace matching from its declaration. */
  const bodyOf = (src, decl) => {
    const at = src.indexOf(decl);
    if (at < 0) return '';
    let i = src.indexOf('{', at), depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) return src.slice(at, i);
    }
    return src.slice(at);
  };

  let checked = 0;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const src = readFileSync(new URL(file, dir), 'utf8');
    const create = bodyOf(src, '\n  create(');
    if (!create) continue;

    /**
     * FOLLOW ONE LEVEL IN. GameScene initialises almost everything in
     * `startRun()` rather than in `create()` itself, and counting that as
     * uninitialised is a false alarm that gets the test deleted rather than
     * the bug fixed. One level is enough for every scene here.
     */
    let reach = create;
    for (const m of new Set([...create.matchAll(/this\.([a-zA-Z_]\w*)\(/g)].map((x) => x[1]))) {
      reach += bodyOf(src, `\n  ${m}(`);
    }

    const nulled = new Set([...src.matchAll(/this\.([a-zA-Z_]\w*)\s*=\s*null/g)].map((m) => m[1]));
    const set = new Set([...reach.matchAll(/this\.([a-zA-Z_]\w*)\s*=/g)].map((m) => m[1]));
    for (const k of nulled) {
      checked++;
      assert.ok(set.has(k),
        `${file}: this.${k} is nulled somewhere but nothing create() runs sets it — `
        + 'a reused scene instance carries the stale value into the next visit');
    }
  }
  assert.ok(checked >= 3, `only ${checked} fields checked; the scan may be broken`);
});
