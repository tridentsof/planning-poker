import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  USE_MEMORY_REPO: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  NODE_ENV: z.string().default("development"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

if (!config.USE_MEMORY_REPO && !config.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL is required unless USE_MEMORY_REPO=true");
  process.exit(1);
}
