# Mega Dash

> ## Work lands on `main`
>
> Every push to every branch produces an installable build, so a feature branch is
> never needed just to try something — but `main` is where work goes unless there is
> a reason to isolate it. The in-app updater publishes its rolling `latest` channel
> from `main` only, and the tracker web app is served from `main`, so a long-lived
> side branch silently costs a channel pick on every playtest and hides the design
> from the tool that edits it.

A mobile-first, landscape-only 2D side-scrolling platformer.
**Mega Man 2 aesthetics · Vampire Survivors levelling and meta progression.**

17 elemental robot masters, each  unlocking a special weapon. Procedurally generated
platforming, hazards, and minion spawning between boss doors whose difficulty scales with time to prevent camping. Bosses you have beaten return harder, permanently. 

Built with Phaser 3 + Vite, wrapped by Capacitor. **The Android APK is the delivery
target** — shipping inside a known WebView rather than whatever browser a player happens
to open keeps the experience consistent. On a PC the same idea is a **Windows app**: the
game in its own window, with its own copy of Chromium inside (not Edge). See
*Playing on a Windows PC* below.

## Quick start — no PC setup required

1. Open the **[latest release](../../releases/tag/latest)** and download the `.apk`.
   That is a direct download and needs no GitHub account — the Actions tab works too,
   but it wants you signed in and hands you a zip to unpack on a phone.
2. Install it on the phone (allow "install from unknown sources" once).
3. From then on, **never download an APK by hand again**:
   - **tap UPDATE** on the title screen → newest build of `main`
   - **long-press UPDATE** → pick a channel: `main`, or any branch being worked on

Every push that touches code produces an installable build, so testing a work-in-progress
branch is: push it, open the game, long-press UPDATE, pick the branch. Pushes that only
touch `design/`, `docs/` or Markdown are skipped, because the tracker web app autosaves
on every pause in typing and each of those would otherwise burn a full Android build.

### A build may wipe your save, and it will say so

This is in development and expects to be for a long time, so wiping save data is an
ordinary cost of a change rather than a disaster to engineer around — there are no
migrations and there deliberately never will be any. When a build's save format moves,
the old save is cleared on the first launch and the title screen says so in gold. Chips,
upgrades and boss layers go; nothing else is stored. `SAVE_BREAK` in
`src/systems/save.js` is the whole mechanism, and its note is the one line anybody
reads about it — including, if it ever comes to that, "uninstall and reinstall".

**Going back to `main` from a branch build needs an uninstall.** Build numbers come from
one counter shared across every branch, so a branch build is numbered *above* the last
`main` build and Android will not install the lower number over it. The game says so
rather than claiming you are up to date.

## Playing on a Windows PC

### The Windows app (easiest)

One file, nothing to install. The game runs in its own window with its own copy of
Chromium packed inside, so it behaves the same on every PC whatever browser is
installed. Windows 10 or 11, 64-bit.

1. Download **`MegaDash-Windows.exe`** from the
   **[latest release](../../releases/tag/latest)** and put it anywhere (the Desktop is fine).
2. Double-click it. **The first time, Windows shows a blue "Windows protected your PC"
   box.** Click **More info**, then **Run anyway**. It appears because the app is not
   signed with a paid publisher certificate, which is not worth buying for a playtest.
   The file is built from this repository by GitHub's own build servers.
3. **Tap UPDATE on the title screen once.** The `.exe` holds a copy of the game from the day
   the app itself was last rebuilt, so a fresh download is behind. UPDATE fetches the
   current game (about 2 megabytes), reloads the window, and says so on the line under the
   buttons. From then on it works like the phone: **tap** for the newest build of `main`,
   **press and hold** to pick any branch from a list. You almost never need a new `.exe`;
   that only changes when the window program itself changes.

Things worth knowing:

- **Keyboard only.** The keys are in [CLAUDE.md → Controls — as bound](CLAUDE.md).
  **F11** (or **Alt+Enter**) toggles fullscreen. Esc stays the game's pause key.
- **Your save is kept outside the game's files**, in `%APPDATA%\Mega Dash`. Updating,
  replacing the `.exe` or moving it never touches it. Deleting the `.exe` does not delete
  the save either; delete that folder as well to remove everything.
- **Going back to an older build can reset your save** if the save format changed in
  between, so the list asks before it does it. A plain tap never steps you back.
- **The music downloads from GitHub the first time**, then is kept on your PC. With no
  internet on that first run the game plays silently.
- **One copy at a time.** Opening it again just brings the open window forward, so two
  copies cannot fight over the same save.

### Or in a browser, from the source

For quick checks, or if you would rather not run an `.exe`. This route needs more setup.

**One-time setup, about five minutes:**

