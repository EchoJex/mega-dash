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

`id` core

- **palette primary** `[ready]` #687380
- **palette secondary** `[ready]` #2E3338
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 0.8x player height (prototype chassis)
- **attack name** `[ready]` Ballistic barrage
- **weapon name** `[ready]` Nullfire Drone
- **palette notes** `[ready]` Light grey / dark grey
- **arena** `[ready]` Plain light grey room with a couple of small ceiling turrets. Background shall be of various size metal gears
- **arena furniture** `[ready]` Two ceiling turrets at 28% and 72% of the room width. Same at every layer — what the layers change is how finely they aim, not what is in the room.
- **hazard L1** `[ready]` Turrets visibly track and aim at player to nearest 45°, all firing simultaneous short 3-bullet bursts of slightly slow bullets; 15s cooldown.
- **hazard L2** `[ready]` Same number of turrets; visibly track and aim within nearest 22.5°; slightly reduced cooldown.
- **hazard L3** `[ready]` Same number of turrets; visibly track and aim within nearest 11.25°; further reduced cooldown.
- **attack L1** `[ready]` Moves back and forth on the stage, occasionally stopping, waiting a moment, then fire a 3 bullet spread directly forward toward the player with mild auto-aim, dealing small damage.
- **attack L2** `[ready]` Moves back and forth across the stage, occasionally stopping, waiting a moment, then fire either a 3 bullet spread directly forward toward the player with mild auto-aim or aim directly at the player and shoot a string of 5 bullets that do not auto aim. Boss stops tracking the player during the 5-bullet string, aiming where the player was at the time the first of 5 bullets comes out.
- **attack L3** `[ready]` Moves back and forth across the stage, occasionally stopping, waiting a moment, then fire either a set of 2 3-bullet spread directly forward toward the player with mild auto-aim or aim directly at the player, tracking the players movements while continuously shooting a string of 5 bullets that do not auto aim, either way, dealing small damage.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; a small gray drone hovers well above and in front of the player's shoulder. Very Slowly refills the current clip when no enemies present. When clip is fully depleted indicate this emergency reload by making the drone Dark grey and cease firing until clip colored completes. It continuously auto aims at the nearest enemy and auto fires, only if an enemy is on screen, a neutral bullet with clip cooldown time equal to one and a half times the current levels clip size divided by the current levels shot per second (clip_cooldown=1.5(clip_size/fire_rate)).
- **weapon Lv1** `[ready]` Single shot, mild damage, weapon auto aims but bullet does not auto aim, 1 shot per 3 seconds, 10 ammo clip.
- **weapon Lv3** `[ready]` Weapon auto aims; Bullet does not auto-aim. 3-bullet burst of bullets. One set of bullets per 3 seconds, like a rifle. 9 bullet clip
- **weapon Lv6** `[ready]` 3 bullet burst; bullet does not auto-aim; bullet splits into 3 fragments after a brief time; fragments have moderate auto-aim and rapid acceleration. Fragments can not change target mid flight
- **weapon Lv10** `[ready]` Weapon now fires straight up instead of Auto aiming; each bullet targets a different enemy, traveling in a wide arc with high strong auto aim and rapidly acceleration bullet speed. 5 shots per second;  does not split into fragments; 30 bullet clip
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Blaze Man — Fire

`id` blaze

