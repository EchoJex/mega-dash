# MEGA DASH — DEV TRACKER

The single source of truth for design. Edit it in the tracker web app or
directly here — they are the same file.

## How status markers work

Every field carries one marker. **Claude implements `[draft]` fields only.**

| marker | meaning |
|---|---|
| `[draft]` | **The green light.** Owner has finished this field and it is ready to build. |
| `[wip]` | Still being written. Not ready — skip it entirely. Editing any field sets this automatically. |
| `[ready]` | Already built and unchanged since. Nothing to do — skip it entirely. |
| `[todo]` | Empty, nothing written yet. |
| `[na]` | Deliberately not applicable to this boss. |

Editing a field in the web app flips it to `[wip]`. Moving it to `[draft]` is a
deliberate act — that is the assertion that it may be built. Once Claude has
built it and the owner has not touched it since, it settles at `[ready]`, which
means "done, leave it alone" rather than "start work".

This is a deliberate reversal of the earlier scheme, where `[ready]` was the
build signal and `[draft]` meant Claude-generated prose awaiting review. Old
comments in code may still describe it the other way round; this table wins.

## Weapon loadout

A run carries up to **two offensive** and **two defensive** weapons. Every weapon
field below says which class its weapon belongs to; that word is load-bearing,
not flavour.

- **Offensive** weapons share the fire button. The re-quip wheel picks which one
  is aimed. **The sidearm** (the old Mega Buster) is one of these — it occupies
  an offensive slot rather than riding above them for free.
- **Defensive** weapons run on their own — a drone that auto-fires, a shield
  that maintains itself, a jetpack that vents on landing. They are not aimed.

### Loadout Mastery

How many slots exist, and how many run at once, is meta progression bought in
the Hub. The two classes are separate upgrades, each rank 0 to 3.

| rank | offensive | defensive |
|---|---|---|
| 0 | sidearm only, welded into its position | no defensive slots |
| 1 | one special slot — it **or** the sidearm, never both | one slot |
| 2 | both live at once; the second position is still the sidearm | two slots, one live |
| 3 | second position freed — two specials, sidearm tradeable | two slots, both live |

Where a rank caps how many may run, the press-and-hold on a slot becomes a
switch *between* them rather than an on/off.

Inactive but unlocked weapons keep their levels for the rest of the run and
still turn up on level-up cards. **Slots only change between fights** — from a
boss going down until you warp into the next arena, which is where the
weapon-acquire sequence lives. Switching a slotted weapon on or off is not
gated that way; it cannot change what you are carrying.

---

# SLICES

One element built end to end at a time: boss, arena, hazards, attribute,
weapon. See CLAUDE.md for what a slice contains and `npm run status` for
where each one stands.

## Proto Mk0 — Typeless

`palette` #687380 / #2E3338 / #0A0A12 · `scale` 0.8x player height (prototype chassis) · `id` core
`attack` Core Pulse · `weapon` Nullfire Drone

- **palette notes** `[ready]` Light grey / dark grey
- **arena** `[ready]` Plain light grey room with a couple of small ceiling turrets. Background shall be of various size metal gears
- **hazard L1** `[ready]` Turrets visibly track and aim at player to nearest 45°, all firing simultaneous short 3-bullet bursts of slightly slow bullets; 15s cooldown.
- **hazard L2** `[ready]` Same number of turrets; visibly track and aim within nearest 22.5°; slightly reduced cooldown.
- **hazard L3** `[ready]` Same number of turrets; visibly track and aim within nearest 11.25°; further reduced cooldown.
- **attack L1** `[ready]` Moves back and forth on the stage, occasionally stopping, waiting a moment, then fire a 3 bullet spread directly forward toward the player with mild auto-aim, dealing small damage.
- **attack L2** `[ready]` Moves back and forth across the stage, occasionally stopping, waiting a moment, then fire either a 3 bullet spread directly forward toward the player with mild auto-aim or aim directly at the player and shoot a string of 5 bullets that do not auto aim. Boss stops tracking the player during the 5-bullet string, aiming where the player was at the time the first of 5 bullets comes out.
- **attack L3** `[ready]` Moves back and forth across the stage, occasionally stopping, waiting a moment, then fire either a set of 2 3-bullet spread directly forward toward the player with mild auto-aim or aim directly at the player, tracking the players movements while continuously shooting a string of 5 bullets that do not auto aim, either way, dealing small damage.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; a small gray drone hovers just above and in front of the player's shoulder. Very Slowly refills the current clip when no enemies present. When clip is fully depleted indicate this emergency reload by making the drone Dark grey and cease firing until clip colored completes. It continuously auto aims at the nearest enemy and auto fires, only if an enemy is on screen, a neutral bullet with clip cooldown time equal to one and a half times the current levels clip size divided by the current levels shot per second (clip_cooldown=1.5(clip_size/fire_rate)).
- **weapon Lv1** `[ready]` Single shot, mild damage, weapon auto aims but bullet does not auto aim, 1 shot per second, 10 ammo clip.
- **weapon Lv3** `[ready]` Weapon auto aims; Bullet does not auto-aim. 3-bullet burst of bullets shot once per second, like a rifle. 9 bullet clip
- **weapon Lv6** `[ready]` 2 bullet burst; bullet does not auto-aim; bullet splits into 3 fragments after a brief time; fragments have moderate auto-aim and rapid acceleration. From the 2 sets of 3 fragments produced, the first set of 3 shall target the nearest enemy and the second set shall target the next nearest enemy;
- **weapon Lv10** `[ready]` Weapon now fires straight up instead of Auto aiming; each bullet targets a different enemy, traveling in a wide arc with high strong auto aim and rapidly acceleration bullet speed. 5 shots per second;  does not split; 30 bullet clip
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Blaze Man — Fire

