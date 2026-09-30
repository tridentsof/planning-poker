import { describe, expect, it } from "vitest";
import {
  addIssue,
  castVote,
  deleteIssue,
  isEngineError,
  reorderIssues,
  resetRound,
  reveal,
  selectIssue,
  updateSettings,
} from "../src/index.js";
import { makeState } from "./helpers.js";

describe("castVote", () => {
  it("rejects spectators", () => {
    const state = makeState({
      players: {
        p1: { id: "p1", name: "Alice", role: "spectator", joinedAt: 1, connections: 1 },
      },
    });
    const result = castVote(state, "p1", "5");
    expect(isEngineError(result) && result.error).toBe("FORBIDDEN");
  });

  it("rejects values not in the deck", () => {
    const state = makeState();
    const result = castVote(state, "p1", "not-a-card");
    expect(isEngineError(result) && result.error).toBe("INVALID_PAYLOAD");
  });

  it("rejects votes while revealed", () => {
    const state = makeState({ status: "revealed" });
    const result = castVote(state, "p1", "5");
    expect(isEngineError(result) && result.error).toBe("INVALID_STATE");
  });

  it("auto-reveals only once all connected players have voted", () => {
    const state = makeState({
      settings: { ...makeState().settings, autoReveal: true },
      players: {
        p1: { id: "p1", name: "Alice", role: "player", joinedAt: 1, connections: 1 },
        p2: { id: "p2", name: "Bob", role: "player", joinedAt: 2, connections: 1 },
      },
    });

    const afterP1 = castVote(state, "p1", "5");
    if (isEngineError(afterP1)) throw new Error("unexpected error");
    expect(afterP1.state.status).toBe("voting"); // p2 has not voted yet

    const afterP2 = castVote(afterP1.state, "p2", "8");
    if (isEngineError(afterP2)) throw new Error("unexpected error");
    // showCountdown defaults to true, so it transitions to "counting" first.
    expect(afterP2.state.status).toBe("counting");
  });

  it("auto-reveals based on connected players only, ignoring a disconnected non-voter", () => {
    const state = makeState({
      settings: { ...makeState().settings, autoReveal: true },
      players: {
        p1: { id: "p1", name: "Alice", role: "player", joinedAt: 1, connections: 1 },
        p2: { id: "p2", name: "Bob", role: "player", joinedAt: 2, connections: 0 },
      },
    });
    const afterP1 = castVote(state, "p1", "5");
    if (isEngineError(afterP1)) throw new Error("unexpected error");
    // p2 is disconnected and thus excluded from the "all connected players voted" check,
    // but p1's vote alone should still trigger auto-reveal (only connected players count).
    expect(afterP1.state.status).toBe("counting");
  });
});

describe("permissions", () => {
  it("reveal: 'all' permits a non-facilitator", () => {
    const state = makeState({ votes: { p1: "5" } });
    const result = reveal(state, "p2");
    expect(isEngineError(result)).toBe(false);
  });

  it("reveal: 'facilitator' forbids a non-facilitator", () => {
    const state = makeState({
      votes: { p1: "5" },
      settings: { ...makeState().settings, whoCanReveal: "facilitator" },
    });
    const result = reveal(state, "p2");
    expect(isEngineError(result) && result.error).toBe("FORBIDDEN");
    const asFacilitator = reveal(state, "p1");
    expect(isEngineError(asFacilitator)).toBe(false);
  });

  it("resetRound respects the same whoCanReveal permission", () => {
    const state = makeState({
      settings: { ...makeState().settings, whoCanReveal: "facilitator" },
    });
    expect(isEngineError(resetRound(state, "p2")) && true).toBe(true);
    expect(isEngineError(resetRound(state, "p1"))).toBe(false);
  });

  it("issue operations respect whoCanManageIssues", () => {
    const state = makeState({
      settings: { ...makeState().settings, whoCanManageIssues: "facilitator" },
    });
    expect(isEngineError(addIssue(state, "p2", { title: "Story 1" }))).toBe(true);
    expect(isEngineError(addIssue(state, "p1", { title: "Story 1" }))).toBe(false);
  });

  it("updateSettings is facilitator-only regardless of whoCanManageIssues", () => {
    const state = makeState();
    expect(isEngineError(updateSettings(state, "p2", { showAverage: false }))).toBe(true);
    expect(isEngineError(updateSettings(state, "p1", { showAverage: false }))).toBe(false);
  });
});

describe("reorderIssues", () => {
  it("rejects an array that is not a permutation of existing ids", () => {
    const state = makeState({
      issues: [
        { id: "i1", title: "A", url: null, position: 0, finalEstimate: null, status: "pending" },
        { id: "i2", title: "B", url: null, position: 1, finalEstimate: null, status: "pending" },
      ],
    });
    const missing = reorderIssues(state, "p1", ["i1"]);
    expect(isEngineError(missing) && missing.error).toBe("INVALID_PAYLOAD");

    const unknown = reorderIssues(state, "p1", ["i1", "i2", "i3"]);
    expect(isEngineError(unknown) && unknown.error).toBe("INVALID_PAYLOAD");

    const dup = reorderIssues(state, "p1", ["i1", "i1"]);
    expect(isEngineError(dup) && dup.error).toBe("INVALID_PAYLOAD");

    const ok = reorderIssues(state, "p1", ["i2", "i1"]);
    expect(isEngineError(ok)).toBe(false);
  });
});

describe("selectIssue", () => {
  it("resets the current round's votes", () => {
    const state = makeState({
      votes: { p1: "5" },
      issues: [
        { id: "i1", title: "A", url: null, position: 0, finalEstimate: null, status: "pending" },
      ],
    });
    const result = selectIssue(state, "p1", "i1");
    if (isEngineError(result)) throw new Error("unexpected error");
    expect(result.state.currentIssueId).toBe("i1");
    expect(result.state.votes).toEqual({});
    expect(result.state.status).toBe("voting");
    expect(result.state.currentRoundId).not.toBe(state.currentRoundId);
  });
});

describe("deleteIssue", () => {
  it("clears currentIssueId when the current issue is deleted", () => {
    const state = makeState({
      currentIssueId: "i1",
      issues: [
        { id: "i1", title: "A", url: null, position: 0, finalEstimate: null, status: "pending" },
      ],
    });
    const result = deleteIssue(state, "p1", "i1");
    if (isEngineError(result)) throw new Error("unexpected error");
    expect(result.state.currentIssueId).toBeNull();
  });
});
