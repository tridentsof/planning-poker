import { createServer as createHttpServer, type Server as NodeHttpServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@planning-poker/shared";
import { createHttpRouter } from "./http.js";
import { GameStore } from "./gameStore.js";
import type { GameRepository } from "./repository.js";
import { registerSocketHandlers } from "./socket.js";

export type BuiltServer = {
  httpServer: NodeHttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  store: GameStore;
};

/**
 * Builds (but does not start listening on) the Express + Socket.IO server. Split out from
 * index.ts so integration tests can start it on an ephemeral port (PLAN.md §10).
 */
export function buildServer(repo: GameRepository, corsOrigins: string[]): BuiltServer {
  const store = new GameStore(repo);

  const app = express();
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());
  app.use(createHttpRouter(repo));

  const httpServer = createHttpServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: corsOrigins },
  });

  registerSocketHandlers(io, store);

  return { httpServer, io, store };
}
