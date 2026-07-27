/**
 * UPDATER — the JS half of the in-app update button.
 *
 * WHY THIS EXISTS
 * ---------------
 * This is the development loop, not a distribution mechanism. Install the APK
 * once and every later build arrives from inside the game, so iterating does not
 * require a dev server running on a PC with a phone pointed at it over wifi.
 *
 *   tap         newest build of main
 *   long-press  pick a channel — main, or any branch with a live CI build
 *
 * All the real work is native (android/.../Updater.java). This file is a thin,
 * safe wrapper: outside the APK — in a browser during development — the plugin
 * simply is not there, and every call becomes a no-op that reports why. The
 * title screen can render the button unconditionally without branching.
 */

const plugin = () => globalThis.Capacitor?.Plugins?.Updater;

/** True only inside the APK, where the native plugin is registered. */
export const canUpdate = () => !!plugin();

/** Reason the button is unavailable, or null when it works. */
export const unavailableReason = () =>
  canUpdate() ? null : 'Updates are APK-only — this is the browser build';

/** TAP — check main for a newer build and install it. */
export function checkForUpdate() {
  const p = plugin();
  if (!p) return unavailableReason();
  p.checkForUpdate();
  return null;
}

/** LONG-PRESS — open the native channel picker. */
export function pickChannel() {
  const p = plugin();
  if (!p) return unavailableReason();
  p.pickChannel();
  return null;
}