- **palette primary** `[ready]` #E11416
- **palette secondary** `[ready]` #141414
- **palette outline** `[ready]` #0A0A12
- **scale** `[wip]` 1.75x player height (average build)
- **attack name** `[ready]` Inferno Wheel
- **weapon name** `[ready]` Blaze Wheel
- **palette notes** `[todo]`
- **arena** `[ready]` Silhouette of a faintly glowing active volcano as the background. A few short platforms phase in and out in random places throughout the entire fight as shelter. Never shall all airborne platforms simultaneously have Hot.
- **arena furniture** `[ready]` Three phasing platforms at alternating heights, and a floodable floor that the layer-3 lava rises into. AT LAYER 3 ONLY the boss gains his own lift — a fourth platform riding a slow sine that never phases out, so he stops taking one of the player's three with him when the floor disappears.
- **hazard L1** `[ready]` Brief screen shake → occasional player-width hot flaming rocks slowly fall from top of screen, crumbling on contact with the floor or platforms, leaving Hot there for a few seconds. Moderate damage and applies Burn on player contact. Cycle repeats every 20 seconds or so.
- **hazard L2** `[ready]` Slightly more overt screen shake → slightly more rocks on screen, slightly bigger, falling slightly faster.
- **hazard L3** `[ready]` Same arena hazard as Layer 2.
- **attack L1** `[ready]` Launches a 1 very bouncy fireball toward the player that climb up walls and leave hot trails everywhere it contacts.
- **attack L2** `[ready]` 2 fireballs, much higher bounce heights ; boss has multiple stem angle to choose from
- **attack L3** `[ready]` Same as Layer 2; additionally, the boss will regularly pause their normal attack and jump up to a small platform that moves up and down just for himself a few seconds before the screen shake/Rock fall event. the red pixels of the background ebb rapidly, then the entire floor fills with lava, slowly, up to about one default player height; the lava recedes after 20 seconds, leaving Hot on the ground. Rocks shall fall, but not from right above the platforms while the lava is up.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Offensive; orange/red glowing backpack sits high on the players back like a backpack. From that backpack fire wheels are lobbed in the direction the player is facing, like a backpack catapult; applies Hot to ground or burn to enemy on contact for a scalable time. Base fire rate fixed for all levels at once set per 3 seconds, and up to 2 fireballs on screen at once. High Fireball contact damage, low rolling contact damage. Standard burn dps standard response to gravity, pits, and platforms.
- **weapon Lv1** `[ready]` Very slight rolling distance; up to 2 on screen; 2s Hot duration applied to surfaces and 2s burn applied on contact with enemies.
- **weapon Lv3** `[ready]` 5s Hot trail duration on ground; moderate roll distance with rapid deceleration while on the ground.
- **weapon Lv6** `[ready]` Adds a second fireball launched simultaneously on a slightly taller, much wider arc, contacting the ground shortly after the first, approximately where the first is projected to terminate, then continuing its own equal roll distance. Up to 2 on screen;
- **weapon Lv10** `[ready]` Combined effective roll distance shall be full screen (half for each fireball); fireballs explode on contact with enemies, dealing damage with a one fireball radius in all directions and applying 2s Burn to each event damaged. fireballs rapidly accelerate while on the ground
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Tempest Man — Water

`id` torrent

- **palette primary** `[ready]` #145DBD
- **palette secondary** `[ready]` #F5C518
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.5x player height (below average build)
- **attack name** `[ready]` Aqua Torrent
- **weapon name** `[ready]` Torrent Cannon
- **palette notes** `[ready]` Blue yellow guy with a large grey hydro jet pack. The grey is NOT one of his three palette colours — blue, yellow and the shared outline spend all three. The jetpack is a separate object attached to his back, carrying its own greys, drawn whether or not he is thrusting.
- **arena** `[ready]` Background theme dark cloudy skies. Bolts of lightning and screen flashes telegraph the heavy rain direction changes
- **arena furniture** `[ready]` Two steel pipes protruding from the upper corners, a grate-covered central drain carrying a spike ball, and ankle-deep floor water. Barrels and spike balls come out of the pipes and are popped by the central ball, which is what caps their number.
- **hazard L1** `[ready]` Heavy rain pouring straight down top-to-bottom, applies a continuous directional force vector / velocity bias that pushes player in the direction of the rain.
  Steady, powerful water flows out of large steel pipes that are protruding from the walls in the upper corners of the stage. The water cascades down and across the floor toward a grate-covered central drain/pit that all water drains into. Floor water should be ankle-deep with very strong inward-flowing currents that visibly pull toward the center. Jumps while in contact with this ankle deep water have 80% the jump strength; midair jumps are only affected by the rain forces. Occasional very large brown barrels float from the steel pipes which break open and despawn on contact with the spike ball. Player can stand on them or shoot them to destroy them. Player moves with the barrel while standing on it, and takes heavy knockback but no damage if they are standing on the barrel when it breaks
- **hazard L2** `[ready]` Heavy rain cycling through one of 3 directions (top-to-bottom, diagonal down+left, diagonal down+right) applies a continuous directional force vector / velocity bias that pushes Mega Man in the direction of the rain. Lightning bolts in the background telegraph the rain direction is about to change.
  Steady, powerful water flows out of large steel pipes that are protruding from the walls in the upper corners of the stage. The water cascades down and across the floor toward a grate-covered central drain/pit that all water drains into. Floor water should be ankle-deep with strong inward-flowing currents that visibly pull toward the center. Jumps while in contact with this ankle deep water have 80% the jump strength; midair jumps are only affected by the rain forces. Occasional large brown barrels or spike balls float from the steel pipes which break open and despawn on contact with the central drain spike ball. Player can stand on barrels or shoot the barrels to destroy them. Spike balls despawn on contact with the central spike ball, and are otherwise indestructible
