import { defineConfig } from 'vite';

export default defineConfig({
  base: './',            // relative paths so the build works from file:// and inside the APK
  build: { outDir: 'dist', target: 'es2020', assetsInlineLimit: 0 },
  server: { host: true }, // phone can hit the dev server over LAN
});
