import type { DeckType, GameState, PersistOp } from "@planning-poker/shared";

export type CreateGameParams = {
  id: string;
  name: string;
  deckType: DeckType;
  deck: string[];
  creatorSecretHash: string;
};

/** A freshly loaded game plus the auth material needed by the join flow (PLAN.md §8.3, §8.6). */
export type LoadedGame = {
  state: GameState;
  /** playerId -> sha256(playerToken), used to reunite a reconnecting client with their seat. */
  tokenHashes: Record<string, string>;
  creatorSecretHash: string;
};

/** PLAN.md §8.6. */
export interface GameRepository {
  createGame(params: CreateGameParams): Promise<void>;
  gameExists(id: string): Promise<boolean>;
  loadGame(id: string): Promise<LoadedGame | null>;
  persist(gameId: string, ops: PersistOp[]): Promise<void>;
  /** Deletes games whose lastActivityAt is before the given epoch ms. Returns the count deleted. */
  deleteInactive(before: number): Promise<number>;
}
