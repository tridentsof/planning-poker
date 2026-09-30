import type { GameState } from "@planning-poker/shared";
import type { GameRepository } from "./repository.js";

export type GameRecord = {
  state: GameState;
  /** playerId -> sha256(playerToken), for reconnection (PLAN.md §8.3). */
  tokenHashes: Map<string, string>;
  creatorSecretHash: string;
  /** Per-game promise queue: mutations for the same game are processed sequentially (PLAN.md §8.4). */
  queue: Promise<unknown>;
  countdownTimer: NodeJS.Timeout | null;
  facilitatorHandoffTimer: NodeJS.Timeout | null;
  evictionTimer: NodeJS.Timeout | null;
};

/**
 * In-memory Map<gameId, GameState> with load-on-demand and idle eviction (PLAN.md §3, §8.5).
 * The GameRepository is the source of truth on a cold load; after that this store is
 * authoritative until the game is evicted.
 */
export class GameStore {
  private games = new Map<string, GameRecord>();

  constructor(private readonly repo: GameRepository) {}

  get(gameId: string): GameRecord | undefined {
    return this.games.get(gameId);
  }

  has(gameId: string): boolean {
    return this.games.has(gameId);
  }

  /** Loads a game into memory if it is not already cached. Returns null if it does not exist. */
  async getOrLoad(gameId: string): Promise<GameRecord | null> {
    const cached = this.games.get(gameId);
    if (cached) return cached;

    const loaded = await this.repo.loadGame(gameId);
    if (!loaded) return null;

    const record: GameRecord = {
      state: loaded.state,
      tokenHashes: new Map(Object.entries(loaded.tokenHashes)),
      creatorSecretHash: loaded.creatorSecretHash,
      queue: Promise.resolve(),
      countdownTimer: null,
      facilitatorHandoffTimer: null,
      evictionTimer: null,
    };
    this.games.set(gameId, record);
    return record;
  }

  setState(gameId: string, state: GameState): void {
    const record = this.games.get(gameId);
    if (record) record.state = state;
  }

  /**
   * Runs `task` after any previously enqueued task for this game has settled, guaranteeing
   * mutations for the same game never run concurrently (PLAN.md §8.4).
   */
  enqueue<T>(gameId: string, task: () => Promise<T>): Promise<T> {
    const record = this.games.get(gameId);
    if (!record) return task();

    const run = record.queue.then(task, task);
    // Swallow errors for queue-chaining purposes only; callers still observe the real rejection.
    record.queue = run.catch(() => undefined);
    return run;
  }

  evict(gameId: string): void {
    const record = this.games.get(gameId);
    if (!record) return;
    if (record.countdownTimer) clearTimeout(record.countdownTimer);
    if (record.facilitatorHandoffTimer) clearTimeout(record.facilitatorHandoffTimer);
    if (record.evictionTimer) clearTimeout(record.evictionTimer);
    this.games.delete(gameId);
  }

  get repository(): GameRepository {
    return this.repo;
  }
}
