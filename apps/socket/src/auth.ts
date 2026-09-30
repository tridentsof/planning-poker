import { createHash, randomBytes } from "node:crypto";

/** PLAN.md §8.1/§8.3: tokens and secrets are random values; only their hash is stored. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifySecret(secret: string, hash: string): boolean {
  return hashSecret(secret) === hash;
}