`palette` #E11416 / #141414 / #0A0A12 · `scale` 1.75x player height (average build) · `id` blaze
`attack` Inferno Wheel · `weapon` Blaze Wheel

- **palette notes** `[todo]`
- **arena** `[ready]` Silhouette of a faintly glowing active volcano as the background. A few short platforms phase in and out in random places throughout the entire fight as shelter. Never shall all airborne platforms simultaneously have Hot.
- **hazard L1** `[ready]` Brief screen shake → occasional player-width hot flaming rocks slowly fall from top of screen, crumbling on contact with the floor or platforms, leaving Hot there for a few seconds. Moderate damage and applies Burn on player contact. Cycle repeats every 20 seconds or so.
- **hazard L2** `[ready]` Slightly more overt screen shake → slightly more rocks on screen, slightly bigger, falling slightly faster.
- **hazard L3** `[ready]` Same arena hazard as Layer 2.
- **attack L1** `[draft]` Launches a 1 very bouncy fireball toward the player that climb up walls and leave hot trails everywhere it contacts.
- **attack L2** `[draft]` 2 fireballs, much higher bounce heights ; boss has multiple stem angle to choose from
- **attack L3** `[ready]` Same as Layer 2; additionally, the boss will regularly pause their normal attack and jump up to a small platform that moves up and down just for himself a few seconds before the screen shake/Rock fall event. the red pixels of the background ebb rapidly, then the entire floor fills with lava, slowly, up to about one default player height; the lava recedes after 20 seconds, leaving Hot on the ground. Rocks shall fall, but not from right above the platforms while the lava is up.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Offensive; orange/red glowing backpack that Lobs a small bouncing fireball in the direction the player is facing. like a catapult; applies Hot to ground or burn to enemy on contact for a scalable time. High Fireball contact damage, which is separate from burn DPS.
- **weapon Lv1** `[draft]` Very slight rolling distance; up to 2 on screen; 3s Hot duration.
- **weapon Lv3** `[ready]` 5s duration Hot trail on ground; moderate roll distance with rapid deceleration while on the ground. Affected by pits and platforms
- **weapon Lv6** `[ready]` Adds a second fireball launched simultaneously on a slightly taller, much wider arc, contacting the ground shortly after the first, approximately where the first is projected to terminate, then continuing its own equal roll distance. Up to 2 on screen;Affected by pits and platforms
- **weapon Lv10** `[ready]` Combined effective roll distance shall be full screen (half for each fireball); fireballs pierce through all enemies, applying 2s Burn to each on contact. Up to 2 fireballs on screen; fireballs rapidly accelerate while on the ground
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Tempest Man — Water

`palette` #145DBD / #C09060 / #0A0A12 · `scale` 1.75x player height (average build) · `id` torrent
`attack` Aqua Torrent · `weapon` Torrent Cannon

- **palette notes** `[draft]` Blue yellow guy with a large grey hydro jet pack
- **arena** `[ready]` Background theme dark cloudy skies. Bolts of lightning and screen flashes telegraph the heavy rain direction changes
- **hazard L1** `[draft]` Heavy rain pouring straight down top-to-bottom, applies a continuous directional force vector / velocity bias that pushes player in the direction of the rain.
  Steady, powerful water flows out of large steel pipes that are protruding from the walls in the upper corners of the stage. The water cascades down and across the floor toward a grate-covered central drain/pit that all water drains into. Floor water should be ankle-deep with very strong inward-flowing currents that visibly pull toward the center. Jumps while in contact with this ankle deep water have 80% the jump strength; midair jumps are only affected by the rain forces. Occasional very large brown barrels float from the steel pipes which break open and despawn on contact with the spike ball. Player can stand on them or shoot them to destroy them. Player moves with the barrel while standing on it, and takes heavy knockback but no damage if they are standing on the barrel when it breaks
- **hazard L2** `[draft]` Heavy rain cycling through one of 3 directions (top-to-bottom, diagonal down+left, diagonal down+right) applies a continuous directional force vector / velocity bias that pushes Mega Man in the direction of the rain. Lightning bolts in the background telegraph the rain direction is about to change.
  Steady, powerful water flows out of large steel pipes that are protruding from the walls in the upper corners of the stage. The water cascades down and across the floor toward a grate-covered central drain/pit that all water drains into. Floor water should be ankle-deep with strong inward-flowing currents that visibly pull toward the center. Jumps while in contact with this ankle deep water have 80% the jump strength; midair jumps are only affected by the rain forces. Occasional large brown barrels or spike balls float from the steel pipes which break open and despawn on contact with the central drain spike ball. Player can stand on barrels or shoot the barrels to destroy them. Spike balls despawn on contact with the central spike ball, and are otherwise indestructible
