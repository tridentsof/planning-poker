import { z } from "zod";
import { CUSTOM_DECK_MAX_CARD_LENGTH, DECK_TYPES } from "./decks.js";

export const deckTypeSchema = z.enum(DECK_TYPES);
export const roleSchema = z.enum(["player", "spectator"]);

export const createGameBodySchema = z.object({
  name: z.string().max(60).optional(),
  deckType: deckTypeSchema,
  customDeck: z.string().max(CUSTOM_DECK_MAX_CARD_LENGTH * 20 + 20).optional(),
});
export type CreateGameBody = z.infer<typeof createGameBodySchema>;

export const gameJoinSchema = z.object({
  gameId: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(30),
  role: roleSchema,
  playerToken: z.string().max(200).optional(),
  creatorSecret: z.string().max(200).optional(),
});

export const voteCastSchema = z.object({
  value: z.string().max(10).nullable(),
});

export const issueAddSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().max(500).optional(),
});

export const issueUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  url: z.string().trim().max(500).nullable().optional(),
});

export const issueDeleteSchema = z.object({
  id: z.string().min(1),
});

export const issueReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export const issueSelectSchema = z.object({
  id: z.string().min(1).nullable(),
});

export const issueSetEstimateSchema = z.object({
  id: z.string().min(1),
  value: z.string().max(10).nullable(),
});

export const playerRenameSchema = z.object({
  name: z.string().trim().min(1).max(30),
});

export const playerSetRoleSchema = z.object({
  role: roleSchema,
});

export const gameUpdateSettingsSchema = z.object({
  whoCanReveal: z.enum(["all", "facilitator"]).optional(),
  whoCanManageIssues: z.enum(["all", "facilitator"]).optional(),
  showAverage: z.boolean().optional(),
  showCountdown: z.boolean().optional(),
  autoReveal: z.boolean().optional(),
});

export const gameRenameSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const facilitatorTransferSchema = z.object({
  playerId: z.string().min(1),
});
