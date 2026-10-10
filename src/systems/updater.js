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

/**
 * True only where a native side registered the plugin: the APK, and the Windows
 * app (desktop/preload.js gives the page the same `Capacitor.Plugins.Updater`).
 */
export const canUpdate = () => !!plugin();

/** Reason the button is unavailable, or null when it works. */
const unavailableReason = () =>
  canUpdate() ? null : 'Updates only work in the Android and Windows apps — this is the browser build';

/**
 * TAP — check main for a newer build and install it.
 *
 * The return value only ever answers "could I start this", not "did it work".
 * Everything after the handoff — no network, nothing newer, a rejected
 * downgrade, the install itself — is reported by the native side as a toast,
 * because that is the only surface that still exists once the system installer
 * takes the screen. TitleScene must not present its own label as the outcome.
 */
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

/**
 * Windows only: the app reports progress here, because it has no toasts. Pass
 * null to stop listening. One listener at a time, which is all a title screen
 * needs.
 *
 * GATED ON `desktop === true`, NOT ON `onMessage` EXISTING. Capacitor's plugin
 * object on Android answers to ANY property name with a callable stub, so
 * `plugin().onMessage` is truthy there and calling it asks the native side for a
 * method it does not have: a rejected promise that the crash overlay would
 * report as a crash. Only the Windows bridge sets this flag to exactly `true`.
 */
export function onUpdateMessage(cb) {
  const p = plugin();
  if (p?.desktop === true) p.onMessage(cb);
}
