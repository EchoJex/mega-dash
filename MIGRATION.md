# Getting this into GitHub + Claude Code

Follow top to bottom. Nothing here needs you to write code. Copy-paste the commands.

If a step fails, paste the error into Claude Code and it will sort it out — that is
exactly the workflow from here on.

---

## What you need first

- **Node.js 20+** — https://nodejs.org (the "LTS" button)
- **Git** — https://git-scm.com/downloads
- **Claude Code** — already installed and linked to your GitHub

To check the first two are working, open a terminal and run:

```bash
node --version    # want v20 or higher
git --version     # any recent version
```

---

## Step 1 — Put the project somewhere sensible

Unzip `mega-dash.zip`. Move the resulting `mega-dash` folder somewhere you'll find it —
Documents is fine. Avoid Downloads; things get lost there.

---

## Step 2 — Make it a git repo

Open a terminal **inside the `mega-dash` folder**.

> On Windows: open the folder in File Explorer, type `cmd` in the address bar, press Enter.
> On Mac: right-click the folder → Services → New Terminal at Folder.

```bash
git init
git add .
git commit -m "Mega Dash: Phaser port of prototype phases 1-3"
```

---

## Step 3 — Create the GitHub repo

```bash
gh repo create mega-dash --private --source=. --push
```

If that errors with "gh: command not found", install the GitHub CLI
(https://cli.github.com) or do it manually:

1. Go to https://github.com/new
2. Name it `mega-dash`, set **Private**, do **not** tick any "initialize with" boxes
3. Click Create, then run the commands GitHub shows you under
   *"…or push an existing repository"*

**Important:** this is a *second, separate* repo. It does not touch your existing app.

---

## Step 4 — Check it runs

```bash
npm install
npm run dev
```

Open the `http://localhost:5173` link it prints. Rotate to landscape (or narrow the
window so it's wider than tall). You should get the title screen.

**To play it on your actual phone right now:** the dev server also prints a
`Network:` address like `http://192.168.1.42:5173`. Open that on your phone's browser
while on the same wifi. This is the fastest way to test feel — use it constantly.

Stop the server with `Ctrl+C`.

---

## Step 5 — Point Claude Code at it

```bash
claude
```

Run that inside the `mega-dash` folder. It reads `CLAUDE.md` automatically — that file
carries every decision we made: the architecture rules, the terminology, the phase plan,
the balance invariant, what's deliberately left as a stub.

Good first message to it:

> Read CLAUDE.md and design/boss-design-tracker.html, then give me a debug overlay for
> live-tuning the values in config/feel.js while playing. Those numbers are untested
> placeholders and I want to dial them in by feel.

That is the natural next task — see "Tuning pass" in CLAUDE.md.

---

## Step 6 — Turn on automatic APK builds

Already configured, just needs enabling:

1. Push once: `git push`
2. Go to your repo on github.com → **Actions** tab
3. If it asks, click **"I understand my workflows, go ahead and enable them"**

From now on every push builds an APK. To get it:

**Actions → click the latest run → scroll to Artifacts → download `mega-dash-apk`**

That zip contains the `.apk`. Send it to your friends. They'll need to allow
"install from unknown sources" on their phone — Android will prompt them.

### Also turn on the web build (optional, 30 seconds)

Repo → **Settings** → **Pages** → under *Source* pick **GitHub Actions**. Push again and
your game is live at `https://<your-username>.github.io/mega-dash/` — a link anyone can
open in any browser, no install.

---

## Day-to-day loop from here

```bash
claude                    # describe what you want changed
npm run dev               # play it on your phone via the Network URL
git add . && git commit -m "what changed" && git push
```

Every push rebuilds the APK and the web version automatically.

---

## Useful things to know

**Run the tests.** `npm test` checks that all 18 weapons still share identical DPS and
that every boss drops a real weapon. If Claude Code changes a weapon and this fails, the
balance broke. It takes a second — run it often.

**The design tracker is the source of truth.** `design/boss-design-tracker.html` — open
it in a browser like any web page. It's editable and it's what Claude Code reads before
building any boss. Keep filling it in; it's currently ~77% complete and the gaps are
listed in CLAUDE.md.

**Nuking a bad save.** The title screen has a small red `full reset` link. It wipes
localStorage, cookies, caches, everything, then reloads clean. Use it whenever you're
unsure whether something is a bug or leftover save data.

**If Claude Code proposes deleting something:** a lot of code in this project is
intentional scaffolding holding a slot for a later phase. The comments say so. Worth
pushing back if a deletion looks aggressive — that mistake has already been made once.

---

## What's in the box

```
CLAUDE.md                    project context — Claude Code reads this first
MIGRATION.md                 this file
README.md                    short overview
package.json                 dependencies + the npm commands above
index.html                   page shell, landscape lock
vite.config.js               build config
capacitor.config.json        APK config

src/
  main.js                    boots Phaser
  config/
    display.js               fixed virtual resolution + fixed timestep  ← core rules
    feel.js                  EVERY tunable gameplay number, one file    ← tune here
  data/
    bosses.js                17 bosses, optimised palettes
    weapons.js               18 weapons, DPS invariant
    upgrades.js              16 meta upgrades
  systems/
    physics.js               hand-rolled platformer movement
    terrain.js               procedural generation
    assets.js                placeholder ⇄ sprite abstraction          ← art swaps here
    save.js                  persistent state + full reset
  scenes/
    BootScene · TitleScene · GameScene · HubScene · UIScene

design/
  boss-design-tracker.html   17 bosses × 24 fields — the design bible
  boss-primaries.json        the optimised 17-colour palette

reference/
  prototype-phase03.html     the old single-file HTML build, kept for behaviour diffs

tests/dps.test.js            balance + data integrity
.github/workflows/           APK build + web deploy
```
