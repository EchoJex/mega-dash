# Mega Dash

A mobile-first, landscape-only 2D side-scrolling platformer.
**Mega Man 2 aesthetics · Risk of Rain meta progression · Vampire Survivors levelling.**

17 elemental robot masters, each dropping a special weapon. Procedurally generated
platforming between boss doors. Bosses you have beaten return harder, permanently.

Built with Phaser 3 + Vite. One codebase ships a browser build and an Android APK.

## Quick start

```bash
npm install
npm run dev        # then open the printed Network URL on your phone
```

New here? Read **[MIGRATION.md](MIGRATION.md)** — step-by-step setup, no code required.

## Commands

| | |
|---|---|
| `npm run dev` | dev server (LAN-accessible so a phone can play it) |
| `npm run build` | production bundle → `dist/` |
| `npm test` | balance + data integrity checks |
| `npm run apk` | local APK build (CI does this automatically) |

## Controls

| Zone | |
|---|---|
| bottom-left | 4 columns — move left / right, diagonals reserved; drag down = slide |
| bottom-right | `[]` jump (again mid-air = air dash) · `()` shoot, hold = charge, swipe = cycle |
| bottom-centre | WEAPON — pause and open weapon select |
| top-right | pause |

Keyboard: arrows/AD move · Space jump · hold Z charge · X slide

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — architecture, terminology, phase plan. Read first.
- **[design/boss-design-tracker.html](design/boss-design-tracker.html)** — the design
  bible: 17 bosses × 24 fields. Open in any browser.
