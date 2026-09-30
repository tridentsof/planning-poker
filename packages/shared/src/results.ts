import { numericValue, type DeckType } from "./decks.js";
import type { Results } from "./types.js";

/**
 * Computes voting results from the current round's votes. See PLAN.md §7.3.
 * `deck` gives the deck's card order, used as a distribution tie-break and to find the
 * closest numeric card for `suggested`.
 */
export function computeResults(
  votes: Record<string, string>,
  deck: string[],
  deckType: DeckType,
): Results {
  const values = Object.values(votes);
  const voterCount = values.length;

  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const deckOrder = new Map(deck.map((card, i) => [card, i]));
  const distribution = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (deckOrder.get(a.value) ?? 0) - (deckOrder.get(b.value) ?? 0);
    });

  const topCount = distribution[0]?.count ?? 0;
  const agreement = voterCount > 0 ? topCount / voterCount : 0;
  const consensus = distribution.length === 1;

  const numericVotes = values
    .map((v) => numericValue(v))
    .filter((n): n is number => n !== null);
  const average =
    deckType === "tshirt" || numericVotes.length === 0
      ? null
      : Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10;

  let suggested: string | null = null;
  if (average !== null) {
    const numericCards = deck
      .map((card) => ({ card, n: numericValue(card) }))
      .filter((c): c is { card: string; n: number } => c.n !== null);
    if (numericCards.length > 0) {
      let best = numericCards[0]!;
      let bestDist = Math.abs(best.n - average);
      for (const c of numericCards.slice(1)) {
        const dist = Math.abs(c.n - average);
        // Ties choose the higher card (PLAN.md §7.3).
        if (dist < bestDist || (dist === bestDist && c.n > best.n)) {
          best = c;
          bestDist = dist;
        }
      }
      suggested = best.card;
    }
  } else if (distribution.length > 0) {
    suggested = distribution[0]!.value;
  }

  return { average, distribution, agreement, consensus, suggested };
}
