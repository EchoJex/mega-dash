# Mega Dash

A mobile-first, landscape-only 2D side-scrolling platformer.
**Mega Man 2 aesthetics · Vampire Survivors levelling and meta progression.**

17 elemental robot masters, each  unlocking a special weapon. Procedurally generated
platforming, hazards, and minion spawning between boss doors whose difficulty scales with time to prevent camping. Bosses you have beaten return harder, permanently. 

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
| bottom-right | `[]` jump (again mid-air = air dash) · `()` shoot, hold = charge |
| bottom-centre | RE-QUIP — **tap** to pause and open the weapon wheel · **swipe** for a slow-motion directional switch |
| top-right | pause |

Keyboard: arrows/AD move · Space jump (hold for height) · hold Z charge · X slide

The slide is **meta progression** — it is locked at Slide Mastery rank 0 and unlocked by
buying rank 1 in the Hub.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — architecture, terminology, phase plan. Read first.
- **[design/boss-design-tracker.html](design/boss-design-tracker.html)** — the design
  bible: 17 bosses × 24 fields. Open in any browser.
