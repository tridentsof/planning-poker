import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
  addIssue,
  castVote,
  deleteIssue,
  facilitatorTransferSchema,
  finalizeReveal,
  gameJoinSchema,
  gameRenameSchema,
  gameUpdateSettingsSchema,
  issueAddSchema,
  issueDeleteSchema,
  issueReorderSchema,
  issueSelectSchema,
  issueSetEstimateSchema,
  issueUpdateSchema,
  playerRenameSchema,
  playerSetRoleSchema,
  renameGame,
  renamePlayer,
  reorderIssues,
  resetRound,
  reveal,
  selectIssue,
  setEstimate,
  setRole,
  toSnapshot,
  transferFacilitator,
  updateIssue,
  updateSettings,
  voteCastSchema,
  type ClientToServerEvents,
  type Effect,
  type ErrorCode,
  type EngineResult,
  type GameState,
  type ServerToClientEvents,
} from "@planning-poker/shared";
import type { ZodSchema } from "zod";
import { generateToken, hashSecret, verifySecret } from "./auth.js";
import type { GameStore } from "./gameStore.js";
import {
  clearCountdown,
  clearEviction,
  clearFacilitatorHandoff,
  scheduleCountdown,
  scheduleEviction,
  scheduleFacilitatorHandoff,
} from "./timers.js";
import { socketEventLimiter } from "./rateLimit.js";
import { logger } from "./logger.js";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type SocketData = { gameId?: string; playerId?: string };

function broadcast(io: IOServer, gameId: string, state: GameState): void {
  io.to(gameId).emit("game:state", toSnapshot(state));
}

function emitError(socket: IOSocket, code: ErrorCode, message?: string): void {
  socket.emit("error", { code, message: message ?? code });
}

/** Applies engine effects: persistence, countdown scheduling, or clearing (PLAN.md §8.4, §8.5). */
async function applyEffects(
  io: IOServer,
  store: GameStore,
  gameId: string,
  effects: Effect[],
): Promise<void> {
  for (const effect of effects) {
    if (effect.type === "persist") {
      await store.repository.persist(gameId, effect.ops);
    } else if (effect.type === "startCountdown") {
      scheduleCountdown(store, gameId, effect.endsAt, () => finalizeAndBroadcast(io, store, gameId));
    } else if (effect.type === "clearCountdown") {
      const record = store.get(gameId);
      if (record) clearCountdown(record);
    }
  }
}

async function finalizeAndBroadcast(io: IOServer, store: GameStore, gameId: string): Promise<void> {
  await store.enqueue(gameId, async () => {
    const record = store.get(gameId);
    if (!record) return;
    const result = finalizeReveal(record.state);
    if ("error" in result) return;
    store.setState(gameId, result.state);
    await applyEffects(io, store, gameId, result.effects);
    broadcast(io, gameId, result.state);
  });
}

/**
 * Runs an engine mutation for `gameId`, serialized through the per-game queue, then persists,
 * applies timer effects, and broadcasts the resulting snapshot (PLAN.md §8.4).
 */
async function runMutation(
  io: IOServer,
  store: GameStore,
  socket: IOSocket,
  gameId: string,
  fn: (state: GameState) => EngineResult,
): Promise<void> {
  await store.enqueue(gameId, async () => {
    const record = store.get(gameId);
    if (!record) {
      emitError(socket, "GAME_NOT_FOUND");
      return;
    }
    const result = fn(record.state);
    if ("error" in result) {
      emitError(socket, result.error);
      return;
    }
    store.setState(gameId, result.state);
    await applyEffects(io, store, gameId, result.effects);
    broadcast(io, gameId, result.state);
  });
}

/**
 * Wraps a mutation event listener with the pipeline required by PLAN.md §8.4: rate limit,
 * require a prior join, validate the payload with Zod, then hand off to the engine.
 */