- **hazard L3** `[ready]` Rain changes direction with limited tapering down between direction changes, with a random duration of at least 3s. Lightning bolts in the background are now brought enough to wash it the screen like a flash bang. Steady, powerful water flows out of large steel pipes that are protruding from the walls in the upper corners of the stage. The water cascades down and across the floor toward a grate-covered central drain/pit that all water drains into. Floor water should be ankle-deep with strong inward-flowing currents that visibly pull toward the center. Jumps while in contact with this knee deep water have 80% the jump strength; midair jumps are only affected by the rain forces. Semi frequent spike balls float from the steel pipes which despawn on contact with the central spike ball
- **attack L1** `[wip]` Boss flies around the stage just like the attack pattern of Queen B from DKC at full health. Player takes moderate damage from contact with boss. Jetpack pushes the player in the direction of the water's travel and blocks player bullets.
- **attack L2** `[wip]` Boss flies around the stage just like the attack pattern of damaged Queen B from DKC. Player takes moderate damage from contact with boss. Jetpack pushes the player in the direction of the water's travel and blocks player bullets.
- **attack L3** `[wip]` Boss flies around the stage just like the attack pattern of critical health Queen B from DKC. Player takes moderate damage from contact with boss. Jetpack pushes the player in the direction of the water's travel and blocks player bullets.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; small, grey two-nozzle jetpack that has a blue layer on top that indicates a tank fill level. Rapidly self refilling water supply when not producing weapon affects. Tank capacity and refill rate level scalable
- **weapon Lv1** `[ready]` Large Burst of mild damage large knockback water when landing on the ground
- **weapon Lv3** `[ready]` Large Burst of mild damage large knockback water when jumping or double jumping and upon landing on the ground.
- **weapon Lv6** `[ready]` Add the ability to hover at the apex of any jump by holding the jump button which shoots two water jets directly downward with very low damage and large knockback
- **weapon Lv10** `[ready]` Add a straight down nosedive that produces a large tidal wave in both horizontal directions on context with a surface. Activated by tapping jump after a water hover has started. Consumes all remaining water. Size is initially taller than the player, but scaled down based on the amount of water remaining in the tank
- **silhouette** `[ready]` Add a small grey jetpack to the current placeholder with two downward nozzles that pivot appropriately in the direction opposite the boss

## Volt Man — Electric

`id` volt

- **palette primary** `[ready]` #F5D328
- **palette secondary** `[ready]` #5B21B6
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.65x player height (average build)
- **attack name** `[ready]` Chain Spark
- **weapon name** `[ready]` Volt Spark
- **palette notes** `[ready]` Yellow primary; deep purple secondary.
- **arena** `[ready]` A very large plasma lamp in the background with occasionally changing lightning lines; several platforms phase in and out slowly in genuinely random locations
- **arena furniture** `[draft]` Four phasing platforms that phase in at a new location each time they phase IN. eight floor panels. two long overhead cables with exposed conductors at 30% and 70% arena width. The cables are drawn at every layer and but the conductors and the sparkle are only drawn at layer 2 and layer 3.
- **hazard L1** `[draft]` Floor panels electrify in a very slow left-to-right sweep, one panel at a time, visually discharging before immediately going inert. The start of each panels hurt box will be telegraphed by a blinking red and yellow light on the panel a moment before it electrically discharges. Discharge animation causes flinch and moderate damage and but not stun. Lingering electrification of the panel lasts 3s. Lingering electrified panel deals mild damage and a short Stun.
- **hazard L2** `[ready]` Same sweep, plus overhead wire bundles that occasionally produce vertical bolts zigzag straight downward on a regular beat. The conductors are inert between arcs and can be stood under safely.
- **hazard L3** `[ready]` The sweep runs in both directions at once, meeting in the middle. Vertical Bolts now chain through nearby minions and into the player if the player is close to them, destroying the minions and damaging the player and applying stun
- **attack L1** `[draft]` Infrequently fires up to 2 sequential zigzag lightning bolts that have a long yellow tail. These lightning bolts bounce on wide arcs on surfaces, on contact with the player deal mild damage and apply mild stun. Damage and size and stun duration decrease with total travel distance
- **attack L2** `[ready]` 2 sets of bolts with a longer bounce life, fired as a primary volley and a secondary volley which is shot on a slightly shallower angle causing the two paths to eventually intersect.
- **attack L3** `[ready]` Bolts no longer lose size on bounce, only reduce in damage delt. Occasionally the boss jumps and slams into the floor, briefly energising every panel destroying any ground minions that are on those panels.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Fixed-range electric burst with typical fire rate and base damage that chains to nearby enemies with diminishing damage.
- **weapon Lv1** `[ready]` 0 chains; 1s stun on first enemy contact.
- **weapon Lv3** `[ready]` Chain damage to 2 additional enemy, first enemy gets stunned, additional enemies do not get stunned. No enemy can be hit more than twice in one complete hit+chain hit attack
- **weapon Lv6** `[ready]` 2s stun on first enemy contact; chain damage to a total of 3 additional enemies, stunned for 1 sec. No enemy can be hit more than twice in one complete hit+chain hit attack
- **weapon Lv10** `[ready]` Chain damage hits up to 3 nearby enemies near the first enemy contacted; which then continue to chain up to 2 additional nearby enemies, which turn continue to chain to up to 1 additional enemy. No enemy can be hit more than twice in one complete hit+chain hit attack
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Thorn Man — Grass

