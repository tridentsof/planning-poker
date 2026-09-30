import { computeResults } from "./results.js";
import type { GameSnapshot, GameState, PlayerView } from "./types.js";

/**
 * The ONLY function permitted to build a client-facing payload from server state.
 * Must hide votes and results unless status === "revealed" (PLAN.md §0 rule 4, §6).
 */
export function toSnapshot(state: GameState): GameSnapshot {
  const revealed = state.status === "revealed";

  const players: PlayerView[] = Object.values(state.players)
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => {
      const hasVoted = p.id in state.votes;
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        isFacilitator: state.facilitatorId === p.id,
        connected: p.connections > 0,
        hasVoted,
        vote: revealed && hasVoted ? state.votes[p.id]! : null,
      };
    });

  return {
    id: state.id,
    name: state.name,
    deck: state.deck,
    deckType: state.deckType,
    settings: state.settings,
    facilitatorId: state.facilitatorId,
    status: state.status,
    countdownEndsAt: state.countdownEndsAt,
    currentIssueId: state.currentIssueId,
    issues: state.issues,
    players,
    results: revealed ? computeResults(state.votes, state.deck, state.deckType) : null,
  };
}