- **hazard L3** `[wip]` Rain changes direction with limited tapering down between direction changes, with a random duration of at least 3s. Lightning bolts in the background are now brought enough to washcause the screen to flash . Steady, powerful water flows out of large steel pipes that are protruding from the walls in the upper corners of the stage. The water cascades down and across the floor toward a grate-covered central drain/pit that all water drains into. Floor water should be knee-deep with strong inward-flowing currents that visibly pull toward the center. Jumps while in contact with this knee deep water have half the jump strength; midair jumps are only affected by the rain forces. Semi frequent spike balls float from the steel pipes which despawn on contact with the central spike ball
- **attack L1** `[ready]` Boss flies around the stage just like the attack pattern of Queen B from DKC at full health. Player takes moderate damage from contact with boss. Jetpack pushes the player in the direction of the water's travel and blocks player bullets.
- **attack L2** `[ready]` Boss flies around the stage just like the attack pattern of damaged Queen B from DKC. Player takes moderate damage from contact with boss. Jetpack pushes the player in the direction of the water's travel and blocks player bullets.
- **attack L3** `[ready]` Boss flies around the stage just like the attack pattern of critical health Queen B from DKC. Player takes moderate damage from contact with boss. Jetpack pushes the player in the direction of the water's travel and blocks player bullets.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; small, grey two-nozzle jetpack that has a blue layer on top that indicates a tank fill level. Rapidly self refilling water supply when not producing weapon affects. Tank capacity and refill rate level scalable
- **weapon Lv1** `[ready]` Burst of mild damage large knockback water when landing on the ground
- **weapon Lv3** `[ready]` Burst of mild damage large knockback water when jumping or double jumping and upon landing on the ground.
- **weapon Lv6** `[ready]` Add the ability to hover briefly at the apex of any jump which shoots two water jets directly downward with very low but very rapid damage and knockback
- **weapon Lv10** `[ready]` All previous effects plus a large high knocked tidal wave travels in both horizontal directions when landing on the ground. Size of tidal wave is scaled with downward velocity on impact.
- **silhouette** `[ready]` Add a small grey jetpack to the current placeholder with two downward nozzles that pivot appropriately in the direction opposite the boss

## Volt Man — Electric

`palette` #F5D328 / #5B21B6 / #0A0A12 · `scale` 1.65x player height (average build) · `id` volt
`attack` Chain Spark · `weapon` Volt Spark

- **palette notes** `[ready]` Yellow primary; deep purple secondary.
- **arena** `[ready]` A very large plasma lamp in the background; several platformer phase in and out in random locations
- **hazard L1** `[ready]` Floor panels electrify in a very slow left-to-right sweep, one panel at a time, telegraphed by a lamp on the panel a moment before it energises. Contact deals moderate damage and a short Stun.
- **hazard L2** `[ready]` Same sweep, plus overhead conductors that drop a vertical St Elmo's fire looking bolt at fixed positions on a regular beat. The conductors are inert between arcs and can be stood under safely.
- **hazard L3** `[ready]` The sweep runs in both directions at once, meeting in the middle. Arcs now chain through nearby minions and into the player of the player is close to them, destroying the minions and damage the player and applying stun
- **attack L1** `[ready]` Infrequently fires up to 2 sequential zigzag lightning bolts that bounce and arc on contact with surfaces or the player. Damage and size decrease at every bounce.
- **attack L2** `[ready]` Bolts increase to 3 and gain a longer bounce life, and the boss fires a second volley on a shallower angle before the first has finished, so two zigzag paths overlap.
- **attack L3** `[ready]` Bolts no longer lose size on bounce, only damage. Between volleys the boss discharges into the floor, briefly energising every panel the last bolt touched.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Fixed-range electric burst with typical fire rate and base damage that chains to nearby enemies with diminishing damage.
- **weapon Lv1** `[ready]` 0 chains; 1s stun on first enemy contact.
- **weapon Lv3** `[ready]` Chain damage to 2 additional enemy, first enemy gets stunned, additional enemies do not get stunned. No enemy can be hit more than twice in one complete hit+chain hit attack
- **weapon Lv6** `[ready]` 2s stun on first enemy contact; chain damage to a total of 3 additional enemies, stunned for 1 sec. No enemy can be hit more than twice in one complete hit+chain hit attack
- **weapon Lv10** `[ready]` Chain damage hits up to 3 nearby enemies near the first enemy contacted; which then continue to chain up to 2 additional nearby enemies, which turn continue to chain to up to 1 additional enemy. No enemy can be hit more than twice in one complete hit+chain hit attack
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Thorn Man — Grass

`palette` #2AAB1C / #5C4033 / #0A0A12 · `scale` 1.8x player height (average build) · `id` thorn
`attack` Vine Lash · `weapon` Thorn Lash

- **arena** `[wip]` Overgrown greenhouse with a shattered glass roof; light shafts fall in bands. Thick root mass banks the left and right walls, which the vines emerge from.
- **hazard L1** `[wip]` Thorned creepers grow slowly across the floor from both walls, covering ground over about ten seconds before retracting. Standing on a covered tile deals light repeating damage.
- **hazard L2** `[wip]` Creepers grow faster and now climb the walls to about half height, so wall-adjacent footing is unsafe too. A few seed pods drop from the roof and burst into a short-lived thorn patch where they land.
- **hazard L3** `[wip]` Creepers cover the floor almost entirely, leaving a slowly wandering clear channel that the player must track and stay inside. Seed pods fall on a continuous cycle.
- **attack L1** `[wip]` Shoots a pair of large straight vines directly at the player's current location. On hit: constrict for several seconds, reel the player in, then toss diagonally to the far wall — heavy damage on wall contact. On miss: pulls the boss to that point and fires again, up to 3 times before a cooldown.
- **attack L2** `[wip]` Fires three vines in a fan rather than a pair, and on a miss the boss reels itself to the ceiling instead of to the miss point, attacking downward on the next pass.
- **attack L3** `[wip]` On a successful grab the toss now aims at the nearest thorn-covered ground rather than the far wall. On a miss the vines stay embedded for a few seconds and act as temporary walls that block shots.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Stand still while shooting a directional-input whip-like vine that reels in enemies then immediately throws them back as projectiles. Moderately slow attack speed.
- **weapon Lv1** `[draft]` Short reach; can only reel in and damage minions; mild knockback but does not toss or constrict them.
- **weapon Lv3** `[draft]` Increased reach. Each hit applies a stack of constrict and if a minion then tosses straight forward a moderate distance before being affected by gravity and rolling to a stop. Check for lethal damage after completing the toss and the minion comes to rest. Minion projectile does not deal damage butt has very large knockback. Affected by diagonal inputs; On enemy contact: perform the attack as described. Else if on the ground and contacting the outer 20% of a platform: grapple on top of that platform. If in the air and contacting a platform or ceiling: swing forward in the current direction, then release.
- **weapon Lv6** `[ready]` Significantly increased reach.
- **weapon Lv10** `[ready]` Now constricts mini-bosses and applies DPS for 5 seconds. Now throws minions as high-damage projectiles.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Frost Man — Ice