`id` thorn

- **palette primary** `[ready]` #2AAB1C
- **palette secondary** `[ready]` #5C4033
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.8x player height (average build)
- **attack name** `[ready]` Vine Lash
- **weapon name** `[wip]` Simon's whip
- **arena** `[wip]` Overgrown greenhouse with a shattered glass roof;
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
- **hazard L1** `[wip]` Thorned creepers grow slowly across the floor from both walls, covering ground over about ten seconds before retracting. Standing on a covered tile deals light repeating damage.
- **hazard L2** `[wip]` Creepers grow faster and now climb the walls to about half height, so wall-adjacent footing is unsafe too. A few seed pods drop from the roof and burst into a short-lived thorn patch where they land.
- **hazard L3** `[wip]` Creepers cover the floor almost entirely, leaving a slowly wandering clear channel that the player must track and stay inside. Seed pods fall on a continuous cycle.
- **attack L1** `[wip]` Shoots a pair of large straight vines directly at the player's current location. On hit: constrict for several seconds, reel the player in, then toss diagonally to the far wall — heavy damage on wall contact. On miss: pulls the boss to that point and fires again, up to 3 times before a cooldown.
- **attack L2** `[wip]` Fires three vines in a fan rather than a pair, and on a miss the boss reels itself to the ceiling instead of to the miss point, attacking downward on the next pass.
- **attack L3** `[wip]` On a successful grab the toss now aims at the nearest thorn-covered ground rather than the far wall. On a miss the vines stay embedded for a few seconds and act as temporary walls that block shots.
- **weapon class** `[ready]` Offensive
- **weapon** `[ready]` Stand still while shooting a directional-input whip-like vine that reels in enemies then immediately throws them back as projectiles. Moderately slow attack speed.
- **weapon Lv1** `[ready]` Short reach; can only reel in and damage minions; mild knockback but does not toss or constrict them.
- **weapon Lv3** `[ready]` Increased reach. Each hit applies a stack of constrict and if a minion then tosses straight forward a moderate distance before being affected by gravity and rolling to a stop. Check for lethal damage after completing the toss and the minion comes to rest. Minion projectile does not deal damage butt has very large knockback. Affected by diagonal inputs; On enemy contact: perform the attack as described. Else if on the ground and contacting the outer 20% of a platform: grapple on top of that platform. If in the air and contacting a platform or ceiling: swing forward in the current direction, then release.
- **weapon Lv6** `[ready]` Significantly increased reach.
- **weapon Lv10** `[ready]` Now constricts mini-bosses and applies DPS for 5 seconds. Now throws minions as high-damage projectiles.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Frost Man — Ice

`id` frost

- **palette primary** `[ready]` #A0EFE7
- **palette secondary** `[ready]` #FFFFFF
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.85x player height (bulky build)
- **attack name** `[ready]` Glacier Spike
- **weapon name** `[ready]` Frost Guard
- **arena** `[wip]` Collapsed refrigeration hall. Frost-rimed pipes overhead, a floor of cracked ice over dark water, and a background of frozen machinery.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
- **hazard L1** `[wip]` Icicles form on the ceiling pipes and fall after a visible growth tell. They shatter on impact and leave a slick patch that reduces contact friction for a few seconds.
- **hazard L2** `[wip]` More icicles, forming faster, and the floor slick left behind lasts noticeably longer so patches begin to join up.
- **hazard L3** `[wip]` A section of floor freezes over entirely and stays slick until the layer cycle ends, while icicles continue to fall onto it.
- **attack L1** `[wip]` Blizzard animation freezes all surfaces making them slippery, then drops icicles from above while the boss is protected by projectile-reflecting armor. Armor, blizzard and icicles subside during cooldown.
- **attack L2** `[wip]` The blizzard now also pushes the player toward one wall for its duration, and the reflective armour holds through the whole icicle drop instead of subsiding partway.
- **attack L3** `[wip]` Two blizzard cycles run back to back with no gap between them. During the second the boss slides along the frozen floor, so the armoured body is also a moving obstacle.
- **weapon class** `[ready]` Defensive
- **weapon** `[ready]` Defensive; slowly forms a large shield of ice in front of the player that slowly bulks up. Short cooldown if damaged; long cooldown if destroyed by damage.
- **weapon Lv1** `[ready]` Very slow ice buildup. Full Shield blocks the equivalent of 3 minion projectile; breaks and freezes the opponent if contacting a minion instead.
- **weapon Lv3** `[ready]` Full Shield blocks the equivalent of 4 minion attacks; breaks from damage or from contact cause shield to break into 3 small ice shards that shot out from the top edge of the shield with the middle one at a 45 deg angle and side ones at 67.5 degrees and 22.5 def from the horizon; freezes the opponent if contacting a minion or the water boss.
- **weapon Lv6** `[ready]` Shield now breaks into 4 small ice shards, equally spaced but now the bottom one is 22.5deg below the horizon, and all shards pierce
- **weapon Lv10** `[wip]` Standing still briefly while holding attack forms ice armor that reflects projectiles and removes all incoming damage and knockback. Player cannot otherwise attack until the button is released.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Strike Man — Fighting

