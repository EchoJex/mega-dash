/**
 * FEEL — every constant that decides how the game *plays*.
 *
 * IMPORTANT CONTEXT: the core MOTION constants (walk, jump, gravity, terminal
 * velocity, slide) are now the classic NES Mega Man values, converted from that
 * game's 8.8 fixed-point. They are a deliberate known-good reference point, not
 * a finished tune.
 *
 * Everything else here still came across from the HTML prototype, where the
 * numbers were off-the-cuff values chosen to get iteration moving. Those are NOT
 * playtested and should not be treated as precious. This file exists so they can
 * be tuned as a group without hunting through gameplay code.
 *
 * A live in-game tuning overlay is planned but deliberately deferred until late
 * in development — FEEL_GROUPS at the bottom of this file exists to drive it
 * when that time comes.
 *
 * All units are per-1/60s-step, in VIRTUAL pixels (see config/display.js).
 * Physics never scale with screen size.
 */

export const FEEL = {
  // ── Horizontal movement ──────────────────────────────────────────────
  // Classic Mega Man has NO acceleration curve: you are at full speed on frame
  // 1 and stopped on release. That instant response is a large part of why the
  // platforming reads as precise. Keep accel/friction at 1.0 unless you
  // deliberately want a more modern, weightier feel.
  // CLASSIC VALUES: the motion constants below are the NES Mega Man ones,
  // converted from the game's 8.8 fixed-point into px per 1/60s frame. They
  // replace the prototype's off-the-cuff numbers as a known-good starting point
  // — a real reference feel to tune away from rather than toward.
  moveSpeed: 1.375,        // 0x0160 — walk speed
  slideSpeedMult: 1.68,    // -> 2.31 px/frame, the classic slide speed
  accel: 1.0,     // 1.0 = instant to full speed
  friction: 1.0,  // 1.0 = instant stop

  // ── Gravity & jumping ────────────────────────────────────────────────
  // Classic values give a noticeably FLOATIER arc than the prototype had: about
  // the same peak height, reached over ~39 frames of airtime instead of ~29.
  // That long hang is a big part of why the original reads as Mega Man, and why
  // its jumps feel controllable rather than twitchy.
  gravity: 0.25,           // 0x0040
  maxFallSpeed: 7.0,       // 0x0700 — terminal velocity
  jumpVelocity: -4.875,    // 0x04E5

  // VARIABLE JUMP HEIGHT — a genre signature. Releasing the jump button early
  // cuts upward velocity, giving a short hop; holding gives full height. This
  // is what makes precise platforming possible. Do not remove it.
  // Classic Mega Man KILLS upward velocity outright on release rather than
  // scaling it, which is what makes its short hop so crisp. Hence 0, not 0.45.
  jumpCutMult: 0,         // vy *= this when jump released while still rising

  // NOT classic: the NES game has neither of these. They are kept because they
  // only ever rescue an input the player already meant, and removing them would
  // be reproducing a limitation rather than a feel. Zero them if you disagree.
  jumpBufferFrames: 6,    // press registered this early before landing
  coyoteFrames: 5,        // jump still allowed this soon after leaving a ledge

  // ── Air dash (double jump) ───────────────────────────────────────────
  // Mega Man X-style: an upward impulse followed by a brief near-weightless
  // hang before gravity resumes.
  airDashVelocity: -4.8,
  airDashHangFrames: 13,
  airDashGravityMult: 0.16,
  maxAirActions: 1,       // air dashes available per jump

  // ── Slide ────────────────────────────────────────────────────────────
  // The slide is META-GATED: at Slide Mastery rank 0 the player cannot slide at
  // all. These are the rank-1 baseline; ranks 2 and 3 scale them (see
  // data/upgrades.js, which owns the ladder itself).
  // 26 frames is the classic slide length — a sharp dash, not the 3-second
  // hold the prototype inherited from its endless-runner era.
  slideDurationFrames: 26,
  slideHeightMult: 0.47,    // collision box shrinks, letting you pass low gaps

  // ── Combat ───────────────────────────────────────────────────────────
  // Pits and spikes deal the SAME massive damage rather than an instant kill.
  // A mistake should be brutal and recoverable, not a run ended by one pixel.
  // Falling in a pit also throws you back onto solid ground — the damage is the
  // punishment, the fall is not. Placeholder value.
  hazardDamage: 6,
  // Hazard contact beams you out: straight up past the top of the screen, then
  // back down at the leftmost safe spot. Whole-screen travel at this speed is
  // roughly a third of a second each way — long enough to read as a teleport,
  // short enough not to feel like a cutscene.
  beamSpeed: 8,
  invulnFrames: 90,
  flinchFrames: 16,
  knockbackSpeed: 2.4,
  knockbackDecay: 0.86,
  chargeFullMs: 550,
  chargedDamageMult: 2.0,
  chargedSizeMult: 1.5,

  // ── Elemental attributes ─────────────────────────────────────────────
  // Terrain form / character form pairs. See systems/attributes.js. Flinch and
  // knockback are NOT here — they are basic hitbox interaction on every hit.
  // Every number below is a placeholder taken from the tracker's adjectives
  // ("moderate damage", "very mild damage very rapidly").
  hotDamage: 3,             // contact damage from Hot ground, scaled by how much
                            // of the attribute is left, so it cools as it fades
  hotTickFrames: 26,        // minimum frames between two Hot hits on the same target
  hotLingerFrames: 300,     // 5s — the tracker's figure for Blaze Man's arena
  burnFrames: 180,
  burnDps: 1.6,             // mild, rapid, and scaled down by remaining duration
  poisonFrames: 300,
  poisonDps: 0.5,           // much less often than Burn, but it flinches
  wetFrames: 600,           // 10s
  wetFrictionMult: 0.32,    // reduced contact friction — you slide

  // ── Camera ───────────────────────────────────────────────────────────
  // Follows once the player passes this fraction of screen width, and NEVER
  // scrolls back left — walking backwards is allowed but does not rewind the
  // world.
  camDeadzone: 0.5,
  camLerp: 1.0, // 1.0 = hard lock (most authentic); lower = softer follow

  // ── Hitboxes ─────────────────────────────────────────────────────────
  // The collision box is deliberately NARROWER than the 24x24 sprite.
  //
  // Why: the sprite changes silhouette constantly (arm cannon extends, legs
  // tuck, walk cycle swings limbs). If the hitbox followed the art, your
  // vulnerability would change frame to frame — unlearnable, and it feels like
  // cheating. A stable box centred on the body means damage is predictable
  // (precise) and near-misses that clip the helmet visibly miss (fair).
  playerHitbox:      { w: 12, h: 22, offX: 6, offY: 2 },
  playerHitboxSlide: { w: 16, h: 11, offX: 4, offY: 13 },

  // Player shots get a slightly GENEROUS box so hits connect when they look
  // close. Enemy shots get a slightly STINGY one for the same reason, inverted.
  playerBulletPad: 1,
  enemyBulletPad: -1,

  // Ground collision is narrower still, so you can stand with your boots
  // visually overhanging a ledge — the classic landing-on-a-sliver feel.
  groundProbeInset: 4,

  // ── Difficulty ramp (Vampire Survivors pillar) ───────────────────────
  // Keyed to ELAPSED TIME, not distance. The prototype used rightward distance
  // (a holdover from when the screen force-scrolled), which meant a player who
  // stopped moving froze the ramp. Time-based keeps pressure honest.
  //
  // PLACEHOLDER CURVE: one step every 5 minutes, +5% per step across the board.
  // Deliberately gentle and uniform — a flat 5% makes the SHAPE of the ramp easy
  // to read while playing, which is what you want from a number you intend to
  // replace. Do not mistake the uniformity for a balance decision.
  rampSeconds: 300,         // one "difficulty step" per this many seconds
  rampEnemyHp: 0.05,        // +5% minion HP per step
  rampEnemyCount: 0.05,     // +5% spawn density per step
  rampEliteChance: 0.05,    // +5pp elite chance per step
  eliteChanceBase: 0.03,
  eliteChanceMax: 0.16,
  eliteHpMult: 4.5,
  // NOTE: elites are deliberately the SAME SIZE as their base minion — they
  // share the minion sprite grid (see SPRITE_CLASS in config/display.js) and are
  // told apart by a gold rim. There is no eliteScale.

  // ── Minions ──────────────────────────────────────────────────────────
  // Spawned off the right edge, pruned behind. The interval shortens with the
  // difficulty step; the cap exists so a long run cannot degenerate into a wall
  // of bodies the player physically cannot shoot through.
  spawnIntervalSeconds: 2.5,
  maxMinions: 12,
  scoreMinion: 20,
  scoreElite: 90,
  scoreComboStep: 10,       // extra score per combo tier on a minion kill

  // ── Pickups ──────────────────────────────────────────────────────────
  // Two independent rolls per enemy killed, one per drop type. Neither is
  // guaranteed. Bosses always drop EXP regardless of expDropChance — see
  // dropsFor() in systems/pickups.js.
  pickupChance: 0.10,       // E-Tank
  expDropChance: 0.5,       // EXP orb from minions and elites
  pickupHeal: 1,            // energy pips restored by a field E-Tank
  pickupMagnetRange: 18,    // base attract radius, widened by the Item Magnet
  pickupMagnetSpeed: 1.4,
  pickupLifeFrames: 600,

  // ── Run progression ──────────────────────────────────────────────────
  hpMax: 8,
  comboDecayFrames: 180,
  comboMax: 8,

  // ── EXP ──────────────────────────────────────────────────────────────
  // A level is a flat 100 points, always. No escalating curve — the pressure
  // comes from the difficulty ramp, not from levels getting further apart.
  //
  // EXP is NEVER granted directly. An enemy may DROP it on death and the player
  // has to go and collect it, so levelling is something you do rather than
  // something that happens to you while you walk right. Distance grants nothing,
  // and the drop itself is a roll (expDropChance) rather than a certainty.
  expPerLevel: 100,

  // Drop size is weighted so small drops are common and large ones are rare:
  //     t = random^expDropBias ;  amount = min + t * (max - min)
  // A bias above 1 pushes t toward 0, which is what makes the big drops scarce.
  // Minimums scale with the enemy's tier. Every number here is a placeholder.
  expDropBias: 2.5,
  expDrop: {
    minion: { min: 20, max: 50 },
    elite:  { min: 50, max: 120 },
    boss:   { min: 150, max: 400 },
  },
  // A boss splits its drop across several orbs — one orb worth three levels is
  // anticlimactic, and easy to lose down a pit.
  expOrbsBoss: 5,

  // ── Level-up cards ───────────────────────────────────────────────────
  // Every level-up pauses and offers: this many weapon level-ups, plus an
  // always-present E-Tank card and Chips card.
  cardWeaponChoices: 2,
  cardChips: 50,

  // ── Boss encounters ──────────────────────────────────────────────────
  doorIntervalSeconds: 60,
  bossLayerHpMult: 0.35, // +35% HP per layer above 1

  // ── Re-quip wheel ────────────────────────────────────────────────────
  // Swiping from the RE-QUIP button drops into slow motion rather than a hard
  // pause, so switching weapons mid-fight costs real seconds and stays a
  // decision instead of a free menu. Tapping the button still pauses outright —
  // the two routes are meant to trade speed against safety.
  //
  // The ramp in is deliberately faster than the ramp out: the drop should feel
  // like a snap, the recovery like being shoved back into the fight.
  requipSlowScale: 0.18,   // time multiplier held while a swipe is in progress
  requipSlowInFrames: 4,
  requipSlowOutFrames: 16,

  // ── Weapon balance ───────────────────────────────────────────────────
  // INVARIANT: every weapon deals the same damage-per-second at level 1, so a
  // slow-heavy weapon and a fast-light one trade blows evenly and weapon choice
  // is about *utility*, not raw power. Derived by weaponDamage() in
  // data/weapons.js; the unit test asserting it is skipped until late tuning.
  // If you add projectiles or pierce to a weapon, rebalance its cooldown.
  dpsTarget: 7.5,
  weaponMaxLevel: 10,
  weaponDamagePerLevel: 0.12, // placeholder until real Lv1/3/6/10 ladders land
};

