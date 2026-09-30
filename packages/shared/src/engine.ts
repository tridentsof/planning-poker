import { nanoid } from "nanoid";
import type {
  EngineResult,
  ErrorCode,
  GameSettings,
  GameState,
  Issue,
  PermissionScope,
  PlayerState,
  Role,
} from "./types.js";

/** PLAN.md §7.1: `isFacilitator = state.facilitatorId === actorId`. */
function isFacilitator(state: GameState, actorId: string): boolean {
  return state.facilitatorId === actorId;
}

function hasPermission(state: GameState, actorId: string, scope: PermissionScope): boolean {
  return scope === "all" || isFacilitator(state, actorId);
}

function connectedPlayers(state: GameState): PlayerState[] {
  return Object.values(state.players).filter((p) => p.connections > 0);
}

function err(error: ErrorCode): EngineResult {
  return { error };
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

/** PLAN.md §7.2 castVote. */
export function castVote(state: GameState, actorId: string, value: string | null): EngineResult {
  const player = state.players[actorId];
  if (!player) return err("NOT_JOINED");
  if (player.role !== "player") return err("FORBIDDEN");
  if (state.status !== "voting") return err("INVALID_STATE");
  if (value !== null && !state.deck.includes(value)) return err("INVALID_PAYLOAD");

  const votes = { ...state.votes };
  if (value === null) delete votes[actorId];
  else votes[actorId] = value;

  const next: GameState = { ...state, votes };
  const persistOps: import("./types.js").PersistOp[] = [
    { type: "castVote", roundId: state.currentRoundId, playerId: actorId, value },
  ];

  if (
    state.settings.autoReveal &&
    Object.keys(votes).length > 0 &&
    connectedPlayers(next).filter((p) => p.role === "player").every((p) => p.id in votes)
  ) {
    const revealResult = reveal(next, actorId, { bypassPermission: true });
    if (!("error" in revealResult)) {
      return {
        state: revealResult.state,
        effects: [{ type: "persist", ops: persistOps }, ...revealResult.effects],
      };
    }
  }

  return { state: next, effects: [{ type: "persist", ops: persistOps }] };
}

/** PLAN.md §7.2 reveal. `opts.bypassPermission` is used internally by auto-reveal. */
export function reveal(
  state: GameState,
  actorId: string,
  opts: { bypassPermission?: boolean } = {},
): EngineResult {
  if (!opts.bypassPermission && !hasPermission(state, actorId, state.settings.whoCanReveal)) {
    return err("FORBIDDEN");
  }
  if (state.status !== "voting") return err("INVALID_STATE");
  if (Object.keys(state.votes).length < 1) return err("INVALID_STATE");

  if (state.settings.showCountdown) {
    const endsAt = Date.now() + 3000;
    const next: GameState = { ...state, status: "counting", countdownEndsAt: endsAt };
    return {
      state: next,
      effects: [
        { type: "startCountdown", endsAt },
        {
          type: "persist",
          ops: [
            {
              type: "updateGame",
              gameId: state.id,
              patch: {
                status: "counting",
                lastActivityAt: Date.now(),
              },
            },
          ],
        },
      ],
    };
  }

  return finalizeReveal(state);
}

/** PLAN.md §7.2 finalizeReveal (internal; invoked by reveal() or by the countdown timer). */
export function finalizeReveal(state: GameState): EngineResult {
  if (state.status === "voting") return err("INVALID_STATE");
  const next: GameState = { ...state, status: "revealed", countdownEndsAt: null };
  return {
    state: next,
    effects: [
      { type: "clearCountdown" },
      {
        type: "persist",
        ops: [
          {
            type: "updateGame",
            gameId: state.id,
            patch: { status: "revealed", currentRoundId: state.currentRoundId, lastActivityAt: Date.now() },
          },
          { type: "revealRound", roundId: state.currentRoundId, revealedAt: Date.now() },
        ],
      },
    ],
  };
}

/** PLAN.md §7.2 resetRound. Also used internally by selectIssue. */
export function resetRound(
  state: GameState,
  actorId: string,
  opts: { bypassPermission?: boolean } = {},
): EngineResult {
  if (!opts.bypassPermission && !hasPermission(state, actorId, state.settings.whoCanReveal)) {
    return err("FORBIDDEN");
  }
  const roundId = nanoid(12);
  const next: GameState = {
    ...state,
    votes: {},
    status: "voting",
    countdownEndsAt: null,
    currentRoundId: roundId,
  };
  return {
    state: next,
    effects: [
      { type: "clearCountdown" },
      {
        type: "persist",
        ops: [
          {
            type: "updateGame",
            gameId: state.id,
            patch: {
              status: "voting",
              currentRoundId: roundId,
              lastActivityAt: Date.now(),
            },
          },
          { type: "startRound", gameId: state.id, roundId, issueId: state.currentIssueId },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

const MAX_ISSUES = 200;

/** PLAN.md §7.2 addIssue. */
export function addIssue(
  state: GameState,
  actorId: string,
  payload: { title: string; url?: string },
): EngineResult {
  if (!hasPermission(state, actorId, state.settings.whoCanManageIssues)) return err("FORBIDDEN");
  if (state.issues.length >= MAX_ISSUES) return err("INVALID_STATE");

  const maxPosition = state.issues.reduce((m, i) => Math.max(m, i.position), -1);
  const issue: Issue = {
    id: nanoid(12),
    title: payload.title,
    url: payload.url ?? null,
    position: maxPosition + 1,
    finalEstimate: null,
    status: "pending",
  };
  const next: GameState = { ...state, issues: [...state.issues, issue] };
  return {
    state: next,
    effects: [{ type: "persist", ops: [{ type: "upsertIssue", gameId: state.id, issue }] }],
  };
}

/** PLAN.md §7.2 updateIssue. */
export function updateIssue(
  state: GameState,
  actorId: string,
  payload: { id: string; title?: string; url?: string | null },
): EngineResult {
  if (!hasPermission(state, actorId, state.settings.whoCanManageIssues)) return err("FORBIDDEN");
  const existing = state.issues.find((i) => i.id === payload.id);
  if (!existing) return err("INVALID_STATE");

  const updated: Issue = {
    ...existing,
    title: payload.title ?? existing.title,
    url: payload.url === undefined ? existing.url : payload.url,
  };
  const next: GameState = {
    ...state,
    issues: state.issues.map((i) => (i.id === updated.id ? updated : i)),
  };
  return {
    state: next,
    effects: [{ type: "persist", ops: [{ type: "upsertIssue", gameId: state.id, issue: updated }] }],
  };
}

/** PLAN.md §7.2 deleteIssue. */
export function deleteIssue(state: GameState, actorId: string, issueId: string): EngineResult {
  if (!hasPermission(state, actorId, state.settings.whoCanManageIssues)) return err("FORBIDDEN");
  if (!state.issues.some((i) => i.id === issueId)) return err("INVALID_STATE");

  const next: GameState = {
    ...state,
    issues: state.issues.filter((i) => i.id !== issueId),
    currentIssueId: state.currentIssueId === issueId ? null : state.currentIssueId,
  };
  return {
    state: next,
    effects: [
      {
        type: "persist",
        ops: [
          { type: "deleteIssue", gameId: state.id, issueId },
          ...(state.currentIssueId === issueId
            ? [
                {
                  type: "updateGame" as const,
                  gameId: state.id,
                  patch: { currentIssueId: null },
                },
              ]
            : []),
        ],
      },
    ],
  };
}

/** PLAN.md §7.2 reorderIssues. `ids` must be a permutation of existing issue ids. */
export function reorderIssues(state: GameState, actorId: string, ids: string[]): EngineResult {
  if (!hasPermission(state, actorId, state.settings.whoCanManageIssues)) return err("FORBIDDEN");

  const existingIds = state.issues.map((i) => i.id);
  const isPermutation =
    ids.length === existingIds.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => existingIds.includes(id));
  if (!isPermutation) return err("INVALID_PAYLOAD");

  const byId = new Map(state.issues.map((i) => [i.id, i]));
  const reordered = ids.map((id, position) => ({ ...byId.get(id)!, position }));
  const next: GameState = { ...state, issues: reordered };
  return {
    state: next,
    effects: [
      {
        type: "persist",
        ops: [
          {
            type: "reorderIssues",
            gameId: state.id,
            order: reordered.map((i) => ({ id: i.id, position: i.position })),
          },
        ],
      },
    ],
  };
}

/** PLAN.md §7.2 selectIssue: sets currentIssueId, then runs resetRound. */
export function selectIssue(state: GameState, actorId: string, issueId: string | null): EngineResult {
  if (!hasPermission(state, actorId, state.settings.whoCanManageIssues)) return err("FORBIDDEN");
  if (issueId !== null && !state.issues.some((i) => i.id === issueId)) return err("INVALID_STATE");

  const withIssue: GameState = { ...state, currentIssueId: issueId };
  const resetResult = resetRound(withIssue, actorId, { bypassPermission: true });
  if ("error" in resetResult) return resetResult;

  return {
    state: resetResult.state,
    effects: [
      {
        type: "persist",
        ops: [{ type: "updateGame", gameId: state.id, patch: { currentIssueId: issueId } }],
      },
      ...resetResult.effects,
    ],
  };
}

/** PLAN.md §7.2 setEstimate. */
export function setEstimate(
  state: GameState,
  actorId: string,
  payload: { id: string; value: string | null },
): EngineResult {
  if (!hasPermission(state, actorId, state.settings.whoCanManageIssues)) return err("FORBIDDEN");
  const existing = state.issues.find((i) => i.id === payload.id);
  if (!existing) return err("INVALID_STATE");
  if (payload.value !== null && !state.deck.includes(payload.value)) return err("INVALID_PAYLOAD");

  const updated: Issue = {
    ...existing,
    finalEstimate: payload.value,
    status: payload.value ? "voted" : "pending",
  };
  const next: GameState = {
    ...state,
    issues: state.issues.map((i) => (i.id === updated.id ? updated : i)),
  };
  return {
    state: next,
    effects: [{ type: "persist", ops: [{ type: "upsertIssue", gameId: state.id, issue: updated }] }],
  };
}

// ---------------------------------------------------------------------------
// Players & settings
// ---------------------------------------------------------------------------

/** PLAN.md §7.2 rename (player). */
export function renamePlayer(state: GameState, actorId: string, name: string): EngineResult {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 30) return err("INVALID_PAYLOAD");
  const player = state.players[actorId];
  if (!player) return err("NOT_JOINED");

  const updatedPlayer = { ...player, name: trimmed };
  const next: GameState = {
    ...state,
    players: { ...state.players, [actorId]: updatedPlayer },
  };
  return {
    state: next,
    effects: [{ type: "persist", ops: [{ type: "upsertPlayer", gameId: state.id, player: updatedPlayer }] }],
  };
}

/** PLAN.md §7.2 setRole. Switching to spectator deletes the player's vote. */
export function setRole(state: GameState, actorId: string, role: Role): EngineResult {
  const player = state.players[actorId];
  if (!player) return err("NOT_JOINED");

  const updatedPlayer = { ...player, role };
  const votes = { ...state.votes };
  if (role === "spectator") delete votes[actorId];

  const next: GameState = {
    ...state,
    players: { ...state.players, [actorId]: updatedPlayer },
    votes,
  };
  return {
    state: next,
    effects: [
      {
        type: "persist",
        ops: [
          { type: "upsertPlayer", gameId: state.id, player: updatedPlayer },
          { type: "castVote", roundId: state.currentRoundId, playerId: actorId, value: null },
        ],
      },
    ],
  };
}

/** PLAN.md §7.2 updateSettings. Facilitator only. */
export function updateSettings(
  state: GameState,
  actorId: string,
  partial: Partial<GameSettings>,
): EngineResult {
  if (!isFacilitator(state, actorId)) return err("FORBIDDEN");
  const settings: GameSettings = { ...state.settings, ...partial };
  const next: GameState = { ...state, settings };
  return {
    state: next,
    effects: [
      { type: "persist", ops: [{ type: "updateGame", gameId: state.id, patch: { settings } }] },
    ],
  };
}

/** PLAN.md §7.2 renameGame. Facilitator only. */
export function renameGame(state: GameState, actorId: string, name: string): EngineResult {
  if (!isFacilitator(state, actorId)) return err("FORBIDDEN");
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 60) return err("INVALID_PAYLOAD");

  const next: GameState = { ...state, name: trimmed };
  return {
    state: next,
    effects: [
      { type: "persist", ops: [{ type: "updateGame", gameId: state.id, patch: { name: trimmed } }] },
    ],
  };
}

/** PLAN.md §7.2 transferFacilitator. Facilitator only; target must exist. */
export function transferFacilitator(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
): EngineResult {
  if (!isFacilitator(state, actorId)) return err("FORBIDDEN");
  if (!state.players[targetPlayerId]) return err("INVALID_STATE");

  const next: GameState = { ...state, facilitatorId: targetPlayerId };
  return {
    state: next,
    effects: [
      {
        type: "persist",
        ops: [{ type: "updateGame", gameId: state.id, patch: { facilitatorId: targetPlayerId } }],
      },
    ],
  };
}
