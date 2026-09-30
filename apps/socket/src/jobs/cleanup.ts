import type { GameRepository } from "../repository.js";
import { startCleanupJob as start } from "../timers.js";

/** Deletes games inactive for more than 30 days, on an hourly interval (PLAN.md §8.5). */
export function startCleanupJob(repo: GameRepository): NodeJS.Timeout {
  return start(repo);
}
