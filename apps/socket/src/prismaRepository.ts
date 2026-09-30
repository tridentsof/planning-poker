import { PrismaClient } from "@prisma/client";
import {
  type GameSettings,
  type GameState,
  type GameStatus,
  type Issue,
  type IssueStatus,
  type PermissionScope,
  type PersistOp,
  type PlayerState,
  type Role,
} from "@planning-poker/shared";
import type { CreateGameParams, GameRepository, LoadedGame } from "./repository.js";

/**
 * Prisma-backed GameRepository against Supabase Postgres (PLAN.md §5, §8.6).
 * Every mutation is applied inside a single transaction.
 */
export class PrismaRepository implements GameRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createGame(params: CreateGameParams): Promise<void> {
    const roundId = `${params.id}-r0`;
    await this.prisma.$transaction([
      this.prisma.game.create({
        data: {
          id: params.id,
          name: params.name,
          deckType: params.deckType,
          deck: params.deck,
          creatorSecretHash: params.creatorSecretHash,
          currentRoundId: roundId,
        },
      }),
      this.prisma.round.create({
        data: { id: roundId, gameId: params.id, issueId: null },
      }),
    ]);
  }

  async gameExists(id: string): Promise<boolean> {
    const count = await this.prisma.game.count({ where: { id } });
    return count > 0;
  }

  async loadGame(id: string): Promise<LoadedGame | null> {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: { players: true, issues: true },
    });
    if (!game) return null;

    const currentRoundId = game.currentRoundId ?? `${id}-r0`;
    const round = await this.prisma.round.findUnique({
      where: { id: currentRoundId },
      include: { votes: true },
    });

    const players: Record<string, PlayerState> = {};
    const tokenHashes: Record<string, string> = {};
    for (const p of game.players) {
      players[p.id] = {
        id: p.id,
        name: p.name,
        role: p.role as Role,
        joinedAt: p.joinedAt.getTime(),
        connections: 0,
      };
      tokenHashes[p.id] = p.tokenHash;
    }

    const votes: Record<string, string> = {};
    for (const v of round?.votes ?? []) {
      votes[v.playerId] = v.value;
    }

    const settings: GameSettings = {
      whoCanReveal: game.whoCanReveal as PermissionScope,
      whoCanManageIssues: game.whoCanManageIssues as PermissionScope,
      showAverage: game.showAverage,
      showCountdown: game.showCountdown,
      autoReveal: game.autoReveal,
    };

    // A "counting" status found on load becomes "revealed" (PLAN.md §8.6): no server
    // process is left running to finalize a countdown started before a restart.
    const status: GameStatus = (game.status as GameStatus) === "counting" ? "revealed" : (game.status as GameStatus);

    const issues: Issue[] = game.issues
      .map((i) => ({
        id: i.id,
        title: i.title,
        url: i.url,
        position: i.position,
        finalEstimate: i.finalEstimate,
        status: i.status as IssueStatus,
      }))
      .sort((a, b) => a.position - b.position);

    const state: GameState = {
      id: game.id,
      name: game.name,
      deckType: game.deckType as GameState["deckType"],
      deck: game.deck,
      facilitatorId: game.facilitatorId,
      settings,
      status,
      countdownEndsAt: null,
      currentIssueId: game.currentIssueId,
      currentRoundId,
      players,
      votes,
      issues,
    };

    return { state, tokenHashes, creatorSecretHash: game.creatorSecretHash };
  }

  async persist(gameId: string, ops: PersistOp[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const op of ops) {
        switch (op.type) {
          case "updateGame": {
            const patch = op.patch;
            await tx.game.update({
              where: { id: gameId },
              data: {
                ...(patch.name !== undefined && { name: patch.name }),
                ...(patch.facilitatorId !== undefined && { facilitatorId: patch.facilitatorId }),
                ...(patch.settings !== undefined && {
                  whoCanReveal: patch.settings.whoCanReveal,
                  whoCanManageIssues: patch.settings.whoCanManageIssues,
                  showAverage: patch.settings.showAverage,
                  showCountdown: patch.settings.showCountdown,
                  autoReveal: patch.settings.autoReveal,
                }),
                ...(patch.status !== undefined && { status: patch.status }),
                ...("currentIssueId" in patch && { currentIssueId: patch.currentIssueId }),
                ...(patch.currentRoundId !== undefined && { currentRoundId: patch.currentRoundId }),
                lastActivityAt: new Date(patch.lastActivityAt ?? Date.now()),
              },
            });
            break;
          }
          case "upsertPlayer": {
            await tx.player.upsert({
              where: { id: op.player.id },
              create: {
                id: op.player.id,
                gameId: op.gameId,
                name: op.player.name,
                role: op.player.role,
                tokenHash: op.tokenHash ?? "",
              },
              update: {
                name: op.player.name,
                role: op.player.role,
                ...(op.tokenHash !== undefined && { tokenHash: op.tokenHash }),
                lastSeenAt: new Date(),
              },
            });
            break;
          }
          case "upsertIssue": {
            await tx.issue.upsert({
              where: { id: op.issue.id },
              create: {
                id: op.issue.id,
                gameId: op.gameId,
                title: op.issue.title,
                url: op.issue.url,
                position: op.issue.position,
                finalEstimate: op.issue.finalEstimate,
                status: op.issue.status,
              },
              update: {
                title: op.issue.title,
                url: op.issue.url,
                position: op.issue.position,
                finalEstimate: op.issue.finalEstimate,
                status: op.issue.status,
              },
            });
            break;
          }
          case "deleteIssue": {
            await tx.issue.deleteMany({ where: { id: op.issueId, gameId: op.gameId } });
            break;
          }
          case "reorderIssues": {
            for (const { id, position } of op.order) {
              await tx.issue.update({ where: { id }, data: { position } });
            }
            break;
          }
          case "startRound": {
            await tx.round.create({
              data: { id: op.roundId, gameId: op.gameId, issueId: op.issueId },
            });
            break;
          }
          case "castVote": {
            if (op.value === null) {
              await tx.vote.deleteMany({ where: { roundId: op.roundId, playerId: op.playerId } });
            } else {
              await tx.vote.upsert({
                where: { roundId_playerId: { roundId: op.roundId, playerId: op.playerId } },
                create: { roundId: op.roundId, playerId: op.playerId, value: op.value },
                update: { value: op.value },
              });
            }
            break;
          }
          case "revealRound": {
            await tx.round.update({
              where: { id: op.roundId },
              data: { revealedAt: new Date(op.revealedAt) },
            });
            break;
          }
        }
      }
    });
  }

  async deleteInactive(before: number): Promise<number> {
    const result = await this.prisma.game.deleteMany({
      where: { lastActivityAt: { lt: new Date(before) } },
    });
    return result.count;
  }
}
