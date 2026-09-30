import type { Request, Response } from "express";
import { Router } from "express";
import { nanoid } from "nanoid";
import { createGameBodySchema, getDeck, parseCustomDeck } from "@planning-poker/shared";
import { generateToken, hashSecret } from "./auth.js";
import type { GameRepository } from "./repository.js";
import { createGameLimiter } from "./rateLimit.js";

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/** PLAN.md §8.1. */
export function createHttpRouter(repo: GameRepository): Router {
  const router = Router();

  router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  router.post("/games", async (req: Request, res: Response) => {
    if (!createGameLimiter.consume(clientIp(req))) {
      res.status(429).json({ error: "RATE_LIMITED" });
      return;
    }

    const parsed = createGameBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_PAYLOAD" });
      return;
    }
    const { name, deckType, customDeck } = parsed.data;

    const deck =
      deckType === "custom"
        ? customDeck
          ? parseCustomDeck(customDeck)
          : null
        : getDeck(deckType);
    if (!deck) {
      res.status(400).json({ error: "INVALID_PAYLOAD" });
      return;
    }

    const id = nanoid(10);
    const creatorSecret = generateToken();
    const creatorSecretHash = hashSecret(creatorSecret);

    await repo.createGame({
      id,
      name: name && name.trim().length > 0 ? name.trim() : "Planning poker game",
      deckType,
      deck,
      creatorSecretHash,
    });

    res.status(201).json({ id, creatorSecret });
  });

  router.get("/games/:id/exists", async (req: Request, res: Response) => {
    const exists = await repo.gameExists(req.params.id!);
    res.status(200).json({ exists });
  });

  return router;
}
