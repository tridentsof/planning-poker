import { DECKS, DEFAULT_GAME_SETTINGS, type GameSettings, type GameState } from "../src/index.js";

export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: "game1",
    name: "Test Game",
    deckType: "fibonacci",
    deck: [...DECKS.fibonacci],
    facilitatorId: "p1",
    settings: { ...DEFAULT_GAME_SETTINGS } as GameSettings,
    status: "voting",
    countdownEndsAt: null,
    currentIssueId: null,
    currentRoundId: "round1",
    players: {
      p1: { id: "p1", name: "Alice", role: "player", joinedAt: 1, connections: 1 },
      p2: { id: "p2", name: "Bob", role: "player", joinedAt: 2, connections: 1 },
    },
    votes: {},
    issues: [],
    ...overrides,
  };
}