`palette` #A0EFE7 / #FFFFFF / #0A0A12 · `scale` 1.85x player height (bulky build) · `id` frost
`attack` Glacier Spike · `weapon` Frost Guard

- **arena** `[wip]` Collapsed refrigeration hall. Frost-rimed pipes overhead, a floor of cracked ice over dark water, and a background of frozen machinery.
- **hazard L1** `[wip]` Icicles form on the ceiling pipes and fall after a visible growth tell. They shatter on impact and leave a slick patch that reduces contact friction for a few seconds.
- **hazard L2** `[wip]` More icicles, forming faster, and the floor slick left behind lasts noticeably longer so patches begin to join up.
- **hazard L3** `[wip]` A section of floor freezes over entirely and stays slick until the layer cycle ends, while icicles continue to fall onto it.
- **attack L1** `[wip]` Blizzard animation freezes all surfaces making them slippery, then drops icicles from above while the boss is protected by projectile-reflecting armor. Armor, blizzard and icicles subside during cooldown.
- **attack L2** `[wip]` The blizzard now also pushes the player toward one wall for its duration, and the reflective armour holds through the whole icicle drop instead of subsiding partway.
- **attack L3** `[wip]` Two blizzard cycles run back to back with no gap between them. During the second the boss slides along the frozen floor, so the armoured body is also a moving obstacle.
- **weapon class** `[ready]` Defensive
- **weapon** `[draft]` Defensive; slowly forms a large shield of ice in front of the player that slowly bulks up. Short cooldown if damaged; long cooldown if destroyed by damage.
- **weapon Lv1** `[draft]` Very slow ice buildup. Full Shield blocks the equivalent of 3 minion projectile; breaks and freezes the opponent if contacting a minion instead.
- **weapon Lv3** `[draft]` Full Shield blocks the equivalent of 4 minion attacks; breaks from damage or from contact cause shield to break into 3 small ice shards that shot out from the top edge of the shield with the middle one at a 45 deg angle and side ones at 67.5 degrees and 22.5 def from the horizon; freezes the opponent if contacting a minion or the water boss.
- **weapon Lv6** `[draft]` Shield now breaks into 4 small ice shards, equally spaced but now the bottom one is 22.5deg below the horizon, and all shards pierce
- **weapon Lv10** `[wip]` Standing still briefly while holding attack forms ice armor that reflects projectiles and removes all incoming damage and knockback. Player cannot otherwise attack until the button is released.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Strike Man — Fighting

`palette` #EA6A34 / #7C2D12 / #0A0A12 · `scale` 1.85x player height (bulky build) · `id` strike
`attack` Rush Combo · `weapon` Strike Gauntlet

- **arena** `[ready]` Underground fight pit: chain-link cage walls, a stained mat floor, and a background of hanging lamps.
- **hazard L1** `[wip]` Weighted training bags travel across the room on ceiling rails at a very slow but steady pace, dealing knockback and light damage. Their path is fixed and learnable. Tops of bags can be stood on. Bags can be punched by boss to knock you off them if bags take moderate damage from
- **hazard L2** `[draft]` Two bags on crossing paths, boss has a moderate chance of pulling one down as a shield whenever taking ranged damage
- **hazard L3** `[draft]` Same as hazard l2 only now the boss will throw the bag at player for gravy damage after using as a shield.
- **attack L1** `[ready]` Dashes in on foot and throws a Vulcan Jab — a rapid flurry of short-range punches off a clear wind-up — finishing on a Rising Break uppercut that launches. He has nothing at range on this layer, so the whole fight is spacing: stay outside his reach and he simply keeps closing.
- **attack L2** `[ready]` Adds a guard stance between combos that reflects the first shot it takes. The Rising Break now chases upward once before he lands, and he will throw it on its own as an anti-air the moment the player is above him — jumping over him stops being free.
- **attack L3** `[ready]` Adds a thrown Force Blast when the player keeps their distance, and a spinning kick that crosses the room and cannot be cleanly jumped. The combo can also be cancelled into a dash mid-string, so he finishes it from the side he did not start on. Near gets jabbed, above gets the uppercut, far gets the blast, and the spin closes whatever gap is left.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Offensive; Close-range powerful punching gloves with knockback and damage reduction during attack animations. Tap attack for a quick low-damage lunging combo-starter jab; long-press attack 0.4s for a combo finisher.
- **weapon Lv1** `[ready]` 2 jabs, or 1 jab and one combo finisher.
- **weapon Lv3** `[ready]` Jab chain extends to three hits; the third hit causes flinch and moderate knockback. Long-press finisher gains a short forward lunge that travels through the current target, stopping on contact with a second enemy or the edge of a platform or the edge of a pit or a short distance.
- **weapon Lv6** `[ready]` Finisher launches the target upward, opening a juggle. Damage reduction during the animation increases. Finisher lunge travels through the current target, stopping on contact with a third enemy or the edge of a platform or the edge of a pit or a medium distance.
- **weapon Lv10** `[ready]` Finisher becomes a full dash-through that passes through all enemies, hitting every one it crosses and that travels through the current target, stopping on contact with the edge of a platform or the edge of a pit or a very large distance.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Venom Man — Poison