`id` strike

- **palette primary** `[ready]` #EA6A34
- **palette secondary** `[ready]` #7C2D12
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.85x player height (bulky build)
- **attack name** `[ready]` Rush Combo
- **weapon name** `[ready]` Strike Gauntlet
- **arena** `[ready]` Underground fight pit: chain-link cage walls, a stained mat floor, and a background of hanging lamps.
- **arena furniture** `[ready]` Three ceiling rails for the training bags to swing along. One bag at layer 1; two from layer 2, started at opposite ends of different rails so where they cross drifts down the room.
- **hazard L1** `[wip]` Weighted training bags travel across the room on ceiling rails at a very slow but steady pace, dealing knockback and light damage. Their path is fixed and learnable. Tops of bags can be stood on. Bags can be punched by boss to knock you off them if bags take moderate damage from
- **hazard L2** `[ready]` Two bags on crossing paths, boss has a moderate chance of pulling one down as a shield whenever taking ranged damage
- **hazard L3** `[ready]` Same as hazard l2 only now the boss will throw the bag at player for gravy damage after using as a shield.
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

`id` venom

- **palette primary** `[ready]` #A926D9
- **palette secondary** `[ready]` #84CC16
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.7x player height (average build)
- **attack name** `[ready]` Toxic Cloud
- **weapon name** `[ready]` Venom Spray
- **palette notes** `[wip]` Violet primary; lime secondary. Violet is the standard poison read; the original sickly-green primary collided with Thorn.
- **arena** `[wip]` Chemical processing floor: corroded vats, drip lines and grated walkways over a sump. Background is a bank of pressure tanks weeping green.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` quake

- **palette primary** `[ready]` #A76625
- **palette secondary** `[ready]` #EA580C
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.95x player height (bulky build)
- **attack name** `[ready]` Seismic Stomp
- **weapon name** `[ready]` Quake Hammer
- **arena** `[wip]` Deep excavation site: layered rock strata walls, timber shoring, and a background of stalled drilling rigs.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
- **hazard L1** `[wip]` The ground fissures at telegraphed points and a rock pillar rises, dealing damage on the way up and remaining as a solid obstacle until it sinks again.
- **hazard L2** `[wip]` Pillars rise in pairs, and some now rise from the ceiling downward so the safe lane is a gap rather than a floor position.
- **hazard L3** `[wip]` A rolling wave of pillars crosses the room end to end, forcing continuous movement rather than choosing a spot to stand.
- **attack L1** `[wip]` Causes screen-wide tremors and rising rock pillars.
- **attack L2** `[wip]` The stomp now sends two shockwaves in both directions, and the tremor briefly disables the player's footing so a jump has to be timed before the shake, not during it.
- **attack L3** `[wip]` The stomp collapses part of the ceiling, adding falling debris to the shockwave, and pillars raised by the arena hazard are shattered into projectiles by the wave.
- **weapon class** `[ready]` Offensive
- **weapon** `[wip]` Offensive; Large, slow, delayed baseball-swing on tap or start of long press for high damage and high knockback, long press 1.5s to visibly hold hammer overhead and on release swing downward producing shockwaves and stuns nearby enemies. Shaped like megaton hammer. Per-level scaling: shockwave size + stun duration.
- **weapon Lv1** `[wip]` Standard home run swing and grounded overhead swing as described in weapon description
- **weapon Lv3** `[wip]` Airborne swings cause the player to swing downward and rapidly travel downward where a shockwave will be generated on contact with the ground.
- **weapon Lv6** `[wip]` Lv5+: if slide mastery allows it, attacking while in slide extends the duration of the slide
- **weapon Lv10** `[wip]` Max: super stomp that causes falling debris from the ceiling.
- **silhouette** `[todo]` Deferred — silhouette follows from attack + arena design, not before it.

## Gale Man — Flying

`id` gale

- **palette primary** `[ready]` #5CADD5
- **palette secondary** `[ready]` #F8FAFC
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.5x player height (petite build)
- **attack name** `[ready]` Wind Vortex
- **weapon name** `[ready]` Gale Vortex
- **arena** `[wip]` Open turbine deck at altitude: no side walls, only railings, with slow cloud layers passing behind and a vast rotor turning in the background.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` psi

