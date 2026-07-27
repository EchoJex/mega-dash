package com.megadash.game;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridges the game's UPDATE button to the native {@link Updater}.
 *
 * Both methods resolve immediately — the work continues on a background thread
 * and reports to the user through toasts and the system installer dialog. There
 * is nothing useful to hand back to JavaScript, and blocking the web layer on a
 * download would just freeze the title screen.
 *
 * Exposed to the web layer as window.Capacitor.Plugins.Updater; see
 * src/systems/updater.js, which no-ops outside the APK.
 */
@CapacitorPlugin(name = "Updater")
public class UpdaterPlugin extends Plugin {

    /** TAP — newest build of main. */
    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        Updater.checkAndUpdate(getContext());
        call.resolve();
    }

    /** LONG-PRESS — choose a branch channel. */
    @PluginMethod
    public void pickChannel(PluginCall call) {
        Updater.pickChannelAndUpdate(getActivity());
        call.resolve();
    }
}