`palette` #A926D9 / #84CC16 / #0A0A12 · `scale` 1.7x player height (average build) · `id` venom
`attack` Toxic Cloud · `weapon` Venom Spray

- **palette notes** `[wip]` Violet primary; lime secondary. Violet is the standard poison read; the original sickly-green primary collided with Thorn.
- **arena** `[wip]` Chemical processing floor: corroded vats, drip lines and grated walkways over a sump. Background is a bank of pressure tanks weeping green.
- **hazard L1** `[wip]` Overhead drip lines leak at fixed points onto the floor, building small corrosive pools that apply Poisoned on contact and evaporate after several seconds.
- **hazard L2** `[wip]` More leak points, building pools faster, plus a low toxic haze that sits in the bottom few pixels of the room and applies Poisoned while stood in it.
- **hazard L3** `[wip]` The haze rises to about knee height and drifts slowly across the room, so the safe ground moves rather than the player simply avoiding fixed spots.
- **attack L1** `[wip]` Releases lingering poison clouds that drain health over time and reduce player speed.
- **attack L2** `[wip]` Clouds are released in an arc rather than dropped in place, and now linger long enough for two to be present at once.
- **attack L3** `[wip]` On release the clouds slowly drift toward the player instead of staying put, and a popped cloud leaves a corrosive pool where it dispersed.
- **weapon class** `[wip]` Offensive
- **weapon** `[wip]` Sprays a cone of poison that damages over time and weakens enemies. Per-level scaling: larger cloud + stronger DoT.
- **weapon Lv1** `[wip]` Short cone, low DoT; Poisoned lasts a few seconds and does not stack.
- **weapon Lv3** `[wip]` Wider cone and longer Poisoned duration; the cone now passes through the first enemy it hits.
- **weapon Lv6** `[wip]` Lv6+: clouds can be detonated for burst damage.
- **weapon Lv10** `[wip]` Poisoned enemies drop health pickups when killed.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Quake Man — Ground

`palette` #A76625 / #EA580C / #0A0A12 · `scale` 1.95x player height (bulky build) · `id` quake
`attack` Seismic Stomp · `weapon` Quake Hammer

- **arena** `[wip]` Deep excavation site: layered rock strata walls, timber shoring, and a background of stalled drilling rigs.
- **hazard L1** `[wip]` The ground fissures at telegraphed points and a rock pillar rises, dealing damage on the way up and remaining as a solid obstacle until it sinks again.
- **hazard L2** `[wip]` Pillars rise in pairs, and some now rise from the ceiling downward so the safe lane is a gap rather than a floor position.
- **hazard L3** `[wip]` A rolling wave of pillars crosses the room end to end, forcing continuous movement rather than choosing a spot to stand.
- **attack L1** `[wip]` Causes screen-wide tremors and rising rock pillars.
- **attack L2** `[wip]` The stomp now sends two shockwaves in both directions, and the tremor briefly disables the player's footing so a jump has to be timed before the shake, not during it.
- **attack L3** `[wip]` The stomp collapses part of the ceiling, adding falling debris to the shockwave, and pillars raised by the arena hazard are shattered into projectiles by the wave.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Offensive; Large rock shaped hammer visible when active. Slow, delayed baseball-swing on tap for high damage and high knockback, long press 1.5s to hold hammer overhead and on release swing downward producing shockwaves and stuns nearby enemies. Per-level scaling: shockwave size + stun duration.
- **weapon Lv1** `[ready]` Airborne swings cause the player to swing downward and rapidly travel downward where a shockwave will be generated on contact with the ground
- **weapon Lv3** `[ready]` Larger shockwave and longer Stun; the wave now climbs low obstacles instead of stopping at them.
- **weapon Lv6** `[wip]` Lv5+: can break certain floors or reveal hidden paths.
- **weapon Lv10** `[wip]` Max: super stomp that causes falling debris from the ceiling.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Gale Man — Flying

`palette` #5CADD5 / #F8FAFC / #0A0A12 · `scale` 1.5x player height (petite build) · `id` gale
`attack` Wind Vortex · `weapon` Gale Vortex

- **arena** `[wip]` Open turbine deck at altitude: no side walls, only railings, with slow cloud layers passing behind and a vast rotor turning in the background.
- **hazard L1** `[wip]` A steady crosswind pushes the player toward one railing, reversing direction on a slow, clearly telegraphed cycle.
- **hazard L2** `[wip]` The wind gusts rather than holding steady — short, strong bursts strong enough to break a jump arc, separated by calm.
- **hazard L3** `[wip]` Gusts alternate with vacuum pockets that pull toward the rotor, so the player is fighting force in both directions within one cycle.
- **attack L1** `[wip]` Creates tornadoes that suck the player in and launch them upward.
- **attack L2** `[wip]` Two smaller tornadoes at once on crossing paths, and the boss dives through one of them to close distance.
- **attack L3** `[wip]` A single large vortex parks in the centre of the room and pulls continuously while the boss fires wind blades from the edge, so the fight becomes about holding position.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; white puffs of smoke energy when falling, significantly reducing fall speed and significantly increasing migraine horizontal movement
- **weapon Lv1** `[ready]` Up to 3 puffs while falling, each one cancelling vertical velocity and separated by a very brief time
- **weapon Lv3** `[wip]` Larger and longer; the tornado now carries enemy projectiles that enter it.
- **weapon Lv6** `[wip]` Lv7+: can ride your own tornado for limited flight.
- **weapon Lv10** `[wip]` The tornado becomes steerable in flight and returns carried projectiles at whoever fired them.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Psi Man — Psychic

