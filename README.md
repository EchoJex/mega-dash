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
to open keeps the experience consistent. The browser only ever runs the dev server.

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

**Going back to `main` from a branch build needs an uninstall.** Build numbers come from
one counter shared across every branch, so a branch build is numbered *above* the last
`main` build and Android will not install the lower number over it. The game says so
rather than claiming you are up to date.

### Optional: run it on a desktop browser

Only needed for quick checks — the phone loop above does not require it.

```bash
npm install
npm run dev
```

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
| `npm run apk` | local APK build (CI does this automatically) |

`sim` and `smoke` need Chromium and are deliberately not dependencies — Playwright's
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
- **[Tracker web app](https://echojex.github.io/mega-dash/)** — a friendlier lens over that
  same file. Autosaves straight into the repo; no export, no download. Needs a fine-grained
  GitHub token (Contents: read/write on this repo only), stored in your browser and never
  committed. Read-only without one.