1. **Install Node.js** — the program that runs a small server for the game. Download the
   "LTS" version from [nodejs.org](https://nodejs.org), or in PowerShell run
   `winget install OpenJS.NodeJS.LTS`. The release builds use Node 22; newer is fine.
   Close and reopen PowerShell afterwards so it can find it.
2. **Get the game.** On this page click **Code → Download ZIP** and unzip it, or run
   `git clone https://github.com/echojex/mega-dash.git`.
3. **Open PowerShell in the game's folder.** In File Explorer, click the address bar,
   type `powershell` and press Enter. Then run `npm install` once.

**Every time you want to play:**

```powershell
npm run dev
```

Leave that window open, then go to **<http://localhost:5173/?dev=0>** in your browser.
Close the window (or press Ctrl+C in it) to stop. `?dev=0` plays the game as it ships. Leave
it off and the game first asks DEV MODE or PLAYTESTER; pick PLAYTESTER for the same thing.

- **Your save lives in the browser, under that exact address.** A different browser, or
  a different number after `localhost:`, is a different, empty save. If the window says
  it started on a port other than 5173, the old one was busy: use the number it shows,
  and expect a fresh save.
- **Windows may ask about its firewall** the first time. The server also offers the game
  to other devices on your wifi, which is how a phone can try it. Playing on this PC
  works whether you allow it or cancel.
- **The UPDATE button does nothing in a browser.** To get a newer version, download the ZIP
  again, or `git pull` if you cloned it, and run `npm install` again.
- **Do not double-click `dist/index.html`** after a build. Browsers refuse to run the
  game's scripts from a plain file, so it opens to a blank page. To play the finished
  build instead of the development one, run `npm run build` and then
  `npm run preview`, and open **<http://localhost:4173/?dev=0>**.

## Commands

| | |
|---|---|
| `npm run dev` | dev server (LAN-accessible so a phone can play it) |
| `npm run build` | production bundle → `dist/` |
| `npm test` | code-integrity and data-shape checks |
| `npm run status` | element slice board — what is built, per boss |
| `npm run sync` | regenerate `design/boss-data.json` from TRACKER.md |
| `npm run sim` | OPT-IN: headless difficulty harness. `-- --list` needs no browser |
| `npm run smoke` | OPT-IN: boots the real bundle in Chromium and plays it (~3 min) |
| `npm run sprites` | regenerate the pixel-exact drawing templates |
| `npm run sprites:build` | `design/sprites/*.sprite` → the PNGs MANIFEST loads |
| `npm run sprites:ship` | verify every `[draft]` frame reaches the game, mark it `[ready]` |
| `npm run tracker-test` | OPT-IN: drives the tracker app against a faked GitHub (~15s) |
| `npm run apk` | local APK build (CI does this automatically) |

`sim`, `smoke` and `tracker-test` need Chromium and are deliberately not dependencies — Playwright's
postinstall would pull ~150MB onto every APK build for jobs CI does not run:

```bash
npx playwright@latest install chromium
npm i --no-save playwright
```

## Controls

Deliberately **not duplicated here.** They move with every playtest, and this table
had drifted into describing an air dash the game does not have, a drag-down slide
that is now a double-tap, and a RE-QUIP button that pauses the game — which is the
exact thing it was rebuilt to be incapable of.

The bindings live in one place: **[CLAUDE.md → Controls — as bound](CLAUDE.md)**.

The slide is **meta progression** — locked at Slide Mastery rank 0, unlocked by
buying rank 1 in the Hub.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — architecture, terminology, the element-slice plan. Read first.
- **[design/TRACKER.md](design/TRACKER.md)** — the design source of truth: slices, bugs
  and brainstorming, in plain readable Markdown.
- **[design/GLOSSARY.md](design/GLOSSARY.md)** — the shared vocabulary. A step is 1/60s and
  a frame is the same thing; if a word here means something else in a field you are
  writing, the word is wrong.

**Two apps, one Pages site, one bookmark.** Both are served from `docs/` on `main`, share
one GitHub token and one save engine, and link to each other in their headers. What you
type is copied into the browser straight away and written to `main` a few seconds later —
there is no Publish button and no branch to pick, because forgetting the one and mis-tapping
the other were how work kept going missing:

- **[Tracker web app](https://echojex.github.io/mega-dash/)** — a friendlier lens over
  TRACKER.md. Saves itself into the repo; no export, no download.
- **[Sprite editor](https://echojex.github.io/mega-dash/sprite-editor.html)** — draws
  `design/sprites/*.sprite`, the source `npm run sprites:build` turns into the PNGs the
  game loads. Deliberately not in the game's own dev menu: the APK is entirely offline
  and an in-game editor would put a GitHub token inside a sideloaded app.

Both need a fine-grained GitHub token (Contents: read/write on this repo only), stored in
your browser and never committed. Both stay READ-ONLY without one rather than going blank.
