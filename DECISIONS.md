# Implementation Decisions

Record of choices made where PLAN.md was ambiguous or silent, per Rule 2 in PLAN.md §0.

- **Package manager version:** pnpm 9.15.9 (via corepack), Node 20+ compatible.
- **ESLint version:** ESLint 8.x with `@typescript-eslint` v7, since flat config (ESLint 9) support
  across Next.js 15 + the rest of the toolchain was less consistent at implementation time.
- **`packages/shared` build:** compiled with `tsup` (esm + cjs + `.d.ts`) for simple consumption
  from both the Next.js app (ESM) and the Node socket server.
- **`apps/socket` build:** compiled with `tsup` to a single `dist/index.js` (esm), run with `node`.
- **Testing runner for E2E:** Playwright, started against `pnpm dev` processes per PLAN.md §10/§12.
- **nanoid ids:** `nanoid(10)` for game ids uses the default URL-safe alphabet; `nanoid(12)` for
  player/issue/round ids likewise.
- **Rate limiter:** implemented as a minimal in-process token bucket (no external dependency),
  keyed by socket id for socket events and by IP for the `POST /games` HTTP route.
- **Logger:** `pino` with pretty-printing only in development (`NODE_ENV !== "production"`).
- **Tailwind version:** v3 (config file + PostCSS) instead of v4, for a more predictable, widely
  documented setup with Next.js 15 / React 18 at implementation time.
- **React version:** React 18.3 (not 19) with Next.js 15, since 19 was still stabilizing across
  the rest of this stack (framer-motion, dnd-kit, radix) at implementation time.
- **UI primitives:** hand-built Tailwind + Radix UI primitives (`@radix-ui/react-dialog`,
  `-select`, `-switch`, `-dropdown-menu`) styled to match shadcn/ui's look, instead of running the
  shadcn CLI (which fetches component source from a registry over the network).
- **`apps/socket` testability:** added `src/server.ts`, exporting the Express+Socket.IO wiring as
  a plain function, so integration tests (PLAN.md §10) can start the server on an ephemeral port.
  `src/index.ts` calls it and adds `listen()` + the cleanup job.
- **Prisma migration generation:** the initial migration
  (`apps/socket/prisma/migrations/20260928000000_init/migration.sql`) was generated with
  `prisma migrate diff --from-empty --to-schema-datamodel` instead of `prisma migrate dev`,
  because the Prisma 5.22 CLI crashes on this Windows machine under Node 24
  (`uv async.c` assertion, a known Prisma-on-Windows issue). The SQL is equivalent to what
  `migrate dev` would produce; `prisma migrate deploy` (used in the Render pre-deploy, §11)
  runs against the server's DB, not the CLI-side engine, and is unaffected.

