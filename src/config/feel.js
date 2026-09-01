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
  coyoteFrames: 2,        // jump still allowed this soon after leaving a ledge

  // ── Double jump ──────────────────────────────────────────────────────
  // HANG, THEN LAUNCH. Pressing jump in mid-air first freezes vertical motion
  // for a few frames — horizontal velocity is untouched, so you keep drifting —
  // and only then fires a second jump using the SAME gravity and the same
  // release-to-cut rule as the first one, at 80% of its peak height.
  //
  // This replaced a Mega Man X-style air dash (an impulse into a long
  // low-gravity float). The primary jump had been retuned to the classic NES
  // arc and the air dash had not, so the two read as two different games: the
  // first jump crisp and weighty, the second mushy. Borrowing the first jump's
  // own physics is the whole point of the fix — do not reintroduce a separate
  // gravity multiplier here.
  //
  // The 80% is a HEIGHT figure, not a velocity one. Peak height goes as v^2/2g,
  // so the impulse is jumpVelocity * sqrt(0.8) — scaling the velocity itself by
  // 0.8 would land at 64% height, noticeably shorter than asked for.
  doubleJumpPauseFrames: 6,    // the hang before the second jump fires
  // Raised from 0.80 after the first playtest: the second jump read as too
  // short next to the first. 0.88 is about 42px of peak against the primary
  // jump's 47.5 — still clearly the smaller of the two, which is the point.
  doubleJumpHeightMult: 0.88,  // fraction of the PRIMARY jump's peak height
  maxAirActions: 1,           // double jumps available per jump

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
  beamSpeed: 4,
  invulnFrames: 90,
  /**
   * Invulnerability granted by a hazard beam touchdown — three seconds, twice
   * the ordinary window, and it does not start counting until the player acts.
   *
   * A hazard costs a huge chunk of HP and then puts you somewhere you did not
   * choose, usually well behind where you were. The ordinary 90 frames were
   * being spent on the fall and on the moment afterward where you are still
   * finding yourself, so a pit regularly cost two hits instead of one.
   */
  respawnInvulnFrames: 180,
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
  // Hot: "moderate damage/flinch/knockback on touch" from a boss or arena,
  // "mild damage and moderate flinch/knockback" from the player's own weapon.
  // Two numbers because the tracker asks for two — the same attribute is
  // deliberately gentler when you are the one setting the ground on fire.
  hotDamage: 3,             // contact damage from Hot ground, scaled by how much
                            // of the attribute is left, so it cools as it fades
  hotDamageWeapon: 1,       // "mild" — Hot the player laid down, hitting enemies
  hotTickFrames: 26,        // minimum frames between two Hot hits on the same target
  hotLingerFrames: 300,     // 5s — the tracker's default "unless reapplied"
  burnFrames: 180,
  burnDps: 1.6,             // mild, rapid, and scaled down by remaining duration
  /**
   * POISON IS A TICK, NOT A TRICKLE. "Deal small damage in discrete 3 second
   * intervals for 9 seconds" — so it is three separate hits, not a per-frame
   * rate banked until it crosses a point the way Burn is. Nine seconds is a
   * long time to be carrying something, which is why each tick is small and why
   * the shared field says it lands with no flinch and no knockback.
   */
  poisonFrames: 540,        // 9s
  poisonTickFrames: 180,    // one tick every 3s — three over the duration
  poisonTickDamage: 1,      // "small damage", and a whole point so it is felt
  wetFrames: 600,           // 10s
  wetFrictionMult: 0.32,    // reduced contact friction — you slide

  // Stun is a STACKING SLOW, not a hold. Each stack multiplies whatever speed
  // is LEFT, and any fresh application resets the whole 5 seconds. Asymmetric
  // on purpose: the tracker gives the player 15% and enemies 30%, so the same
  // attribute is twice as punishing coming off your weapon as going onto you.
  stunFrames: 300,          // 5s, reset by every re-application
  stunPlayerStep: 0.85,     // 15% off the remaining speed, per stack
  stunEnemyStep: 0.70,      // 30% off the remaining speed, per stack

  // Wading: a jump launched from knee-deep water leaves at half strength.
  // Only the launch — a midair jump out of it is unaffected.
  // "Jumps while in contact with this knee deep water have 80% the jump
  // strength; midair jumps are only affected by the rain forces." It was 0.5
  // against an earlier field that said "half the jump strength" — the number
  // is the owner's and it moved. It scales the IMPULSE, so 0.8 of the launch
  // speed is 0.64 of the height.
  wadeJumpMult: 0.8,

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

  // ── Cliff Edge Mastery ───────────────────────────────────────────────
  // How far BELOW a ledge the player can be and still claw back onto it,
  // indexed by the meta upgrade's rank. The game used to give the rank-3
  // amount away for free, which quietly made every ledge in the game two
  // dozen pixels taller than it looked.
  //
  // Rank 0 is not zero: one pixel of slack absorbs the sub-pixel case where
  // the box lands exactly on the plane. Anything more and the edge stops
  // being where it appears to be.
  cliffGrabDepth: [1, 8, 16, 24],   // rank 0..3, in px (24 = one player height)
  // Ranks 1-3 hang on the wall before hauling up, so a save READS as a save
  // rather than as the floor twitching. A quarter second, per the tracker.
  cliffStickFrames: 15,

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

  /**
   * How long after a jump a second tap still cancels it into a slide.
   *
   * TIGHT ON PURPOSE. The jump fires on the first tap, so every frame of this
   * window is a frame in which an already-visible jump can be un-done. Too
   * generous and ordinary double-jump inputs start eating themselves; too mean
   * and the slide is unreachable on a touchscreen. 8 frames is about 130ms,
   * which is a deliberate double-tap and not a fumbled one.
   */
  slideTapFrames: 8,
  weaponDamagePerLevel: 0.12, // placeholder until real Lv1/3/6/10 ladders land
};

/**
 * Groupings for the debug overlay, so related values tune together.
 */
export const FEEL_GROUPS = {
  Movement: ['moveSpeed', 'slideSpeedMult', 'accel', 'friction'],
  Jump: ['gravity', 'maxFallSpeed', 'jumpVelocity', 'jumpCutMult', 'jumpBufferFrames', 'coyoteFrames'],
  DoubleJump: ['doubleJumpPauseFrames', 'doubleJumpHeightMult', 'maxAirActions'],
  Slide: ['slideDurationFrames', 'slideHeightMult'],
  Combat: ['invulnFrames', 'flinchFrames', 'knockbackSpeed', 'chargeFullMs'],
  Camera: ['camDeadzone', 'camLerp'],
  Difficulty: ['rampSeconds', 'rampEnemyHp', 'rampEnemyCount', 'rampEliteChance'],
  Minions: ['spawnIntervalSeconds', 'maxMinions', 'eliteChanceBase', 'eliteHpMult'],
  // `pickupExp` used to be listed here and has never existed in FEEL — a dead
  // key the overlay would have silently rendered as undefined.
  Pickups: ['pickupChance', 'expDropChance', 'pickupHeal', 'pickupMagnetRange', 'pickupMagnetSpeed'],
  Hazards: ['hazardDamage', 'beamSpeed', 'respawnInvulnFrames'],
  Exp: ['expPerLevel', 'expDropBias', 'expOrbsBoss'],
  Run: ['hpMax', 'comboDecayFrames', 'comboMax'],
  Bosses: ['doorIntervalSeconds', 'bossLayerHpMult'],
  Requip: ['requipSlowScale', 'requipSlowInFrames', 'requipSlowOutFrames'],
};
