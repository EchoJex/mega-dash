import { defineConfig } from 'vite';

export default defineConfig({
  base: './',            // relative paths so the build works from file:// and inside the APK
  build: { outDir: 'dist', target: 'es2020', assetsInlineLimit: 0 },
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
