import type { GameRepository } from "./repository.js";
import type { GameRecord, GameStore } from "./gameStore.js";
import { logger } from "./logger.js";

// PLAN.md §8.5
export const FACILITATOR_HANDOFF_MS = 5 * 60 * 1000;
export const EVICTION_MS = 10 * 60 * 1000;
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
export const INACTIVE_GAME_MS = 30 * 24 * 60 * 60 * 1000;

/** Countdown: finalizes the reveal 3s after it starts, unless cleared first by a reset. */
export function scheduleCountdown(
  store: GameStore,
  gameId: string,
  endsAt: number,
  onFinalize: () => Promise<void>,
): void {
  const record = store.get(gameId);
  if (!record) return;
  if (record.countdownTimer) clearTimeout(record.countdownTimer);

  const delay = Math.max(0, endsAt - Date.now());
  record.countdownTimer = setTimeout(() => {
    onFinalize().catch((error) => logger.error({ error, gameId }, "countdown finalize failed"));
  }, delay);
}

export function clearCountdown(record: GameRecord): void {
  if (record.countdownTimer) {
    clearTimeout(record.countdownTimer);
    record.countdownTimer = null;
  }
}

/**
 * If the facilitator has had 0 connections for FACILITATOR_HANDOFF_MS, hands the role to the
 * connected player with the earliest joinedAt. If nobody is connected, the facilitator keeps
 * the role (PLAN.md §8.5).
 */
export function scheduleFacilitatorHandoff(
  store: GameStore,
  gameId: string,
  onHandoff: (newFacilitatorId: string) => Promise<void>,
): void {
  const record = store.get(gameId);
  if (!record) return;
  if (record.facilitatorHandoffTimer) clearTimeout(record.facilitatorHandoffTimer);

  record.facilitatorHandoffTimer = setTimeout(() => {
    const current = store.get(gameId);
    if (!current) return;
    const { state } = current;
    const facilitator = state.facilitatorId ? state.players[state.facilitatorId] : null;
    if (facilitator && facilitator.connections > 0) return; // facilitator reconnected; nothing to do

    const connected = Object.values(state.players)
      .filter((p) => p.connections > 0)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = connected[0];
    if (!next) return; // nobody connected; keep the current facilitator

    onHandoff(next.id).catch((error) =>
      logger.error({ error, gameId }, "facilitator handoff failed"),
    );
  }, FACILITATOR_HANDOFF_MS);
}

export function clearFacilitatorHandoff(record: GameRecord): void {
  if (record.facilitatorHandoffTimer) {
    clearTimeout(record.facilitatorHandoffTimer);
    record.facilitatorHandoffTimer = null;
  }
}

/** Evicts a game from memory after EVICTION_MS with 0 total connections (DB keeps the row). */
export function scheduleEviction(store: GameStore, gameId: string): void {
  const record = store.get(gameId);
  if (!record) return;
  if (record.evictionTimer) clearTimeout(record.evictionTimer);

  record.evictionTimer = setTimeout(() => {
    const current = store.get(gameId);
    if (!current) return;
    const totalConnections = Object.values(current.state.players).reduce(
      (sum, p) => sum + p.connections,
      0,
    );
    if (totalConnections === 0) {
      store.evict(gameId);
      logger.info({ gameId }, "evicted idle game from memory");
    }
  }, EVICTION_MS);
}

export function clearEviction(record: GameRecord): void {
  if (record.evictionTimer) {
    clearTimeout(record.evictionTimer);
    record.evictionTimer = null;
  }
}

/** Runs hourly and deletes games inactive for more than 30 days (PLAN.md §8.5). */
export function startCleanupJob(repo: GameRepository): NodeJS.Timeout {
  const run = async () => {
    try {
      const count = await repo.deleteInactive(Date.now() - INACTIVE_GAME_MS);
      if (count > 0) logger.info({ count }, "deleted inactive games");
    } catch (error) {
      logger.error({ error }, "cleanup job failed");
    }
  };
  void run();
  return setInterval(run, CLEANUP_INTERVAL_MS);
}
