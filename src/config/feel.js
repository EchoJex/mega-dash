/**
 * FEEL — every constant that decides how the game *plays*.
 *
 * IMPORTANT CONTEXT: these numbers came across from the HTML prototype, where
 * they were off-the-cuff values chosen to get iteration moving. They are NOT
 * playtested and should not be treated as precious. This file exists so they
 * can be tuned as a group, live, without hunting through gameplay code.
 *
 * Every value here is exposed in the in-game debug overlay (` key / 3-finger
 * tap) so it can be dialled in by feel while playing rather than guessed at.
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
  moveSpeed: 1.35,
  slideSpeedMult: 1.3,
  accel: 1.0,     // 1.0 = instant to full speed
  friction: 1.0,  // 1.0 = instant stop

  // ── Gravity & jumping ────────────────────────────────────────────────
  gravity: 0.42,
  maxFallSpeed: 6.5,
  jumpVelocity: -6.2,

  // VARIABLE JUMP HEIGHT — a genre signature. Releasing the jump button early
  // cuts upward velocity, giving a short hop; holding gives full height. This
  // is what makes precise platforming possible. Do not remove it.
  jumpCutMult: 0.45,      // vy *= this when jump released while still rising
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
  slideDurationFrames: 180, // 3s base; extended by the Slide Mastery upgrade
  slideHeightMult: 0.47,    // collision box shrinks, letting you pass low gaps

  // ── Combat ───────────────────────────────────────────────────────────
  invulnFrames: 90,
  flinchFrames: 16,
  knockbackSpeed: 2.4,
  knockbackDecay: 0.86,
  chargeFullMs: 550,
  chargedDamageMult: 2.0,
  chargedSizeMult: 1.5,

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
  rampSeconds: 60,          // one "difficulty step" per this many seconds
  rampEnemyHp: 0.18,        // +18% enemy HP per step
  rampEnemyCount: 0.12,     // +12% spawn density per step
  rampEliteChance: 0.02,    // +2% elite chance per step
  eliteChanceBase: 0.03,
  eliteChanceMax: 0.16,
  eliteHpMult: 4.5,
  eliteScale: 1.9,

  // ── Run progression ──────────────────────────────────────────────────
  hpMax: 8,
  expBase: 90,
  expGrowth: 38,
  expPerDistance: 0.6,
  expMinion: 15,
  expElite: 60,
  expBoss: 220,
  comboDecayFrames: 180,
  comboMax: 8,

  // ── Boss encounters ──────────────────────────────────────────────────
  doorIntervalSeconds: 60,
  bossLayerHpMult: 0.35, // +35% HP per layer above 1

  // ── Weapon balance ───────────────────────────────────────────────────
  // INVARIANT: every weapon deals the same damage-per-second at level 1, so a
  // slow-heavy weapon and a fast-light one trade blows evenly and weapon choice
  // is about *utility*, not raw power. Enforced by weaponDamage() in
  // data/weapons.js and asserted by a unit test.
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
};
