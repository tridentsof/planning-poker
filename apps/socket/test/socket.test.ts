import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GameJoinAck, GameJoinPayload, GameSnapshot } from "@planning-poker/shared";
import { connectClient, createGame, startTestServer, type TestClient, type TestServer } from "./testServer.js";

function join(socket: TestClient, payload: GameJoinPayload): Promise<GameJoinAck> {
  return new Promise((resolve) => socket.emit("game:join", payload, resolve));
}

function nextState(socket: TestClient): Promise<GameSnapshot> {
  return new Promise((resolve) => socket.once("game:state", resolve));
}

function waitForStatus(socket: TestClient, status: GameSnapshot["status"]): Promise<GameSnapshot> {
  return new Promise((resolve) => {
    const handler = (snap: GameSnapshot) => {
      if (snap.status === status) {
        socket.off("game:state", handler);
        resolve(snap);
      }
    };
    socket.on("game:state", handler);
  });
}

function nextError(socket: TestClient): Promise<{ code: string; message: string }> {
  return new Promise((resolve) => socket.once("error", resolve));
}

let server: TestServer;

beforeEach(async () => {
  server = await startTestServer();
});

afterEach(async () => {
  await server.close();
});

describe("game:join + vote:cast", () => {
  it("hides the vote value from other clients, at the wire level, until reveal", async () => {
    const { id: gameId } = await createGame(server.url, { deckType: "fibonacci" });

    const a = await connectClient(server.url);
    const b = await connectClient(server.url);

    const ackA = await join(a, { gameId, name: "Alice", role: "player" });
    expect(ackA.ok).toBe(true);
    const ackB = await join(b, { gameId, name: "Bob", role: "player" });
    expect(ackB.ok).toBe(true);

    // Capture the raw wire payload B receives when A votes.
    const rawPayload = new Promise<string>((resolve) => {
      const handler = (data: unknown) => {
        if (typeof data === "string" && data.includes("game:state")) {
          b.io.engine.off("message", handler);
          resolve(data);
        }
      };
      b.io.engine.on("message", handler);
    });

    a.emit("vote:cast", { value: "5" });
    const raw = await rawPayload;
    expect(raw).not.toContain('"vote":"5"');

    a.close();
    b.close();
  });

  it("reveals with a countdown, transitioning voting -> counting -> revealed", async () => {
    const { id: gameId } = await createGame(server.url, { deckType: "fibonacci" });
    const a = await connectClient(server.url);
    await join(a, { gameId, name: "Alice", role: "player" });

    a.emit("vote:cast", { value: "5" });
    await nextState(a);

    const countingPromise = waitForStatus(a, "counting");
    const revealedPromise = waitForStatus(a, "revealed");
    a.emit("round:reveal");

    const counting = await countingPromise;
    expect(counting.countdownEndsAt).not.toBeNull();

    const revealed = await revealedPromise;
    expect(revealed.status).toBe("revealed");
    expect(revealed.results).not.toBeNull();
    expect(revealed.players.find((p) => p.id === revealed.players[0]!.id)!.vote).toBe("5");

    a.close();
  }, 8000);

  it("reconnecting with a token restores the same player and keeps their vote", async () => {
    const { id: gameId } = await createGame(server.url, { deckType: "fibonacci" });

    const a = await connectClient(server.url);
    const ack = await join(a, { gameId, name: "Alice", role: "player" });
    if (!ack.ok) throw new Error("join failed");

    a.emit("vote:cast", { value: "8" });
    await nextState(a);
    a.close();

    const a2 = await connectClient(server.url);
    const statePromise = nextState(a2);
    const ack2 = await join(a2, {
      gameId,
      name: "Alice",
      role: "player",
      playerToken: ack.playerToken,
    });
    expect(ack2.ok).toBe(true);
    if (ack2.ok) expect(ack2.playerId).toBe(ack.playerId);

    const snap = await statePromise;
    const me = snap.players.find((p) => p.id === ack.playerId)!;
    expect(me.hasVoted).toBe(true); // the vote from before the reconnect is preserved

    a2.close();
  });

  it("grants facilitator to the creator via creatorSecret, not to a later joiner", async () => {
    const { id: gameId, creatorSecret } = await createGame(server.url, { deckType: "fibonacci" });

    const a = await connectClient(server.url);
    const ackA = await join(a, { gameId, name: "Alice", role: "player", creatorSecret });
    if (!ackA.ok) throw new Error("join failed");

    const b = await connectClient(server.url);
    // Attach the listener before joining: the server may broadcast "game:state" in the same
    // tick as the join ack, so registering it afterwards risks missing that broadcast.
    const snapPromise = nextState(b);
    const ackB = await join(b, { gameId, name: "Bob", role: "player" });
    if (!ackB.ok) throw new Error("join failed");

    const snap = await snapPromise;
    expect(snap.facilitatorId).toBe(ackA.playerId);
    expect(snap.facilitatorId).not.toBe(ackB.playerId);

    a.close();
    b.close();
  });

  it("rejects an invalid payload and enforces the per-socket rate limit", async () => {
    const { id: gameId } = await createGame(server.url, { deckType: "fibonacci" });
    const a = await connectClient(server.url);
    await join(a, { gameId, name: "Alice", role: "player" });

    const errorPromise = nextError(a);
    // "value" must be a string or null, not a number.
    a.emit("vote:cast", { value: 5 } as unknown as { value: string | null });
    const error = await errorPromise;
    expect(error.code).toBe("INVALID_PAYLOAD");

    let sawRateLimited = false;
    for (let i = 0; i < 100; i++) {
      a.emit("vote:cast", { value: null });
    }
    const ratePromise = new Promise<void>((resolve) => {
      const handler = (e: { code: string }) => {
        if (e.code === "RATE_LIMITED") {
          sawRateLimited = true;
          a.off("error", handler);
          resolve();
        }
      };
      a.on("error", handler);
    });
    await Promise.race([ratePromise, new Promise((r) => setTimeout(r, 1000))]);
    expect(sawRateLimited).toBe(true);

    a.close();
  });
});