`palette` #EA43BD / #F9A8D4 / #0A0A12 · `scale` 1.55x player height (petite build) · `id` psi
`attack` Mind Lift · `weapon` Psi Orb

- **arena** `[wip]` Sterile observation chamber: white panelled walls, one-way glass, and slowly rotating geometric shapes suspended in the background.
- **hazard L1** `[wip]` Sections of floor lose gravity on a slow cycle, telegraphed by the panel dimming; standing in one lifts the player and drops them when it ends.
- **hazard L2** `[wip]` More panels, cycling faster, and some invert to heavy gravity instead — jumps out of them are much shorter.
- **hazard L3** `[wip]` The whole room alternates between low and heavy gravity, with the panels only marking where the effect is strongest.
- **attack L1** `[wip]` Levitates the player and drops them from height while firing homing psychic orbs.
- **attack L2** `[wip]` Levitation now sweeps the player sideways before dropping them, and the homing orbs fire in a ring rather than a stream.
- **attack L3** `[wip]` The boss holds the player suspended while orbs converge, releasing only when an orb connects or the hold times out.
- **weapon class** `[wip]` Offensive
- **weapon** `[wip]` Fires slow but powerful homing psychic balls that can be remotely steered. Per-level scaling: homing strength + orb speed.
- **weapon Lv1** `[wip]` One slow homing orb at a time; steerable while the attack button is held.
- **weapon Lv3** `[wip]` Stronger homing and faster travel; the orb survives one terrain contact instead of dispersing.
- **weapon Lv6** `[wip]` Lv6+: can control multiple orbs.
- **weapon Lv10** `[wip]` Ultimate: brief mind control on weak enemies.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Swarm Man — Bug

`palette` #B8DC28 / #4D5C1A / #0A0A12 · `scale` 1.6x player height (petite build) · `id` swarm
`attack` Infestation · `weapon` Swarm Caller

- **arena** `[wip]` Hollowed hive interior: chambered comb walls, resin-slick floor, and a background of drifting larvae sacs.
- **hazard L1** `[wip]` Comb cells on the walls hatch on a slow cycle, releasing a single drone that tracks lazily and expires after a few seconds.
- **hazard L2** `[wip]` Cells hatch in clusters, and the resin floor now slows movement in patches where a sac has burst.
- **hazard L3** `[wip]` Hatching is continuous from both walls, and the ceiling drops sacs that burst into slowing resin where they land.
- **attack L1** `[wip]` Releases bug drones that home in and explode on contact.
- **attack L2** `[wip]` Drones are released in a wave that spreads before homing, and a drone that misses circles once and makes a second pass.
- **attack L3** `[wip]` The boss splits into a drone cloud and reforms elsewhere in the room, taking reduced damage while dispersed.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; Summons temporary bug allies that attack nearby enemies. Per-level scaling: tougher bugs + longer duration.
- **weapon Lv1** `[ready]` One bug ally, short duration; it attacks the nearest minion and must return to the player briefly between targets
- **weapon Lv3** `[ready]` 2 allies with a longer duration; they now prioritise whatever the player last damaged.
- **weapon Lv6** `[ready]` Lv6: 3 bugs; every other bug spawned will prioritize intercepting projectiles as a meat shield
- **weapon Lv10** `[ready]` Lv10: 5 bugs continuously swarm all over the player forming a shield and slowly respawn after tanking enough damage. Additionally, 3 bugs simultaneously converge on an enemy and kamikaze with an explosive blast.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Granite Man — Rock

`palette` #5F443A / #A8A296 / #0A0A12 · `scale` 2.0x player height (bulky build) · `id` granite
`attack` Boulder Roll · `weapon` Rock Buster

- **arena** `[wip]` Quarry face: stepped stone benches, loose scree, and a background of cut rock walls with old blast scars.
- **hazard L1** `[wip]` Loose rock sheds from the upper wall at telegraphed points, bouncing once off the floor before settling as a small obstacle that erodes away.
- **hazard L2** `[wip]` Larger rock, more of it, and settled pieces now stack into a low barrier that has to be jumped or destroyed.
- **hazard L3** `[wip]` A sustained rockslide down one side of the room, changing sides between cycles.
- **attack L1** `[wip]` Pushes massive rolling rocks that crush and block paths.
- **attack L2** `[wip]` Two boulders on staggered timing so the gap between them is the only safe window; boulders now break into two smaller rolling pieces on wall contact.
- **attack L3** `[wip]` The boss rides a boulder, so the safe window is beneath a jump rather than behind the roll, and impacts shed debris upward.
- **weapon class** `[wip]` Offensive
- **weapon** `[wip]` Throws heavy boulders that roll and crush enemies; can be charged for bigger rocks. Per-level scaling: larger boulders + more throw speed.
- **weapon Lv1** `[wip]` Single thrown boulder; rolls on landing and stops at the first wall.
- **weapon Lv3** `[wip]` Heavier boulder that rolls further and crushes through minions instead of stopping on the first.
- **weapon Lv6** `[wip]` Lv7+: boulders can be kicked or exploded on command.
- **weapon Lv10** `[wip]` Charged throw produces a boulder that spans the screen and shatters into rolling fragments at the far wall.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Wraith Man — Ghost

`palette` #A68DD8 / #2A1F4A / #0A0A12 · `scale` 1.6x player height (petite build) · `id` wraith
`attack` Spectral Shift · `weapon` Wraith Cloak

