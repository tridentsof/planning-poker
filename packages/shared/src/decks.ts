/** Card deck definitions. See PLAN.md §4. */

export const DECKS = {
  fibonacci: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"],
  modifiedFibonacci: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
  tshirt: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
  powersOfTwo: ["0", "1", "2", "4", "8", "16", "32", "64", "?", "☕"],
} as const satisfies Record<string, readonly string[]>;

export type StandardDeckType = keyof typeof DECKS;
export type DeckType = StandardDeckType | "custom";

// Kept as an explicit tuple (rather than derived from DECKS) so Zod sees literal types.
// Must list every key of DECKS plus "custom"; the assertion below fails to compile otherwise.
export const DECK_TYPES: [DeckType, ...DeckType[]] = [
  "fibonacci",
  "modifiedFibonacci",
  "tshirt",
  "powersOfTwo",
  "custom",
];
type AssertAllDeckTypesCovered = StandardDeckType extends (typeof DECK_TYPES)[number]
  ? true
  : ["DECK_TYPES is missing a key of DECKS"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertAllDeckTypesCovered: AssertAllDeckTypesCovered = true;

/** Card value constraints for a custom deck (PLAN.md §4). */
export const CUSTOM_DECK_MIN_CARDS = 2;
export const CUSTOM_DECK_MAX_CARDS = 20;
export const CUSTOM_DECK_MAX_CARD_LENGTH = 4;

/**
 * Parses a comma-separated custom deck string into a validated, trimmed list of unique cards.
 * Returns null if the input does not satisfy the constraints in PLAN.md §4.
 */
export function parseCustomDeck(input: string): string[] | null {
  const values = input
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  if (values.length < CUSTOM_DECK_MIN_CARDS || values.length > CUSTOM_DECK_MAX_CARDS) {
    return null;
  }
  if (values.some((v) => v.length > CUSTOM_DECK_MAX_CARD_LENGTH)) {
    return null;
  }
  const unique = new Set(values);
  if (unique.size !== values.length) {
    return null;
  }
  return values;
}

export function getDeck(deckType: DeckType, customDeck?: string[]): string[] | null {
  if (deckType === "custom") {
    return customDeck && customDeck.length > 0 ? customDeck : null;
  }
  return [...DECKS[deckType]];
}

/**
 * Numeric value of a card, per PLAN.md §4: "½" -> 0.5, a finite number string -> that number,
 * anything else (e.g. "?", "☕", t-shirt sizes) -> non-numeric (returns null).
 */
export function numericValue(card: string): number | null {
  if (card === "½") return 0.5;
  const n = Number(card);
  return Number.isFinite(n) && card.trim() !== "" ? n : null;
}
