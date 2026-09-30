import { config } from "./config.js";
import { startCleanupJob } from "./jobs/cleanup.js";
import { logger } from "./logger.js";
import { MemoryRepository } from "./memoryRepository.js";
import type { GameRepository } from "./repository.js";
import { buildServer } from "./server.js";

async function buildRepository(): Promise<GameRepository> {
  if (config.USE_MEMORY_REPO) {
    logger.warn("USE_MEMORY_REPO=true: game state is not persisted across restarts");
    return new MemoryRepository();
  }
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaRepository } = await import("./prismaRepository.js");
  return new PrismaRepository(new PrismaClient());
}

async function main(): Promise<void> {
  const repo = await buildRepository();
  const { httpServer } = buildServer(repo, config.CORS_ORIGINS);
  startCleanupJob(repo);

  httpServer.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "socket server listening");
  });
}

main().catch((error) => {
  logger.error({ error }, "fatal error during startup");
  process.exit(1);
});