function guardedMutation<P>(
  io: IOServer,
  store: GameStore,
  socket: IOSocket,
  schema: ZodSchema<P>,
  engineCall: (state: GameState, actorId: string, payload: P) => EngineResult,
): (payload: P) => Promise<void> {
  return async (payload: P) => {
    if (!socketEventLimiter.consume(socket.id)) {
      emitError(socket, "RATE_LIMITED");
      return;
    }
    const data = socket.data as SocketData;
    if (!data.gameId || !data.playerId) {
      emitError(socket, "NOT_JOINED");
      return;
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      emitError(socket, "INVALID_PAYLOAD", parsed.error.message);
      return;
    }
    await runMutation(io, store, socket, data.gameId, (state) =>
      engineCall(state, data.playerId!, parsed.data),
    );
  };
}

/** Same as guardedMutation but for events with no payload (reveal, reset). */
function guardedAction(
  io: IOServer,
  store: GameStore,
  socket: IOSocket,
  engineCall: (state: GameState, actorId: string) => EngineResult,
): () => Promise<void> {
  return async () => {
    if (!socketEventLimiter.consume(socket.id)) {
      emitError(socket, "RATE_LIMITED");
      return;
    }
    const data = socket.data as SocketData;
    if (!data.gameId || !data.playerId) {
      emitError(socket, "NOT_JOINED");
      return;
    }
    await runMutation(io, store, socket, data.gameId, (state) => engineCall(state, data.playerId!));
  };
}

