import { io as ioClient, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@planning-poker/shared";
import { MemoryRepository } from "../src/memoryRepository.js";
import { buildServer } from "../src/server.js";

export type TestServer = {
  url: string;
  repo: MemoryRepository;
  close: () => Promise<void>;
};

/** Starts the socket server on an ephemeral port with a fresh MemoryRepository (PLAN.md §10). */
export async function startTestServer(): Promise<TestServer> {
  const repo = new MemoryRepository();
  const { httpServer } = buildServer(repo, ["*"]);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("failed to bind test server");
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    repo,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export function connectClient(url: string): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const socket: TestClient = ioClient(url, { transports: ["websocket"], forceNew: true });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

export async function createGame(
  url: string,
  body: { name?: string; deckType: string; customDeck?: string },
): Promise<{ id: string; creatorSecret: string }> {
  const res = await fetch(`${url}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createGame failed: ${res.status}`);
  return (await res.json()) as { id: string; creatorSecret: string };
}
