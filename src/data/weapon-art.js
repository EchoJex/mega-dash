/**
 * WEAPON ART — which weapons are drawn from sprite sheets, and what the code
 * will ask each sheet for.
 *
 * This is the CODE'S HALF of a contract with whoever draws the weapon. The
 * other half is the `.sprite` files themselves (`design/sprites/weapon-*`),
 * which hold the pictures AND their timing: how long each frame shows, which
 * frame a move hits on, and where its hit area is. The game reads that timing
 * out of the files (`npm run sprites:build` writes it to
 * `src/data/frame-data.json`), so a drawing and the moment it hits cannot
 * drift apart — moving one moves the other.
 *
 * What stays HERE is only what the code depends on by name:
 *
 *   grid    the sheet's size in pixels. Fixed, like every sprite grid, so the
 *           editor and the build agree on the paper before anyone draws.
 *   heldBy  what the sheet's pivot is, in words, for the brief Design reads —
 *           the pixel the game holds the drawing by. The pixel itself is the
 *           file's own `pivot` line.
 *   layer   which band it is drawn in: `held` sits in front of the player
 *           (it is in his hand), `effects` behind him (the player is never
 *           hidden — CLAUDE.md, draw order).
 *   clips   every animation the code plays, and what KIND of clip each is.
 *           A clip the file lacks, or one it has that nothing plays, stops the
 *           build: an unplayed clip is a misspelt name nobody would notice.
 *
 * The kinds are listed in `CLIP_KINDS` (docs/sprite-fmt.js), beside the
 * checker that enforces them.
 *
 * CLIP NAMES NEVER END IN A DIGIT. The sprite editor reads a trailing number
 * as a frame index (`jab1` would become action `jab`, frame 2), so the jabs are
 * `jabOne`, `jabTwo`, `jabThree`.
 *
 * ADDING A WEAPON'S ART is one entry here, a placeholder rig in `tools/art/`,
 * and `npm run art:placeholders -- <weapon>` — see the `weapon-art` skill.
 */

export const WEAPON_ART = {
  quake_hammer: {
    sheets: {
      // The hammer in his hand. Held by its grip; drawn facing right and
      // mirrored for left.
      held: {
        grid: { w: 56, h: 56 }, layer: 'held', heldBy: 'his hand, on the grip',
        clips: {
          jabOne: 'hit', jabTwo: 'hit', jabThree: 'hit',
          charge: 'loop', chargeFull: 'loop',
          swing: 'hit', dive: 'loop',
        },
      },
      // The dust cloud the swing throws up from Lv3, three sizes. Each one's
      // length is how long the cloud lasts; its hit frame is where it hurts.
      dust: {
        grid: { w: 64, h: 40 }, layer: 'effects', heldBy: 'the floor under the middle of the cloud',
        clips: { small: 'hit', medium: 'hit', large: 'hit' },
      },
      // Small puffs: the full-charge tell round the hammer head, and the one a
      // standing spike leaves when it stops a shot.
      puff: {
        grid: { w: 12, h: 12 }, layer: 'effects', heldBy: 'its middle',
        clips: { tell: 'once', block: 'once' },
      },
      // Lv10's sand spikes, one clip per angle, in the order of the ladder's
      // `spikes.angles` (shallowest first). Each hurts while it grows, then
      // stands and blocks, then falls apart into sand.
      spike: {
        grid: { w: 60, h: 50 }, layer: 'effects', heldBy: 'its foot, on the floor',
        clips: { flat: 'grow', low: 'grow', high: 'grow', steep: 'grow' },
      },
      // One grain of that sand, two shades.
      sand: {
        grid: { w: 4, h: 4 }, layer: 'effects', heldBy: 'the grain',
        clips: { light: 'still', dark: 'still' },
      },
    },
  },
};

/** `weapon-quake_hammer-held` — the `.sprite` file's name, and the editor's id. */
export const sheetId = (weapon, sheet) => `weapon-${weapon}-${sheet}`;

/** `weapon:quake_hammer:held` — the MANIFEST key, and the frame data's. */
export const sheetKey = (weapon, sheet) => `weapon:${weapon}:${sheet}`;

/** Every registered sheet, flat, with its id and key worked out. */
export function weaponSheets() {
  const out = [];
  for (const [weapon, def] of Object.entries(WEAPON_ART)) {
    for (const [sheet, s] of Object.entries(def.sheets)) {
      out.push({ weapon, sheet, id: sheetId(weapon, sheet), key: sheetKey(weapon, sheet), ...s });
    }
  }
  return out;
}
