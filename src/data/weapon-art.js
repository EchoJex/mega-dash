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
 * CLIP NAMES NEVER END IN A DIGIT. The sprite format reads a trailing number
 * as a frame index (`jab2` would become action `jab`, frame 3), so the jabs are
 * `jabTwo` and `jabThree`.
 *
 * ADDING A WEAPON'S ART is one entry here, a placeholder rig in `tools/art/`,
 * and `npm run art:placeholders -- <weapon>` — see the `weapon-art` skill.
 */

/** Every crack Simon's Whip plays: three lengths, tilted up from Lv3, and low during a slide. */
export const WHIP_CLIPS = [
  'crack', 'crackLong', 'crackLonger', 'crackUpLong', 'crackUpLonger',
  'slidingCrack', 'slidingCrackLong', 'slidingCrackLonger',
];

export const WEAPON_ART = {
  quake_hammer: {
    sheets: {
      // The hammer in his hand. Held by its grip; drawn facing right and
      // mirrored for left.
      held: {
        grid: { w: 56, h: 56 }, layer: 'held', heldBy: 'his hand, on the grip',
        clips: {
          jabTwo: 'hit', jabThree: 'hit',
          charge: 'loop', chargeFull: 'loop',
          swing: 'hit', dive: 'loop',
          // In his hand while it is live and not mid-move.
          rest: 'still',
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

  /**
   * SIMON'S WHIP, timed after Super Castlevania IV's whip by the owner's call
   * (19 Oct 2026, option B of three): whip hanging behind, swung overhead,
   * then cracked out. Every crack is three frames; the overhead swing hurts
   * lightly, the crack is the main hit and its hit area is the tip.
   *
   * One clip per length the ladder reaches (`crack`, `crackLong`,
   * `crackLonger`), tilted up from Lv3 (`crackUp…`), and cracked low during
   * a slide (`slidingCrack…`, his hand nearer the floor).
   */
  simons_whip: {
    sheets: {
      // The whip itself, held by the handle in his hand, in front of him.
      held: {
        grid: { w: 136, h: 76 }, layer: 'held', heldBy: 'his hand, on the handle',
        // Every crack, and `rest`: in his hand while it is live and not cracking.
        clips: { ...Object.fromEntries(WHIP_CLIPS.map((c) => [c, 'lash'])), rest: 'still' },
      },
      // HIS BODY while he cracks it: drawn in place of his own picture, on the
      // same paper, pivot and clock as the whip so hand and handle line up.
      // Same clips, same frame counts, same holds; it carries no hits.
      body: {
        grid: { w: 136, h: 76 }, layer: 'player', heldBy: 'his hand — the same point as the whip\'s pivot',
        clips: Object.fromEntries(WHIP_CLIPS.map((c) => [c, 'once'])),
      },
    },
  },

  /**
   * GRANITE FORM. While it holds, the statue or the boulder is drawn IN PLACE
   * of him (like the whip's body sheet), held by his feet. The statue is one
   * of three shapes, picked at random each time (owner, 22 Oct 2026).
   */
  granite_form: {
    sheets: {
      statue: {
        grid: { w: 40, h: 40 }, layer: 'player', heldBy: 'his feet — the floor under the middle of him',
        clips: { chest: 'still', megaman: 'still', monolith: 'still' },
      },
      // Lv3's boulder, rolling. Its picture turns while it rolls.
      boulder: {
        grid: { w: 40, h: 40 }, layer: 'player', heldBy: 'the floor under the middle of it',
        clips: { roll: 'loop' },
      },
      // Lv10's walking form: the cut-stone boulder on three stubby legs
      // (the owner's pick, 26 Oct 2026), standing, and walking at half his speed.
      rocky: {
        grid: { w: 40, h: 40 }, layer: 'player', heldBy: 'his feet — the floor under the middle of him',
        clips: { stand: 'still', walk: 'loop' },
      },
      // A small stone a hit knocks loose, waiting to be shot at a foe.
      stone: {
        grid: { w: 10, h: 10 }, layer: 'effects', heldBy: 'the floor under its middle',
        clips: { loose: 'still' },
      },
    },
  },

  /**
   * DRAKE BREATH, the dragon head cannon (owner, 23 Oct 2026). Indigo, violet
   * and teal wherever it might otherwise look like fire; Lucario's soul-fire
   * colours and his final-smash beam are the owner's references for the look.
   *
   * Nothing here hits by frame: the breath, the wave, the blast and the beam
   * hurt by their own shapes, which the ladder sets (the wave runs from just
   * below his feet to two head-heights above him, and the beam matches it).
   * Where a thing lasts a time the ladder sets — the wind-up, a puff's life,
   * the beam's fade — its frames are spread evenly over that time.
   */
  drake_breath: {
    sheets: {
      // The cannon in his hand, held at its back end; the mouth is the far end.
      held: {
        grid: { w: 24, h: 16 }, layer: 'held', heldBy: 'his hand, at the back of the cannon',
        clips: {
          rest: 'still',
          rear: 'once',          // the wind-up: rears back and up
          breathe: 'loop',       // Lv1, jaw open, breathing
          charge: 'loop',        // Lv6, held: the blast is ready (violet glow)
          chargeFull: 'loop',    // Lv10, held: the beam is ready (white glow)
        },
      },
      // HIS BODY while the cannon is busy: a wide, slightly crouched stance
      // (Claude Design's proposal, the owner's yes, 25 Oct 2026). Drawn in
      // place of him on the cannon's clock, so the clips are the cannon's
      // minus `rest`; it carries no hits.
      body: {
        grid: { w: 24, h: 24 }, layer: 'player', heldBy: 'his feet — the floor under the middle of him',
        clips: { rear: 'once', breathe: 'loop', charge: 'loop', chargeFull: 'loop' },
      },
      // One Lv1 breath puff, teal at the mouth, violet in flight, indigo as it dies.
      puff: {
        grid: { w: 16, h: 16 }, layer: 'effects', heldBy: 'its middle',
        clips: { burn: 'once' },
      },
      // The Lv3 wave: a crescent wall from just below his feet to two
      // head-heights above him, travelling forward.
      wave: {
        grid: { w: 16, h: 48 }, layer: 'effects', heldBy: 'its foot, just below the floor',
        clips: { travel: 'loop' },
      },
      // The Lv6 blast, flying on past where the wave stops.
      blast: {
        grid: { w: 16, h: 16 }, layer: 'effects', heldBy: 'its middle',
        clips: { fly: 'loop' },
      },
      // The Lv10 beam, drawn as tiles 32 wide from the mouth outward, the
      // wave's height: the hairline telegraph, the flared first tile, the body
      // tiles, and the thinning fade at its end.
      beam: {
        grid: { w: 32, h: 48 }, layer: 'effects', heldBy: 'the tile\'s bottom corner nearest the mouth',
        clips: { tele: 'loop', start: 'loop', body: 'loop', fade: 'once' },
      },
      // One streak of an enemy shot the beam erased, blowing away down it.
      streak: {
        grid: { w: 16, h: 4 }, layer: 'effects', heldBy: 'the end nearest the mouth',
        clips: { blow: 'once' },
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