/** Frames -> seconds, for debug display. */
export const toSeconds = (frames) => (frames / 60).toFixed(2) + 's';

/**
 * Groupings for the debug overlay, so related values tune together.
 */
export const FEEL_GROUPS = {
  Movement: ['moveSpeed', 'slideSpeedMult', 'accel', 'friction'],
  Jump: ['gravity', 'maxFallSpeed', 'jumpVelocity', 'jumpCutMult', 'jumpBufferFrames', 'coyoteFrames'],
  AirDash: ['airDashVelocity', 'airDashHangFrames', 'airDashGravityMult', 'maxAirActions'],
  Slide: ['slideDurationFrames', 'slideHeightMult'],
  Combat: ['invulnFrames', 'flinchFrames', 'knockbackSpeed', 'chargeFullMs'],
  Camera: ['camDeadzone', 'camLerp'],
  Difficulty: ['rampSeconds', 'rampEnemyHp', 'rampEnemyCount', 'rampEliteChance'],
  Minions: ['spawnIntervalSeconds', 'maxMinions', 'eliteChanceBase', 'eliteHpMult'],
  // `pickupExp` used to be listed here and has never existed in FEEL — a dead
  // key the overlay would have silently rendered as undefined.
  Pickups: ['pickupChance', 'expDropChance', 'pickupHeal', 'pickupMagnetRange', 'pickupMagnetSpeed'],
  Hazards: ['hazardDamage', 'beamSpeed'],
  Exp: ['expPerLevel', 'expDropBias', 'expOrbsBoss'],
  Run: ['hpMax', 'comboDecayFrames', 'comboMax'],
  Bosses: ['doorIntervalSeconds', 'bossLayerHpMult'],
  Requip: ['requipSlowScale', 'requipSlowInFrames', 'requipSlowOutFrames'],
};
