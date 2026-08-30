/**
 * THE GEN 3 TYPE CHART — the one the tracker's `boss weakness` fields answer to.
 *
 * GEN 3 SPECIFICALLY, and the generation is load-bearing rather than flavour.
 * The chart changed either side of it, and the differences are exactly the
 * places a chart written from memory goes wrong:
 *
 *   NO FAIRY. It arrives in Gen 6. Nothing here is weak to it, resists it, or
 *   deals it, and Dragon, Dark and Fighting are correspondingly one weakness
 *   lighter than a modern chart would give them.
 *
 *   STEEL RESISTS GHOST AND DARK. True from Gen 2 through Gen 5; Gen 6 removed
 *   both. This is the single most common error, because the modern chart is the
 *   one everybody has seen most recently.
 *
 *   POISON IS SUPER EFFECTIVE AGAINST GRASS AND NOTHING ELSE. Gen 1 had it beat
 *   Bug as well; that went in Gen 2. Gen 6 gave it Fairy. Gen 3 has neither.
 *
 *   BUG IS NOT VERY EFFECTIVE AGAINST POISON. The Gen 1 chart had this the
 *   other way round — Bug beat Poison — and it flipped in Gen 2.
 *
 *   GHOST BEATS PSYCHIC. In Gen 1 it did nothing at all to Psychic, which was a
 *   bug in the game rather than a design choice, and was fixed in Gen 2.
 *
 * Gen 2, 3, 4 and 5 all share one chart, so "the Gen 3 chart" and "the pre-Fairy
 * chart" are the same table. `tests/typechart.test.js` asserts every one of the
 * traps above, because the failure mode here is a table that looks right.
 *
 * WHY THE GAME CARRIES IT AT ALL. Seventeen bosses, seventeen elements, and the
 * roster is this chart's own type list with Normal replaced by Typeless. The
 * tracker's `boss weakness A` / `boss weakness B` fields are the owner choosing
 * which one or two of a boss's real weaknesses his ROOM reacts to — so the chart
 * is what makes those dropdowns a short list of correct answers instead of
 * seventeen guesses, and what lets a test say when a pick is not a weakness at
 * all. It is design data, not a battle system: nothing here multiplies damage.
 */

/** The seventeen Gen 3 types, in the National Dex's own order. */
export const TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel',
];

/**
 * ATTACKING type -> what it does to each DEFENDING type.
 *
 * Stated from the attacker's side because that is how the chart is published
 * and how it is checked; the defending view every caller actually wants is
 * DERIVED below rather than typed a second time. Two hand-written copies of one
 * table is how a chart ends up self-contradictory.
 *
 * `x2` super effective, `half` not very effective, `zero` no effect. Anything
 * not listed is neutral.
 */
export const CHART = {
  Normal: { x2: [], half: ['Rock', 'Steel'], zero: ['Ghost'] },
  Fire: { x2: ['Grass', 'Ice', 'Bug', 'Steel'], half: ['Fire', 'Water', 'Rock', 'Dragon'], zero: [] },
  Water: { x2: ['Fire', 'Ground', 'Rock'], half: ['Water', 'Grass', 'Dragon'], zero: [] },
  Electric: { x2: ['Water', 'Flying'], half: ['Electric', 'Grass', 'Dragon'], zero: ['Ground'] },
  Grass: {
    x2: ['Water', 'Ground', 'Rock'],
    half: ['Fire', 'Grass', 'Poison', 'Flying', 'Bug', 'Dragon', 'Steel'],
    zero: [],
  },
  Ice: { x2: ['Grass', 'Ground', 'Flying', 'Dragon'], half: ['Fire', 'Water', 'Ice', 'Steel'], zero: [] },
  Fighting: {
    x2: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'],
    half: ['Poison', 'Flying', 'Psychic', 'Bug'],
    zero: ['Ghost'],
  },
  // Grass and nothing else. Gen 1 added Bug, Gen 6 adds Fairy; Gen 3 has neither.
  Poison: { x2: ['Grass'], half: ['Poison', 'Ground', 'Rock', 'Ghost'], zero: ['Steel'] },
  Ground: {
    x2: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'],
    half: ['Grass', 'Bug'],
    zero: ['Flying'],
  },
  Flying: { x2: ['Grass', 'Fighting', 'Bug'], half: ['Electric', 'Rock', 'Steel'], zero: [] },
  Psychic: { x2: ['Fighting', 'Poison'], half: ['Psychic', 'Steel'], zero: ['Dark'] },
  // NOT super effective against Poison — that was the Gen 1 chart, reversed in
  // Gen 2. Bug is resisted by Poison here.
  Bug: {
    x2: ['Grass', 'Psychic', 'Dark'],
    half: ['Fire', 'Fighting', 'Poison', 'Flying', 'Ghost', 'Steel'],
    zero: [],
  },
  Rock: { x2: ['Fire', 'Ice', 'Flying', 'Bug'], half: ['Fighting', 'Ground', 'Steel'], zero: [] },
  // Beats Psychic (a Gen 2 fix), and is RESISTED BY STEEL, which stops being
  // true in Gen 6.
  Ghost: { x2: ['Psychic', 'Ghost'], half: ['Dark', 'Steel'], zero: ['Normal'] },
  Dragon: { x2: ['Dragon'], half: ['Steel'], zero: [] },
  // Also resisted by Steel until Gen 6.
  Dark: { x2: ['Psychic', 'Ghost'], half: ['Fighting', 'Dark', 'Steel'], zero: [] },
  Steel: { x2: ['Ice', 'Rock'], half: ['Fire', 'Water', 'Electric', 'Steel'], zero: [] },
};

/**
 * What a defending type takes DOUBLE damage from — the chart read the other way.
 *
 * Derived from `CHART` rather than written out, so the two views cannot drift.
 * Sorted into `TYPES` order so a boss's weaknesses always read in the same
 * sequence, which is what makes the tracker's dropdown predictable.
 */
export const weaknessesOf = (type) => TYPES.filter(
  (atk) => CHART[atk]?.x2.includes(type),
);

/** What it takes half damage from. Not used by the game yet; the chart's other half. */
export const resistsOf = (type) => TYPES.filter((atk) => CHART[atk]?.half.includes(type));

/** What cannot touch it at all. */
export const immuneTo = (type) => TYPES.filter((atk) => CHART[atk]?.zero.includes(type));

/**
 * TYPELESS IS NOT A TYPE, and Proto Mk0 is the only one who has it.
 *
 * He stands in Normal's place on the roster — seventeen bosses, seventeen types,
 * Normal swapped out — but he is deliberately NOT Normal: he is the prototype
 * chassis, the first boss a new save meets, and giving him an elemental
 * weakness would teach the type chart in the one fight that exists to teach
 * movement. `weaknessesOf` answers with an empty list for him, which is the
 * honest answer rather than a special case at every call site.
 */
export const ELEMENTLESS = 'Typeless';
