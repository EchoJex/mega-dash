/**
 * THE DECISIONS THE WINDOWS UPDATER MAKES, with no Electron and no network in
 * them, so `tests/desktop.test.js` can run them in a hundredth of a second.
 *
 * This is the Windows twin of android/.../Updater.java and it reads the same
 * releases: one per branch tagged `ch-<branch>`, plus a rolling `latest` that
 * only main publishes, each with `versionCode=NNNN` and `branch=<name>` in its
 * notes. The one difference is WHAT it downloads. The APK is the whole app;
 * here the window program (Chromium and a launcher) is installed once and the
 * update is only the game's files, `MegaDash-<code>-game.asar`, a couple of
 * megabytes. Replacing a 100MB program on every push would be the same mistake
 * the music pack was built to avoid.
 */

const REPO = 'EchoJex/mega-dash';
const PAYLOAD = /^MegaDash-(\d+)-game\.asar$/;

/**
 * One channel = one branch's newest game build. Null if the release has none.
 *
 * THE NUMBER COMES FROM THE FILE'S NAME, NOT FROM THE NOTES. The APK job writes
 * `versionCode=` the moment it publishes, and the game file is uploaded a few
 * minutes later by a second job. In between, the notes name the NEW build while
 * the attached file is still the previous one; trusting the notes would label
 * old files with new numbers, and the player would be told they were up to date
 * on a build they are not on.
 */
function channelFrom(release, fallbackBranch) {
  const body = String((release && release.body) || '');
  const branch = (/branch=(.+)/.exec(body) || [])[1];

  for (const a of (release && release.assets) || []) {
    const m = PAYLOAD.exec((a && a.name) || '');
    if (!m) continue;
    const code = Number(m[1]);
    if (!a.browser_download_url || code <= 0) return null;
    return {
      branch: (branch || fallbackBranch).trim(), code,
      url: a.browser_download_url, size: a.size || 0,
    };
  }
  return null;
}

/** Every `ch-*` release as a channel, newest build first. */
function channelsFrom(releases) {
  const out = [];
  for (const r of releases || []) {
    const tag = String((r && r.tag_name) || '');
    if (!tag.startsWith('ch-')) continue;
    const c = channelFrom(r, tag.slice(3));
    if (c) out.push(c);
  }
  return out.sort((a, b) => b.code - a.code);
}

/**
 * What a TAP on UPDATE should do. A tap always means "newest main".
 *
 * Unlike Android, Windows could install an older build, but a tap must never do
 * it: a save carries the format number it was written under, and going back to
 * a build with a lower one wipes the save. So a player sitting on a branch
 * build is told, and sent to the long-press list, where going back asks first.
 */
function decideTap({ installed, installedBranch, latest }) {
  if (!latest) {
    return { install: false, message: 'No Windows game build for main yet. If you just pushed, give CI a few minutes' };
  }
  if (latest.code > installed) {
    return { install: true, message: '' };
  }
  if (installedBranch && installedBranch !== 'main') {
    return {
      install: false,
      message: `You are on branch '${installedBranch}' (build ${installed}). Main's newest is `
        + `${latest.code}, which is older. Hold UPDATE and pick main to go back.`,
    };
  }
  return { install: false, message: `Already up to date (build ${installed})` };
}

/** One line of the long-press list. */
function labelFor(channel, installed, index) {
  const rel = channel.code > installed ? 'newer' : channel.code === installed ? 'installed' : 'older';
  return `${channel.branch} — build ${channel.code}${index === 0 ? ' (latest)' : ''} · ${rel}`;
}

/** Going back needs a yes, because it can wipe the save. */
const isOlder = (channel, installed) => channel.code < installed;

/** A message a person can act on, not the exception's own words. */
function describe(err) {
  const code = err && (err.code || (err.cause && err.cause.code));
  if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'ERR_INTERNET_DISCONNECTED',
    'ERR_NAME_NOT_RESOLVED', 'ERR_NETWORK_CHANGED', 'ERR_CONNECTION_REFUSED'].includes(code)
    || /net::ERR_(INTERNET|NAME|NETWORK|CONNECTION)/.test(String(err && err.message))) {
    return 'no internet connection';
  }
  if (code === 'ETIMEDOUT' || /timed? ?out/i.test(String(err && err.message))) {
    return 'the network timed out';
  }
  return (err && err.message) || 'unknown error';
}

module.exports = {
  REPO, PAYLOAD, channelFrom, channelsFrom, decideTap, labelFor, isOlder, describe,
};