export function registerSocketHandlers(io: IOServer, store: GameStore): void {
  io.on("connection", (socket: IOSocket) => {
    socket.data = {} as SocketData;

    socket.on("game:join", async (payload, ack) => {
      if (!socketEventLimiter.consume(socket.id)) {
        ack({ ok: false, error: "RATE_LIMITED" });
        return;
      }
      const parsed = gameJoinSchema.safeParse(payload);
      if (!parsed.success) {
        ack({ ok: false, error: "INVALID_PAYLOAD" });
        return;
      }
      const { gameId, name, role, playerToken, creatorSecret } = parsed.data;

      await store.enqueue(gameId, async () => {
        const record = await store.getOrLoad(gameId);
        if (!record) {
          ack({ ok: false, error: "GAME_NOT_FOUND" });
          return;
        }

        // PLAN.md §8.3 step 2: reuse an existing player if the token matches; otherwise create one.
        let playerId: string | null = null;
        let token = playerToken;
        if (playerToken) {
          const tokenHash = hashSecret(playerToken);
          for (const [pid, hash] of record.tokenHashes) {
            if (hash === tokenHash) {
              playerId = pid;
              break;
            }
          }
        }

        let state = record.state;
        const persistOps: import("@planning-poker/shared").PersistOp[] = [];

        if (playerId) {
          const existing = state.players[playerId]!;
          const updated = { ...existing, name, connections: existing.connections + 1 };
          state = { ...state, players: { ...state.players, [playerId]: updated } };
          persistOps.push({ type: "upsertPlayer", gameId, player: updated });
        } else {
          playerId = nanoid(12);
          token = generateToken();
          const tokenHash = hashSecret(token);
          const newPlayer = { id: playerId, name, role, joinedAt: Date.now(), connections: 1 };
          state = { ...state, players: { ...state.players, [playerId]: newPlayer } };
          record.tokenHashes.set(playerId, tokenHash);
          persistOps.push({ type: "upsertPlayer", gameId, player: newPlayer, tokenHash });
        }

        // PLAN.md §8.3 step 3: the creator secret grants facilitator if nobody holds it yet.
        if (
          state.facilitatorId === null &&
          creatorSecret &&
          verifySecret(creatorSecret, record.creatorSecretHash)
        ) {
          state = { ...state, facilitatorId: playerId };
          persistOps.push({ type: "updateGame", gameId, patch: { facilitatorId: playerId } });
        }

        store.setState(gameId, state);
        if (persistOps.length > 0) {
          await store.repository.persist(gameId, persistOps);
        }

        clearEviction(record);
        clearFacilitatorHandoff(record);

        socket.data = { gameId, playerId } as SocketData;
        await socket.join(gameId);

        ack({ ok: true, playerId, playerToken: token! });
        broadcast(io, gameId, state);
      });
    });

    socket.on("vote:cast", guardedMutation(io, store, socket, voteCastSchema, (s, a, p) => castVote(s, a, p.value)));
    socket.on("round:reveal", guardedAction(io, store, socket, (s, a) => reveal(s, a)));
    socket.on("round:reset", guardedAction(io, store, socket, (s, a) => resetRound(s, a)));
    socket.on("issue:add", guardedMutation(io, store, socket, issueAddSchema, addIssue));
    socket.on("issue:update", guardedMutation(io, store, socket, issueUpdateSchema, updateIssue));
    socket.on(
      "issue:delete",
      guardedMutation(io, store, socket, issueDeleteSchema, (s, a, p) => deleteIssue(s, a, p.id)),
    );
    socket.on(
      "issue:reorder",
      guardedMutation(io, store, socket, issueReorderSchema, (s, a, p) => reorderIssues(s, a, p.ids)),
    );
    socket.on(
      "issue:select",
      guardedMutation(io, store, socket, issueSelectSchema, (s, a, p) => selectIssue(s, a, p.id)),
    );
    socket.on("issue:setEstimate", guardedMutation(io, store, socket, issueSetEstimateSchema, setEstimate));
    socket.on(
      "player:rename",
      guardedMutation(io, store, socket, playerRenameSchema, (s, a, p) => renamePlayer(s, a, p.name)),
    );
    socket.on(
      "player:setRole",
      guardedMutation(io, store, socket, playerSetRoleSchema, (s, a, p) => setRole(s, a, p.role)),
    );
    socket.on("game:updateSettings", guardedMutation(io, store, socket, gameUpdateSettingsSchema, updateSettings));
    socket.on(
      "game:rename",
      guardedMutation(io, store, socket, gameRenameSchema, (s, a, p) => renameGame(s, a, p.name)),
    );
    socket.on(
      "facilitator:transfer",
      guardedMutation(io, store, socket, facilitatorTransferSchema, (s, a, p) =>
        transferFacilitator(s, a, p.playerId),
      ),
    );

    socket.on("disconnect", () => {
      socketEventLimiter.delete(socket.id);
      const data = socket.data as SocketData;
      if (!data.gameId || !data.playerId) return;
      const { gameId, playerId } = data;

      void store.enqueue(gameId, async () => {
        const record = store.get(gameId);
        if (!record) return;
        const player = record.state.players[playerId];
        if (!player) return;

        const updated = { ...player, connections: Math.max(0, player.connections - 1) };
        const state: GameState = {
          ...record.state,
          players: { ...record.state.players, [playerId]: updated },
        };
        store.setState(gameId, state);
        await store.repository.persist(gameId, [{ type: "upsertPlayer", gameId, player: updated }]);
        broadcast(io, gameId, state);

        if (state.facilitatorId === playerId) {
          scheduleFacilitatorHandoff(store, gameId, async (newFacilitatorId) => {
            await runFacilitatorHandoff(io, store, gameId, newFacilitatorId);
          });
        }

        const totalConnections = Object.values(state.players).reduce((sum, p) => sum + p.connections, 0);
        if (totalConnections === 0) {
          scheduleEviction(store, gameId);
        }
      }).catch((error) => logger.error({ error, gameId, playerId }, "disconnect handling failed"));
    });
  });
}

async function runFacilitatorHandoff(
  io: IOServer,
  store: GameStore,
  gameId: string,
  newFacilitatorId: string,
): Promise<void> {
  await store.enqueue(gameId, async () => {
    const record = store.get(gameId);
    if (!record) return;
    const state: GameState = { ...record.state, facilitatorId: newFacilitatorId };
    store.setState(gameId, state);
    await store.repository.persist(gameId, [
      { type: "updateGame", gameId, patch: { facilitatorId: newFacilitatorId } },
    ]);
    broadcast(io, gameId, state);
  });
}