- **palette primary** `[ready]` #EA43BD
- **palette secondary** `[ready]` #F9A8D4
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.55x player height (petite build)
- **attack name** `[ready]` Mind Lift
- **weapon name** `[ready]` Psi Orb
- **arena** `[wip]` Sterile observation chamber: white panelled walls, one-way glass, and slowly rotating geometric shapes suspended in the background.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` swarm

- **palette primary** `[ready]` #B8DC28
- **palette secondary** `[ready]` #4D5C1A
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.6x player height (petite build)
- **attack name** `[ready]` Infestation
- **weapon name** `[ready]` Swarm Caller
- **arena** `[wip]` Hollowed hive interior: chambered comb walls, resin-slick floor, and a background of drifting larvae sacs.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` granite

- **palette primary** `[ready]` #5F443A
- **palette secondary** `[ready]` #A8A296
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 2.0x player height (bulky build)
- **attack name** `[ready]` Boulder Roll
- **weapon name** `[ready]` Rock Buster
- **arena** `[wip]` Quarry face: stepped stone benches, loose scree, and a background of cut rock walls with old blast scars.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` wraith

- **palette primary** `[ready]` #A68DD8
- **palette secondary** `[ready]` #2A1F4A
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.6x player height (petite build)
- **attack name** `[ready]` Spectral Shift
- **weapon name** `[ready]` Wraith Cloak
- **arena** `[wip]` Derelict chapel: broken pews, a collapsed rose window, and shafts of pale light through dust with unlit candelabra in the background.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` drake