- **arena** `[wip]` Derelict chapel: broken pews, a collapsed rose window, and shafts of pale light through dust with unlit candelabra in the background.
- **hazard L1** `[wip]` Cold spots drift slowly through the room, invisible except for a faint distortion; entering one drains a little energy and slows movement briefly.
- **hazard L2** `[wip]` More cold spots, moving faster, and they now leave a short trail that is also unsafe.
- **hazard L3** `[wip]` Cold spots actively track the player at a slow, unhurried pace so they can be outrun but never lost.
- **attack L1** `[wip]` Phases through attacks and counters with intangibility + surprise teleports.
- **attack L2** `[wip]` The boss now leaves an afterimage on each teleport that attacks once before fading, so the real body has to be identified.
- **attack L3** `[wip]` Two afterimages per teleport, and the boss is intangible for longer than it is solid — the fight becomes about recognising the tell for solidity.
- **weapon class** `[wip]` Defensive
- **weapon** `[wip]` Temporary invulnerability + invisibility with a damaging reappear burst. Per-level scaling: duration + burst damage.
- **weapon Lv1** `[wip]` Brief invulnerability and invisibility on activation; reappearing deals a small burst around the player.
- **weapon Lv3** `[wip]` Longer duration and a larger reappear burst; movement speed is increased while cloaked.
- **weapon Lv6** `[wip]` Lv6+: can phase through walls for short distances.
- **weapon Lv10** `[wip]` Max: leaves damaging ghost copies that mimic your movement.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Drake Man — Dragon

`palette` #C3225D / #6B1220 / #0A0A12 · `scale` 1.9x player height (bulky build) · `id` drake
`attack` Dragon Breath · `weapon` Drake Breath

- **arena** `[wip]` Volcanic caldera rim: basalt columns, a glowing fissure crossing the floor, and a background of ash cloud lit from below.
- **hazard L1** `[wip]` The floor fissure vents in bursts at telegraphed points, each vent a brief vertical jet dealing moderate damage.
- **hazard L2** `[wip]` More vents in quicker succession, and the fissure widens so the safe standing area either side narrows.
- **hazard L3** `[wip]` Vents fire in a travelling sequence along the fissure, sweeping the room end to end.
- **attack L1** `[wip]` Sweeping fire/ice beam + fireball projectiles.
- **attack L2** `[wip]` The beam now sweeps in both directions across a single pass, and fireballs are released along its path rather than before it.
- **attack L3** `[wip]` The boss takes flight for the beam, sweeping from above so there is no crouching under it, and lands with a fireball burst.
- **weapon class** `[wip]` Offensive
- **weapon** `[wip]` Short-range powerful flame/arc beam that can be angled. Per-level scaling: beam length + secondary projectiles.
- **weapon Lv1** `[wip]` Short fixed-angle beam, high damage, held while the attack button is down.
- **weapon Lv3** `[wip]` The beam can be angled with directional input and reaches noticeably further.
- **weapon Lv6** `[wip]` The beam splits into a narrow cone at its far end, and secondary fireballs drop from the beam on contact with terrain.
- **weapon Lv10** `[wip]` Lv8+: charge for a massive dragon-head projectile.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Eclipse Man — Dark

`palette` #2A273F / #DC2626 / #0A0A12 · `scale` 1.75x player height (average build) · `id` eclipse
`attack` Shadow Bind · `weapon` Astral Cloak

- **arena** `[wip]` Moonlit ruin: toppled columns, a cracked floor mosaic, and a background of overgrown arches with light entering from a single high gap.
- **hazard L1** `[wip]` Patches of darkness drift across the room, reducing visibility to a short radius while the player is inside one.
- **hazard L2** `[wip]` Larger and more numerous patches, and a shadow clone of an ordinary minion spawns inside each one.
- **hazard L3** `[wip]` The room blacks out entirely on a slow cycle, leaving only silhouettes and the boss's own outline visible.
- **attack L1** `[wip]` Creates darkness zones that slow the player and spawn shadow clones.
- **attack L2** `[wip]` Shadow clones now mimic the boss's previous attack on a short delay, so the pattern arrives twice from two places.
- **attack L3** `[wip]` The boss merges into the darkness and is untargetable while the room is dark, surfacing only to attack.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; reduces aggro and become immune to stays affects.
- **weapon Lv1** `[ready]` While active enemies will fire projectiles slightly less frequently and when pursuing the player will pause very briefly at random times
- **weapon Lv3** `[ready]` Slight increase in pause duration and frequency
- **weapon Lv6** `[ready]`  creates shadow trails that damage enemies and lifesteal.
- **weapon Lv10** `[wip]` Ultimate: temporary “Dark Mode” with increased damage and lifesteal.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Alloy Man — Steel

`palette` #B2BABD / #4B5563 / #0A0A12 · `scale` 1.9x player height (bulky build) · `id` alloy
`attack` Metal Barrage · `weapon` Alloy Blade

- **arena** `[wip]` Rolling mill floor: steel plate walls, an overhead crane gantry, and a background of glowing billets on a stalled conveyor.
- **hazard L1** `[wip]` The overhead crane traverses the room and drops a steel plate at a telegraphed position, which stands as a solid obstacle before being lifted away.
- **hazard L2** `[wip]` Two plates per pass, and a dropped plate now stays long enough for two to be present at once, splitting the room.
- **hazard L3** `[wip]` The crane also drags a plate along the floor between drops, sweeping the ground the length of the room.
- **attack L1** `[wip]` Fires homing metal blades + deploys temporary shields.
- **attack L2** `[wip]` Blades are fired in a spread and ricochet twice instead of once; the deployed shield now orbits the boss rather than sitting in front of it.
- **attack L3** `[wip]` The shield breaks into blades when destroyed, so removing it is itself an attack the player has to answer.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Offensive; Throws penetrative metal blades that ricochet multiple times. Per-level scaling: more ricochets + higher damage.
- **weapon Lv1** `[ready]` Single blade, one ricochet, pierces the first enemy hit.
- **weapon Lv3** `[ready]` Two ricochets and increased pierce; blades survive contact with terrain corners.
- **weapon Lv6** `[wip]` Lv5+: blades can be recalled early.
- **weapon Lv10** `[wip]` Temporary steel armor mode that greatly reduces damage taken.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

