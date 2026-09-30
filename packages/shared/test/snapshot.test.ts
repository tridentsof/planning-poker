import { describe, expect, it } from "vitest";
import { toSnapshot } from "../src/index.js";
import { makeState } from "./helpers.js";

describe("toSnapshot", () => {
  it("hides votes and results while voting", () => {
    const state = makeState({ votes: { p1: "5" } });
    const snap = toSnapshot(state);
    expect(snap.results).toBeNull();
    const p1 = snap.players.find((p) => p.id === "p1")!;
    expect(p1.hasVoted).toBe(true);
    expect(p1.vote).toBeNull();
    // The raw serialized payload must never contain the vote's value while hidden
    // (the deck listing itself legitimately contains the string "5", so check the
    // specific field shape instead of a bare substring).
    expect(JSON.stringify(snap)).not.toContain('"vote":"5"');
  });

  it("hides votes and results while counting", () => {
    const state = makeState({ status: "counting", votes: { p1: "8" }, countdownEndsAt: 123 });
    const snap = toSnapshot(state);
    expect(snap.results).toBeNull();
    expect(snap.players.find((p) => p.id === "p1")!.vote).toBeNull();
  });

  it("exposes votes and results once revealed", () => {
    const state = makeState({ status: "revealed", votes: { p1: "5", p2: "5" } });
    const snap = toSnapshot(state);
    expect(snap.results).not.toBeNull();
    expect(snap.players.find((p) => p.id === "p1")!.vote).toBe("5");
    expect(snap.results!.consensus).toBe(true);
  });
});
