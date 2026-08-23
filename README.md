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

1. Open the repo's **Actions** tab, pick the newest run, download `mega-dash-apk`.
2. Install it on the phone (allow "install from unknown sources" once).
3. From then on, **never download an APK by hand again**:
   - **tap UPDATE** on the title screen → newest build of `main`
   - **long-press UPDATE** → pick a channel: `main`, or any branch being worked on

Every push to every branch produces an installable build, so testing a work-in-progress
branch is: push it, open the game, long-press UPDATE, pick the branch.

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
| `npm run smoke` | OPT-IN: boots the real bundle in Chromium and plays it (~3 min) |
| `npm run apk` | local APK build (CI does this automatically) |

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
