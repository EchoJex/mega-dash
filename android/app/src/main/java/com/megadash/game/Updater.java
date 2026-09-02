package com.megadash.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * IN-APP UPDATER — this is the development loop, not a distribution feature.
 *
 * Install the APK once, then pull every subsequent build from inside the game.
 * That replaces running a dev server on a PC and pointing a phone at it over
 * wifi, which is a lot of moving parts to keep working just to see a change.
 *
 *   TAP the UPDATE button        newest build of main
 *   LONG-PRESS the UPDATE button pick a channel — main, or any live branch
 *
 * CI publishes one GitHub Release per branch tagged "ch-&lt;slug&gt;", plus a rolling
 * "latest" that only ever comes from main. Each release's notes carry
 * "versionCode=NNNN", which is what this compares against the installed build.
 *
 * Android will not let a sideloaded app install itself silently, so the flow
 * ends at a single system "Update this app?" confirmation. Everything before
 * that is automatic.
 *
 * Framework APIs only — HttpURLConnection, org.json, PackageInstaller — so the
 * app gains no dependencies. The cost is the INTERNET permission (this is the
 * app's only network use; the game itself is entirely offline) and
 * REQUEST_INSTALL_PACKAGES.
 */
public final class Updater {

    private static final String REPO = "EchoJex/mega-dash";
    private static final String API_LATEST =
            "https://api.github.com/repos/" + REPO + "/releases/latest";
    private static final String API_RELEASES =
            "https://api.github.com/repos/" + REPO + "/releases?per_page=50";

    /** Internal broadcast the PackageInstaller session reports status back on. */
    private static final String INSTALL_ACTION = "com.megadash.game.INSTALL_STATUS";
    private static final String UA = "MegaDash-Updater";

    private static final Handler ui = new Handler(Looper.getMainLooper());
    private static volatile boolean busy = false;
    private static volatile boolean receiverRegistered = false;

    private Updater() {}

    /** One channel = one branch's newest build. */
    private static final class Channel {
        final String branch; final long code; final String apkUrl;
        Channel(String branch, long code, String apkUrl) {
            this.branch = branch; this.code = code; this.apkUrl = apkUrl;
        }
    }

    /**
     * WHICH CHANNEL THE INSTALLED BUILD CAME FROM.
     *
     * versionCode alone cannot answer this, and that is what made the update
     * button lie. GITHUB_RUN_NUMBER increments per WORKFLOW, not per branch, so
     * a branch build gets a higher code than the last main build. Install one by
     * long-press, tap UPDATE, and `latest.code <= installed` was true — so the
     * game said "Already up to date" to somebody sitting on a feature branch,
     * and the only way back handed PackageInstaller an older APK, which it
     * refuses as a downgrade.
     *
     * Renumbering cannot fix it: Android requires versionCode to increase for
     * ANY install, so putting branch builds in a lower band would stop them
     * installing over main at all. Remembering the channel and saying something
     * true is the fix.
     */
    private static final String PREFS = "megadash_updater";
    private static final String KEY_BRANCH = "installed_branch";

    private static void rememberChannel(Context c, String branch) {
        if (branch == null || branch.isEmpty()) return;
        try {
            c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(KEY_BRANCH, branch).apply();
        } catch (Throwable ignored) {
            // Worst case we forget and fall back to the old message.
        }
    }

    /** The remembered channel, or null if this build predates the memory. */
    private static String installedBranch(Context c) {
        try {
            return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_BRANCH, null);
        } catch (Throwable t) {
            return null;
        }
    }

    /** Installed versionCode, or 0 if it cannot be read. */
    private static long installedCode(Context c) {
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Throwable t) {
            return 0L;
        }
    }

    /**
     * Android gates self-install behind a per-app "install unknown apps" toggle.
     * Returns true if we already hold it; otherwise sends the user to the
     * setting and returns false.
     */
    private static boolean ensureInstallPermission(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        if (context.getPackageManager().canRequestPackageInstalls()) return true;
        toast(context, "Allow Mega Dash to install apps, then tap UPDATE again");
        try {
            context.startActivity(new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + context.getPackageName()))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Throwable ignored) {
            // That settings screen is unavailable on this build; nothing else to do.
        }
        return false;
    }

    /** TAP: check main for a newer build, download it, hand it to the installer. */
    public static void checkAndUpdate(Context context) {
        if (busy) { toast(context, "Update already in progress…"); return; }
        if (!ensureInstallPermission(context)) return;

        busy = true;
        final Context app = context.getApplicationContext();
        toast(app, "Checking for updates…");
        new Thread(() -> {
            try {
                Channel latest = fetchLatest();
                long installed = installedCode(app);
                String on = installedBranch(app);
                if (latest == null || latest.apkUrl == null) {
                    toast(app, "No build published yet");
                } else if (latest.code <= installed) {
                    // The honest version. If this build came from a branch, it
                    // is NOT "up to date with main" — main's newest is simply
                    // numbered lower, and Android will refuse to install it over
                    // this one. Saying so is the difference between a
                    // playtester who knows to reinstall and one who believes
                    // they are on main for the rest of the week.
                    if (on != null && !"main".equals(on)) {
                        toast(app, "You are on branch '" + on + "' (build " + installed
                                + "). Main's newest is " + latest.code
                                + ", which is older, so it cannot install over this."
                                + " Uninstall first to go back to main.");
                    } else {
                        toast(app, "Already up to date (build " + installed + ")");
                    }
                } else {
                    toast(app, "Downloading build " + latest.code + "…");
                    downloadAndInstall(app, latest.apkUrl, latest.code, latest.branch);
                }
            } catch (Throwable t) {
                toast(app, "Update check failed: " + describe(t));
            } finally {
                busy = false;
            }
        }).start();
    }

    /** LONG-PRESS: list every branch channel and install the one chosen. */
    public static void pickChannelAndUpdate(final Activity activity) {
        if (activity == null) return;
        if (busy) { toast(activity, "Update already in progress…"); return; }
        if (!ensureInstallPermission(activity)) return;

        busy = true;
        final Context app = activity.getApplicationContext();
        toast(app, "Loading build channels…");
        new Thread(() -> {
            List<Channel> channels;
            try {
                channels = fetchChannels();
            } catch (Throwable t) {
                channels = new ArrayList<>();
            }
            final List<Channel> found = channels;
            ui.post(() -> {
                if (found.isEmpty()) {
                    toast(app, "No channels found");
                    busy = false;
                    return;
                }
                showPicker(activity, app, found);
            });
        }).start();
    }

    private static void showPicker(Activity activity, final Context app, final List<Channel> channels) {
        long installed = installedCode(app);
        String[] labels = new String[channels.size()];
        for (int i = 0; i < channels.size(); i++) {
            Channel c = channels.get(i);
            String rel = c.code > installed ? "newer"
                    : c.code == installed ? "installed" : "older";
            labels[i] = c.branch + " — build " + c.code
                    + (i == 0 ? " (latest)" : "") + "\n" + rel;
        }
        try {
            new AlertDialog.Builder(activity)
                    .setTitle("Update from channel")
                    .setSingleChoiceItems(labels, 0, null)
                    .setPositiveButton("Update", (d, which) -> {
                        int idx = ((AlertDialog) d).getListView().getCheckedItemPosition();
                        d.dismiss();
                        if (idx < 0 || idx >= channels.size()) { busy = false; return; }
                        installChannel(app, channels.get(idx));
                    })
                    .setNegativeButton("Cancel", (d, which) -> { d.dismiss(); busy = false; })
                    .setOnCancelListener(d -> busy = false)
                    .show();
        } catch (Throwable t) {
            busy = false;
            toast(app, "Couldn't open the picker");
        }
    }

    private static void installChannel(final Context app, final Channel c) {
        /**
         * REFUSE BEFORE THE DOWNLOAD, NOT AFTER IT.
         *
         * The picker already labels a channel "older", and then let you select
         * it and press Update: the whole APK came down over mobile data and
         * PackageInstaller rejected it as a downgrade at the very end. Several
         * megabytes and a wait, to be told something the label had already said.
         *
         * Equal codes are allowed through — reinstalling the build you are on is
         * a legitimate way to recover a bad install.
         */
        long installed = installedCode(app);
        if (c.code < installed) {
            toast(app, c.branch + " build " + c.code + " is older than the installed build "
                    + installed + ". Android will not install over a newer one —"
                    + " uninstall first if you need to go back.");
            busy = false;
            return;
        }
        toast(app, "Downloading " + c.branch + " build " + c.code + "…");
        new Thread(() -> {
            try {
                downloadAndInstall(app, c.apkUrl, c.code, c.branch);
            } catch (Throwable t) {
                toast(app, "Update failed: " + describe(t));
            } finally {
                busy = false;
            }
        }).start();
    }

    // ── GitHub ────────────────────────────────────────────────────────

    private static HttpURLConnection api(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("Accept", "application/vnd.github+json");
        conn.setRequestProperty("User-Agent", UA);
        return conn;
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toString("UTF-8");
    }

    /** releases/latest -> the rolling main build. */
    private static Channel fetchLatest() throws Exception {
        HttpURLConnection conn = api(API_LATEST);
        try {
            if (conn.getResponseCode() != 200) {
                throw new RuntimeException("GitHub returned " + conn.getResponseCode());
            }
            JSONObject obj = new JSONObject(readAll(conn.getInputStream()));
            return channelFrom(obj, "main");
        } finally {
            conn.disconnect();
        }
    }

    /** /releases -> one Channel per "ch-*" release, newest build first. */
    private static List<Channel> fetchChannels() throws Exception {
        HttpURLConnection conn = api(API_RELEASES);
        try {
            if (conn.getResponseCode() != 200) {
                throw new RuntimeException("GitHub returned " + conn.getResponseCode());
            }
            JSONArray arr = new JSONArray(readAll(conn.getInputStream()));
            List<Channel> out = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.getJSONObject(i);
                String tag = r.optString("tag_name");
                // Only per-branch channels; skip the rolling "latest" duplicate.
                if (!tag.startsWith("ch-")) continue;
                Channel c = channelFrom(r, tag.substring(3));
                if (c != null) out.add(c);
            }
            Collections.sort(out, new Comparator<Channel>() {
                public int compare(Channel a, Channel b) { return Long.compare(b.code, a.code); }
            });
            return out;
        } finally {
            conn.disconnect();
        }
    }

    /** Pull versionCode, branch and the .apk asset URL out of one release object. */
    private static Channel channelFrom(JSONObject r, String fallbackBranch) {
        String body = r.optString("body");
        String branch = group(body, "branch=(.+)");
        if (branch == null || branch.trim().isEmpty()) branch = fallbackBranch;

        long code = 0L;
        String codeStr = group(body, "versionCode=(\\d+)");
        if (codeStr != null) { try { code = Long.parseLong(codeStr); } catch (Throwable ignored) {} }

        String apkUrl = null;
        JSONArray assets = r.optJSONArray("assets");
        if (assets != null) {
            for (int i = 0; i < assets.length(); i++) {
                JSONObject a = assets.optJSONObject(i);
                if (a == null) continue;
                String name = a.optString("name");
                if (name.endsWith(".apk")) {
                    apkUrl = a.optString("browser_download_url");
                    // Fallback if the notes were missing: read it off MegaDash-NNNN.apk
                    if (code == 0L) {
                        String n = group(name, "(\\d+)");
                        if (n != null) { try { code = Long.parseLong(n); } catch (Throwable ignored) {} }
                    }
                    break;
                }
            }
        }
        if (apkUrl == null || code <= 0) return null;
        return new Channel(branch.trim(), code, apkUrl);
    }

    private static String group(String haystack, String regex) {
        if (haystack == null) return null;
        Matcher m = Pattern.compile(regex).matcher(haystack);
        return m.find() ? m.group(1) : null;
    }

    /**
     * Opens the APK for reading, following GitHub's redirect to its asset host.
     * The caller owns the connection and must disconnect it.
     */
    private static HttpURLConnection openForDownload(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        int redirects = 0;
        while (true) {
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);
            conn.setRequestProperty("User-Agent", UA);
            int code = conn.getResponseCode();
            if (code >= 301 && code <= 308 && code != 304) {
                String loc = conn.getHeaderField("Location");
                conn.disconnect();
                if (loc == null || ++redirects > 5) throw new RuntimeException("too many redirects");
                url = new URL(url, loc);
                continue;
            }
            if (code != 200) {
                conn.disconnect();
                throw new RuntimeException("download HTTP " + code);
            }
            return conn;
        }
    }

    // ── Install ───────────────────────────────────────────────────────

    /**
     * Streams the APK from the network straight into a PackageInstaller session.
     *
     * IT USED TO BUFFER THE WHOLE FILE TWICE. `download()` grew a
     * ByteArrayOutputStream to the full APK and then `toByteArray()` copied it,
     * so a Phaser-sized APK sat in the heap twice over before a single byte
     * reached the installer — on a phone, for no benefit, since the session is
     * a stream and always was.
     *
     * The progress toasts are the other half of the fix. There was one message
     * when the download started and then nothing at all for up to the 60-second
     * read timeout, which is indistinguishable from the button having done
     * nothing.
     */
    private static void downloadAndInstall(Context context, String urlStr, long code, String branch)
            throws Exception {
        // Recorded BEFORE the install hands off: the session completes
        // asynchronously and the process is replaced, so writing it afterwards
        // is not guaranteed to happen at all.
        rememberChannel(context, branch);
        registerStatusReceiver(context);

        HttpURLConnection conn = openForDownload(urlStr);
        PackageInstaller installer = context.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        int sessionId = installer.createSession(params);
        PackageInstaller.Session session = installer.openSession(sessionId);
        try {
            // getContentLength() rather than the long variant: that is API 24+,
            // and an APK is comfortably inside int range. -1 (unknown) is a
            // legal length for openWrite.
            int total = conn.getContentLength();
            InputStream in = conn.getInputStream();
            OutputStream out = session.openWrite("megadash-" + code, 0, total > 0 ? total : -1);
            byte[] buf = new byte[65536];
            int n;
            long done = 0, nextMark = 0;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                done += n;
                // A word every quarter, so a slow connection still shows life.
                if (total > 0 && done >= nextMark) {
                    int pct = (int) (done * 100 / total);
                    toast(context, "Downloading build " + code + "… " + pct + "%");
                    nextMark = (long) total * (pct / 25 + 1) / 4;
                }
            }
            session.fsync(out);
            out.close();
            in.close();

            Intent intent = new Intent(INSTALL_ACTION).setPackage(context.getPackageName());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
            PendingIntent pi = PendingIntent.getBroadcast(context, sessionId, intent, flags);
            session.commit(pi.getIntentSender());
        } finally {
            session.close();
            conn.disconnect();
        }
    }

    /** One app-internal receiver that surfaces the installer's status. */
    private static void registerStatusReceiver(Context context) {
        if (receiverRegistered) return;
        receiverRegistered = true;
        final Context app = context.getApplicationContext();
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent intent) {
                int status = intent.getIntExtra(
                        PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
                if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    // Launch the system "Update this app?" confirmation.
                    Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                    if (confirm != null) {
                        try {
                            app.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                        } catch (Throwable t) {
                            toast(app, "Couldn't open the installer");
                        }
                    }
                } else if (status == PackageInstaller.STATUS_SUCCESS) {
                    toast(app, "Update installed");
                } else {
                    String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
                    toast(app, "Install failed: " + (msg != null ? msg : "cancelled"));
                }
            }
        };
        IntentFilter filter = new IntentFilter(INSTALL_ACTION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            app.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            app.registerReceiver(receiver, filter);
        }
    }

    /**
     * A message a person can act on, not the exception's own words.
     *
     * UnknownHostException.getMessage() is the bare hostname, so a playtester on
     * a plane got a toast reading "Update check failed: api.github.com" — which
     * names the thing that worked (we resolved what to call) rather than the
     * thing that did not (there is no network).
     */
    private static String describe(Throwable t) {
        if (t instanceof java.net.UnknownHostException
                || t instanceof java.net.ConnectException) {
            return "no internet connection";
        }
        if (t instanceof java.net.SocketTimeoutException) return "the network timed out";
        String m = t.getMessage();
        return m != null ? m : t.getClass().getSimpleName();
    }

    private static void toast(final Context context, final String msg) {
        ui.post(() -> Toast.makeText(context, msg, Toast.LENGTH_LONG).show());
    }
}
