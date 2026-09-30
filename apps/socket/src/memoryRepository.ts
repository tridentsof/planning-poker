import {
  DEFAULT_GAME_SETTINGS,
  type DeckType,
  type GameSettings,
  type GameState,
  type GameStatus,
  type Issue,
  type PersistOp,
  type PlayerState,
} from "@planning-poker/shared";
import type { CreateGameParams, GameRepository, LoadedGame } from "./repository.js";

type StoredPlayer = PlayerState & { tokenHash: string };
type StoredRound = { id: string; issueId: string | null; votes: Map<string, string>; revealedAt: number | null };

type StoredGame = {
  id: string;
  name: string;
  deckType: DeckType;
  deck: string[];
  creatorSecretHash: string;
  facilitatorId: string | null;
  settings: GameSettings;
  status: GameStatus;
  currentIssueId: string | null;
  currentRoundId: string;
  lastActivityAt: number;
  players: Map<string, StoredPlayer>;
  issues: Map<string, Issue>;
  rounds: Map<string, StoredRound>;
};

/**
 * In-memory GameRepository. Used when USE_MEMORY_REPO=true and in tests (PLAN.md §3, §8.6).
 * Not shared across processes and does not survive a restart.
 */
export class MemoryRepository implements GameRepository {
  private games = new Map<string, StoredGame>();

  async createGame(params: CreateGameParams): Promise<void> {
    const roundId = `${params.id}-r0`;
    this.games.set(params.id, {
      id: params.id,
      name: params.name,
      deckType: params.deckType,
      deck: params.deck,
      creatorSecretHash: params.creatorSecretHash,
      facilitatorId: null,
      settings: { ...DEFAULT_GAME_SETTINGS },
      status: "voting",
      currentIssueId: null,
      currentRoundId: roundId,
      lastActivityAt: Date.now(),
      players: new Map(),
      issues: new Map(),
      rounds: new Map([[roundId, { id: roundId, issueId: null, votes: new Map(), revealedAt: null }]]),
    });
  }

  async gameExists(id: string): Promise<boolean> {
    return this.games.has(id);
  }

  async loadGame(id: string): Promise<LoadedGame | null> {
    const game = this.games.get(id);
    if (!game) return null;

    const round = game.rounds.get(game.currentRoundId);
    // A "counting" status found on load becomes "revealed" (PLAN.md §8.6): there is no
    // server process left running the countdown timer, so we cannot re-arm it faithfully.
    const status: GameStatus = game.status === "counting" ? "revealed" : game.status;

    const players: Record<string, PlayerState> = {};
    const tokenHashes: Record<string, string> = {};
    for (const [playerId, p] of game.players) {
      players[playerId] = { id: p.id, name: p.name, role: p.role, joinedAt: p.joinedAt, connections: 0 };
      tokenHashes[playerId] = p.tokenHash;
    }

    const state: GameState = {
      id: game.id,
      name: game.name,
      deckType: game.deckType,
      deck: game.deck,
      facilitatorId: game.facilitatorId,
      settings: game.settings,
      status,
      countdownEndsAt: null,
      currentIssueId: game.currentIssueId,
      currentRoundId: game.currentRoundId,
      players,
      votes: round ? Object.fromEntries(round.votes) : {},
      issues: [...game.issues.values()].sort((a, b) => a.position - b.position),
    };

    return { state, tokenHashes, creatorSecretHash: game.creatorSecretHash };
  }

  async persist(gameId: string, ops: PersistOp[]): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) return;

    for (const op of ops) {
      switch (op.type) {
        case "updateGame": {
          Object.assign(game, op.patch);
          break;
        }
        case "upsertPlayer": {
          const existing = game.players.get(op.player.id);
          game.players.set(op.player.id, {
            ...op.player,
            tokenHash: op.tokenHash ?? existing?.tokenHash ?? "",
          });
          break;
        }
        case "upsertIssue": {
          game.issues.set(op.issue.id, op.issue);
          break;
        }
        case "deleteIssue": {
          game.issues.delete(op.issueId);
          break;
        }
        case "reorderIssues": {
          for (const { id, position } of op.order) {
            const issue = game.issues.get(id);
            if (issue) game.issues.set(id, { ...issue, position });
          }
          break;
        }
        case "startRound": {
          game.rounds.set(op.roundId, {
            id: op.roundId,
            issueId: op.issueId,
            votes: new Map(),
            revealedAt: null,
          });
          break;
        }
        case "castVote": {
          const round = game.rounds.get(op.roundId);
          if (round) {
            if (op.value === null) round.votes.delete(op.playerId);
            else round.votes.set(op.playerId, op.value);
          }
          break;
        }
        case "revealRound": {
          const round = game.rounds.get(op.roundId);
          if (round) round.revealedAt = op.revealedAt;
          break;
        }
      }
    }
    game.lastActivityAt = Date.now();
  }

  async deleteInactive(before: number): Promise<number> {
    let count = 0;
    for (const [id, game] of this.games) {
      if (game.lastActivityAt < before) {
        this.games.delete(id);
        count++;
      }
    }
    return count;
  }
}
