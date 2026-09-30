import type { DeckType } from "./decks.js";

export type Role = "player" | "spectator";
export type GameStatus = "voting" | "counting" | "revealed";
export type PermissionScope = "all" | "facilitator";
export type IssueStatus = "pending" | "voted";
export type ErrorCode =
  | "GAME_NOT_FOUND"
  | "INVALID_PAYLOAD"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "RATE_LIMITED"
  | "NOT_JOINED";

export type GameSettings = {
  whoCanReveal: PermissionScope;
  whoCanManageIssues: PermissionScope;
  showAverage: boolean;
  showCountdown: boolean;
  autoReveal: boolean;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  whoCanReveal: "all",
  whoCanManageIssues: "all",
  showAverage: true,
  showCountdown: true,
  autoReveal: false,
};

export type Issue = {
  id: string;
  title: string;
  url: string | null;
  position: number;
  finalEstimate: string | null;
  status: IssueStatus;
};

export type PlayerState = {
  id: string;
  name: string;
  role: Role;
  joinedAt: number;
  connections: number;
};

/**
 * Server-internal authoritative state. Never sent to a client as-is; see toSnapshot() in
 * snapshot.ts, which is the only function permitted to build client-facing payloads
 * (PLAN.md §6, invariant in §0 rule 4).
 */
export type GameState = {
  id: string;
  name: string;
  deckType: DeckType;
  deck: string[];
  facilitatorId: string | null;
  settings: GameSettings;
  status: GameStatus;
  countdownEndsAt: number | null;
  currentIssueId: string | null;
  currentRoundId: string;
  players: Record<string, PlayerState>;
  votes: Record<string, string>;
  issues: Issue[];
};

export type PlayerView = {
  id: string;
  name: string;
  role: Role;
  isFacilitator: boolean;
  connected: boolean;
  hasVoted: boolean;
  vote: string | null;
};

export type Results = {
  average: number | null;
  distribution: { value: string; count: number }[];
  agreement: number;
  consensus: boolean;
  suggested: string | null;
};

export type GameSnapshot = {
  id: string;
  name: string;
  deck: string[];
  deckType: DeckType;
  settings: GameSettings;
  facilitatorId: string | null;
  status: GameStatus;
  countdownEndsAt: number | null;
  currentIssueId: string | null;
  issues: Issue[];
  players: PlayerView[];
  results: Results | null;
};

/** Instructions returned by engine functions for the caller (socket server) to perform. */
export type Effect =
  | { type: "startCountdown"; endsAt: number }
  | { type: "clearCountdown" }
  | { type: "persist"; ops: PersistOp[] };

export type PersistOp =
  | { type: "updateGame"; gameId: string; patch: Partial<PersistableGamePatch> }
  | { type: "upsertPlayer"; gameId: string; player: PlayerState; tokenHash?: string }
  | { type: "upsertIssue"; gameId: string; issue: Issue }
  | { type: "deleteIssue"; gameId: string; issueId: string }
  | { type: "reorderIssues"; gameId: string; order: { id: string; position: number }[] }
  | { type: "startRound"; gameId: string; roundId: string; issueId: string | null }
  | { type: "castVote"; roundId: string; playerId: string; value: string | null }
  | { type: "revealRound"; roundId: string; revealedAt: number };

export type PersistableGamePatch = {
  name: string;
  facilitatorId: string | null;
  settings: GameSettings;
  status: GameStatus;
  currentIssueId: string | null;
  currentRoundId: string;
  lastActivityAt: number;
};

export type EngineResult = { state: GameState; effects: Effect[] } | { error: ErrorCode };

export function isEngineError(result: EngineResult): result is { error: ErrorCode } {
  return "error" in result;
}
