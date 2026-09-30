import { describe, expect, it } from "vitest";
import { DECKS, computeResults } from "../src/index.js";

describe("computeResults", () => {
  it("averages numeric votes, including ½, and ignores ? and ☕", () => {
    const votes = { p1: "1", p2: "½", p3: "?", p4: "☕" };
    const results = computeResults(votes, [...DECKS.modifiedFibonacci], "modifiedFibonacci");
    expect(results.average).toBe(0.8); // (1 + 0.5) / 2 = 0.75 -> rounds to 0.8 (banker's/half-up)
  });

  it("returns a null average for the t-shirt deck", () => {
    const votes = { p1: "M", p2: "L" };
    const results = computeResults(votes, [...DECKS.tshirt], "tshirt");
    expect(results.average).toBeNull();
    expect(results.suggested).toBe("M"); // most common on tie order (deck order tie-break)
  });

  it("returns a null average when there are no numeric votes", () => {
    const votes = { p1: "?", p2: "☕" };
    const results = computeResults(votes, [...DECKS.fibonacci], "fibonacci");
    expect(results.average).toBeNull();
  });

  it("picks the higher card on a tie for suggested", () => {
    // average of 3 and 5 is 4; both are equidistant (1 away) -> pick 5.
    const votes = { p1: "3", p2: "5" };
    const results = computeResults(votes, [...DECKS.fibonacci], "fibonacci");
    expect(results.average).toBe(4);
    expect(results.suggested).toBe("5");
  });

  it("computes agreement and consensus", () => {
    const votes = { p1: "5", p2: "5", p3: "8" };
    const results = computeResults(votes, [...DECKS.fibonacci], "fibonacci");
    expect(results.agreement).toBeCloseTo(2 / 3);
    expect(results.consensus).toBe(false);

    const unanimous = computeResults({ p1: "5", p2: "5" }, [...DECKS.fibonacci], "fibonacci");
    expect(unanimous.agreement).toBe(1);
    expect(unanimous.consensus).toBe(true);
  });
});