---

# ELEMENTAL ATTRIBUTES

Terrain form / character form pairs, shared across bosses and weapons.
**Flinch and knockback are NOT attributes** — they are basic hitbox
interaction present on every hit.

## Hot
- **shared** `[ready]` Environmental attribute: Faint red hue that gets more faint until the attribute subsides. Causes burn on contact
- **boss-applied** `[ready]` Does not affect boss; Spot is 'red hot'. add a low transparency red hue that becomes more transparent as the effect diminishes; moderate damage/flinch/knockback on touch and applies burn, all of which scale down until Hot subsides. Hot affect shall last for 5s unless reapplied
- **weapon-applied** `[ready]` Does not affect player; Spot is 'red hot'. add a low transparency red hue that becomes more transparent as the effect diminishes; mild damage and moderate flinch/knockback on touch and applies burn, all of which scale down until Hot subsides. Hot affect shall last for 5s unless reapplied

## Burn
- **shared** `[ready]` Character attribute: Faint red hue that gets more faint until the attribute subsides. The player or enemy is on fire: rapid but weak burn DPS, no flinch or knockback, scaling down until the duration concludes.
- **boss-applied** `[ready]` The player is on fire. Deal very mild damage very rapidly, while rapidly diminishing. No flinch or knockback.
- **weapon-applied** `[ready]` The enemy is on fire. Deal very mild damage very rapidly, while rapidly diminishing. No flinch or knockback.

## Wet
- **shared** `[wip]` Environmental attribute: The spot wet and slippery
- **boss-applied** `[wip]` Does not affect boss
- **weapon-applied** `[wip]` the surface is slippery reducing contact friction if terrain and reducing enemy movement speed if an enemy. visually indicated by an initially low transparency blue hue that fades until the attribute has expired. Lasts 10 seconds.

## Poisoned
- **shared** `[draft]` The object has come in contact with toxins. Faint purple hue that fades in discrete increments as the poison wears off. Mild damage with no flinch or knockback
- **boss-applied** `[draft]` Deal small damage to player in discrete 3 second intervals for 9 seconds.
- **weapon-applied** `[draft]` Deal small damage to enemy in discrete 3 second intervals for 9 seconds.

## Stun
- **shared** `[ready]` Very mild flinch with a faint yellow hue that becomes more intense with each additional stack
- **boss-applied** `[draft]` Player movement and attack speed reduced by 15 percent. Return to normal after 5 seconds unless additional Stun gets applied, resetting the 5 seconds duration. Stun stacks Using a multiplicative reduction of remaining movement and attack speed
- **weapon-applied** `[ready]` Enemy movement and attack speed reduced by 30 percent. Return to normal after 5 seconds unless additional Stun gets applied, resetting the 5 seconds duration. Stun stacks Using a multiplicative reduction of remaining speed

## Constrict
- **shared** `[draft]` Functionally the same as stun/freeze; elementally correct color hue while the target has this attribute.
- **boss-applied** `[draft]` See stun
- **weapon-applied** `[draft]` See stun

## Freeze
- **shared** `[draft]` Functionally the same as stun/constrict; elementally correct color hue while the target has this attribute.
- **boss-applied** `[draft]` See stun
- **weapon-applied** `[draft]` See stun

---

# BUGS

Shorthand is fine. `build` is the versionCode shown on the title screen.
Same markers as everywhere else: Claude fixes `[draft]` bugs, `[wip]` means
still describing it, and `[ready]` means already fixed.


---

| build | status | bug |
|---|---|---|
| 1054 (main) | `[ready]` | Falling diagonally into a pit, player should not pass through wall. With spike and pit respawn, player should not be able to act or buffer inputs. Base Invulnerability time after respawn should be 3 after first post respawn button press or passive damage delt |
| 1054 (main) | `[ready]` | Items that land on spikes should migrate to the nearest horizontal edge of the spikes for safe pickup |
| 1054 (main) | `[ready]` | After reducing double jump Max height, platforming feels off, I think the seed generator didn't adjust for new typical jumping. |
| 1054 (main) | `[ready]` | Thorn lash has no animation so I can't play test it |
| 1054 (main) | `[ready]` | Player idle animation cycles through frames way too quickly |
| 1054 (main) | `[ready]` | Too many times I will defeat a boss only to be close enough to the for that it immediately warps me out. Exit door should not appear until after boss death animation and requip wheel pop up, but if the player is standing in the doorway when it spawns in it should be visibly disabled until the player walks away from it. I also think that since this game is a left-to-right progression, the boss exit door should be near the right side of the arena |
| 1054 (main) | `[ready]` | Stun appears to prevent player from shooting ever again, long after not taking any damage |

# BRAINSTORM — context only, never implemented

Claude reads this to understand where the game is heading and to avoid
building things that contradict it, but **implements nothing from here and
never suggests promoting an idea**. Move something into a slice yourself when
it is ready to be real.

## Boss ideas


## Game pacing


## Play feel


## Cosmetics
 



