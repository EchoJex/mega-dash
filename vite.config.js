import { defineConfig } from 'vite';

export default defineConfig({
  base: './',            // relative paths so the build works from file:// and inside the APK
  build: {
    outDir: 'dist', target: 'es2020', assetsInlineLimit: 0,
    /**
     * SOURCEMAPS, BECAUSE THE CRASH OVERLAY IS THE WHOLE DIAGNOSTIC STORY.
     *
     * systems/crash.js exists so an exception on a phone with no debugger
     * attached paints a readable report the owner can photograph or copy, and
     * it goes to the trouble of trimming the origin off each stack frame to
     * make it legible. Against a minified bundle with no map, what it can
     * actually show is `Ie (assets/index-Bx7k2p.js:38:11229)` — a build-specific
     * byte offset that means nothing without that exact bundle to hand, which
     * is the one thing a playtest note never comes with.
     *
     * 'hidden' emits the .map files without appending the
     * //# sourceMappingURL comment, so nothing changes for a player and no
     * browser goes looking for a map that is not shipped.
     *
     * THE MAP MUST NOT REACH THE PHONE. It is ~11MB against a 1.6MB bundle, and
     * `cap sync` copies dist/ wholesale into the APK's assets — which would put
     * an 11MB tax on every update pulled over mobile data, in an app whose
     * entire distribution mechanism is that button. CI moves the maps out of
     * dist/ before `cap sync` and publishes them as a build artifact instead,
     * so a stack from build 1234 is decoded against build 1234's archived map.
     * See the "Set the sourcemaps aside" step in .github/workflows/build-apk.yml.
     */
    sourcemap: 'hidden',
    /**
     * THE SIM PAGE IS OPT-IN. `sim.html` boots the same game with no renderer
     * so tools/sim.mjs can drive thousands of fights, and it is only added to
     * the build when SIM=1 — which `npm run sim` sets and `npm run apk` does
     * not. A shipped APK therefore carries none of it.
     */
    rollupOptions: process.env.SIM
      ? { input: { main: 'index.html', sim: 'sim.html' } }
      : {},
  },
  server: { host: true }, // phone can hit the dev server over LAN
  // THE BUILD STAMP. CI sets BUILD_CODE to the same number it puts in the APK's
  // versionCode and the release notes, so the number on screen, the number the
  // updater compares, and the number on the release all agree. Without it a bug
  // report cannot be pinned to a build, and "it felt better before" is
  // unanswerable. Local builds say "dev" — which is itself the right answer.
  define: {
    __BUILD__: JSON.stringify(process.env.BUILD_CODE || 'dev'),
  },
});