- **palette primary** `[ready]` #C3225D
- **palette secondary** `[ready]` #6B1220
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.9x player height (bulky build)
- **attack name** `[ready]` Dragon Breath
- **weapon name** `[ready]` Drake Breath
- **arena** `[wip]` Volcanic caldera rim: basalt columns, a glowing fissure crossing the floor, and a background of ash cloud lit from below.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` eclipse

- **palette primary** `[ready]` #2A273F
- **palette secondary** `[ready]` #DC2626
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.75x player height (average build)
- **attack name** `[ready]` Shadow Bind
- **weapon name** `[ready]` Astral Cloak
- **arena** `[wip]` Moonlit ruin: toppled columns, a cracked floor mosaic, and a background of overgrown arches with light entering from a single high gap.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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

`id` alloy

- **palette primary** `[ready]` #B2BABD
- **palette secondary** `[ready]` #4B5563
- **palette outline** `[ready]` #0A0A12
- **scale** `[ready]` 1.9x player height (bulky build)
- **attack name** `[ready]` Metal Barrage
- **weapon name** `[ready]` Alloy Blade
- **arena** `[wip]` Rolling mill floor: steel plate walls, an overhead crane gantry, and a background of glowing billets on a stalled conveyor.
- **arena furniture** `[todo]` Nothing built. The room's props, platforms and moving parts — anything a hazard or an attack needs to exist in order to work.
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
- **shared** `[ready]` The object has come in contact with toxins. Faint purple hue that fades in discrete increments as the poison wears off. Mild damage with no flinch or knockback
- **boss-applied** `[ready]` Deal small damage to player in discrete 3 second intervals for 9 seconds.
- **weapon-applied** `[ready]` Deal small damage to enemy in discrete 3 second intervals for 9 seconds.

## Stun
- **shared** `[ready]` Very mild flinch with a faint yellow hue that becomes more intense with each additional stack
- **boss-applied** `[ready]` Player movement and attack speed reduced by 15 percent. Return to normal after 5 seconds unless additional Stun gets applied, resetting the 5 seconds duration. Stun stacks Using a multiplicative reduction of remaining movement and attack speed
- **weapon-applied** `[ready]` Enemy movement and attack speed reduced by 30 percent. Return to normal after 5 seconds unless additional Stun gets applied, resetting the 5 seconds duration. Stun stacks Using a multiplicative reduction of remaining speed

## Constrict
- **shared** `[ready]` Functionally the same as stun/freeze; elementally correct color hue while the target has this attribute.
- **boss-applied** `[ready]` See stun
- **weapon-applied** `[ready]` See stun

## Freeze
- **shared** `[ready]` Functionally the same as stun/constrict; elementally correct color hue while the target has this attribute.
- **boss-applied** `[ready]` See stun
- **weapon-applied** `[ready]` See stun

---

# SYSTEMS

Everything that is not one boss's slice. These are the decisions that cut across
the whole game — the protagonist, the loadout, the wheel, the room, the meta —
and they had no home here until now, which meant the biggest creative choices in
the project were the only ones that could not be audited or edited from the app.

Most of these start at `[ready]` because they describe what the game already
does. That is not a claim they are settled forever; it is the honest marker for
"built and untouched since". Edit one and the app drops it to `[wip]` like any
other field, and it becomes a thing to build rather than a thing to read.

## Player

- **palette** `[ready]` Fixed white — the three colours baked into `public/sprites/player.png`, held in `PLAYER_PALETTE` so the constant and the sheet cannot disagree. He was blue (#1565C0) for the whole placeholder era and the owner's sheet arrived white; the art wins. White is also the strongest answer to "never lose sight of the player" against arenas running from Blaze Man's dark red to Eclipse Man's near-black.
- **sprite grid** `[ready]` 24x24, the NES reference size. Twelve frames in one 288x24 sheet. The jump is registered as three one-frame clips rather than a loop, so the pose is picked from `vy` and the arc reads.
- **equipment visuals** `[ready]` What the player is carrying is told by weapon hardware DRAWN ON him, never by his colour. Live recolouring of the suit from the source boss's palette is scrubbed and must not return: a tint multiplies the whole texture, so it was quietly blocking the real three-colour art, and a protagonist whose colour changes is one you have to re-find after every re-quip.
- **collision box** `[ready]` The sprite box and the collision box are deliberately different. The silhouette changes constantly — arm cannon extends, legs tuck, slide flattens — and a hitbox that followed the art would make vulnerability change frame to frame. A stable narrower box is both precise and fair.
- **movement** `[ready]` Walk, jump, gravity, terminal velocity, slide speed and duration are the classic NES Mega Man values converted from that game's 8.8 fixed point. A known-good reference feel to tune away from, not a finished tune.
- **hazard response** `[ready]` Pits and spikes deal the same massive damage, never an instant kill, then beam the player up past the top of the screen and back down at the leftmost clear spot. The 90-frame invulnerability is preserved in full and its countdown is frozen while the beam travels.

## Loadout

- **slot budget** `[ready]` Up to two offensive positions and two defensive ones. The sidearm OCCUPIES an offensive position rather than riding above the loadout, so it is not a free extra.
- **offensive mastery** `[ready]` Rank 0 is the sidearm welded into its position. Rank 1 opens a special slot, but it or the sidearm is live, never both. Rank 2 runs both at once with the second position still the sidearm. Rank 3 frees that position — two specials, and the sidearm can be traded away.
- **defensive mastery** `[ready]` Rank 0 is no defensive row at all. Rank 1 is one slot, rank 2 is two slots with only one live, rank 3 is two slots both live.
- **class split** `[wip]` Aiming for 9 offensive and 9 defensive
- **re-quip window** `[ready]` Slots may only be rearranged after the boss defeat animation resolved, and remains freely open to adjustments until contact with boss exit door, which generated a pop-up confirming the current loadout. Switching a slotted weapon on or off is NOT gated by this — toggling which slot is active or inactive can be done at any time

## The re-quip wheel

- **in-situ mode** `[ready]` Opened by the RE-QUIP button mid-fight. Slow motion, HUD stays up, the ring is scenery at 0.16 alpha and not touchable. One tap or one diagonal swipe aims a slot or toggles it. Seven-second timeout as a dead man's handle.
- **post-boss mode** `[ready]` Opens by itself after the boss detect animation has fully resolved plus a small delay. Hard pause, while staying in the boss room after their defeat, continue to use this Post Boss mode. This mode is the only way the loadout can be rearranged. Two taps in either order — a weapon then a module, or a module then a weapon. Continue allowing adjustments until the player taps outside the wheel
- **ring layout** `[ready]` An oval, because the playfield is 224 tall and 320-480 wide. Arc positions fan out from the centre as weapons unlock, spreading at the full arc's step so a weapon lands where it will eventually live. Trades absolute position for relative position deliberately. Maintain a distinct gap between the top half and the bottom half separating offensive slots and offensive weapons vs defensive slots and defensive weapons
- **keyboard and gamepad** `[ready]` There is no way to re-quip without a mouse or a touchscreen. The in-situ wheel has Q/E/Z/C; the post-boss wheel shall have a simple cursor to cycle through the weapon you want attached and the slot you want it attached to. Repeat until escape key or jump key

## Minions

- **roster** `[ready]` Exactly two, one per plane of movement. SCRAPPER walks its span and turns at pit edges; DRIFTER drifts left while tracking the player's altitude. Bosses are events; minions are weather.
- **elites** `[ready]` The same size as their base minion — same grid, same silhouette — told apart by a gold outline. Size would be a weak tell once the ramp has been running, and sharing the grid means one piece of art covers both forms.
- **spawn ramp** `[wip]` Cadence and HP scale off elapsed SIM time, not distance. Slow motion slows the ramp too, which is intended. No ambient minions inside a boss arena. Boss may summon based on description within boss attack layer.

## HUD and controls

- **touch layout** `[ready]` Four zones. Movement is four adjacent real buttons, not an invisible band; jump and fire are separate pads so both can be held. A held input ends when the finger lifts, never when it wanders off a 44px pad.
- **keyboard** `[draft]` A/D walks, W aims up, RSHIFT fires, double tap jump to cancel into a slide, SPACE jumps, Q or E open the in-situ wheel. Q, E, ESC closes it. Esc or Enter pauses and brings up pause menu. Esc or enter key while Resume is cursored closes and unpauses. Esc closes post boss requip wheel
- **slide** `[ready]` Double-tap jump. The jump always wins the first tap — detecting a double-tap first would put latency on every jump in the game — and the second tap inside the window puts the player back where he launched and slides instead.
- **font** `[ready]` A hand-authored 5x7 bitmap font. `fold()` silently drops any glyph it lacks, so HUD strings stay inside plain uppercase, digits and spaces.
- **dev HUD** `[ready]` A `[DEV]` marker whenever dev mode is on, plus a diagnostic line carrying the build, the run's world seed, and render density with the viewport it was picked from. The marker is not switchable; the diagnostic line is.

## Meta progression

- **chips** `[ready]` Earned from score and boss kills at run end, spent on Upgrades. Score alone earns Chips, so a run that never reaches a boss still buys something.
- **upgrades** `[ready]` Eighteen permanent stat boosts bought with Chips in the Hub, split into ordinary percentage upgrades and the MASTERY ladders that unlock abilities.
- **boss layers** `[ready]` Per boss, 1 to 3, earned by lifetime clears of that boss. A layer-2 boss uses layer-2 hazards AND layer-2 attacks. Shipped behaviour clamps at 3 forever.
- **run progression** `[ready]` Weapons are earned by killing the boss that carries them. EXP is COLLECTED from enemy drops and never granted; distance grants nothing. A level is a flat 100 EXP and pauses for a card screen.

## Run structure

- **area** `[ready]` The endless procedural stream. Its background and its ground are themed to the boss whose door is coming, so the arena is foreshadowed before you reach it.
- **arena** `[ready]` Exactly one screen, walled left and right, floored and ceilinged, camera locked, no ambient minions. One screen wide matches the NES boss rooms and guarantees the whole fight stays visible.
- **door and warp** `[ready]` The door does not open into the arena, it warps you there: contact freezes everything, fades to black, builds the room behind full black, then fades back in. Nothing is ever seen half-constructed.
- **pacing targets** `[wip]` Early: about 5 minutes and 1 boss on minimal meta with weapons below Lv3, and it should feel hard. Mid: 10-15 minutes and 2-3 bosses at Lv3-6. Late: 15-35+ minutes and 4-6 bosses. Boss COUNT is the real dial, since run length is boss count. How to ramp difficulty without the player feeling it is still open.

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
| 1079 (tracker-draft/main) | `[draft]` | Post Boss requip is still popping up too early. It should pop up after the entire boss death animation has resolved. Also the wheel is closing when I did not close out off it. Also while in the boss room the player should be able to bring up the post boss wheel and requip as desired |
| 1079 (tracker-draft/main) | `[wip]` | Level 1 and level 2 grass vibe attack needs to be much quicker, like a whip,  |

# BRAINSTORM — context only, never implemented

Claude reads this to understand where the game is heading and to avoid
building things that contradict it, but **implements nothing from here and
never suggests promoting an idea**. Move something into a slice yourself when
it is ready to be real.

## Boss ideas


## Game pacing


## Play feel


## Cosmetics

