# Planning Poker

A real-time planning poker game for Agile teams, cloned from planningpokeronline.com. Built from
[PLAN.md](./PLAN.md); see that file for the full spec, architecture, and design decisions ([DECISIONS.md](./DECISIONS.md)
lists the choices made where the spec left something open).

## Structure

```
apps/web      Next.js UI (deploys to Vercel)
apps/socket   Express + Socket.IO server, the single writer to the database (deploys to Render)
packages/shared  Types, Zod schemas, deck definitions, and the pure game engine
```

## Local development

Requires Node 20+ and pnpm (`corepack enable && corepack prepare pnpm@9 --activate`).

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs `packages/shared` in watch mode, the socket server, and the web app together.
The socket server defaults to `USE_MEMORY_REPO=true` (see `apps/socket/.env.example`), so no
database is required for local development — game state just doesn't survive a restart.

- Web: http://localhost:3000
- Socket server: http://localhost:4000 (health check at `/health`)

To use a real Postgres database locally, copy `apps/socket/.env.example` to `.env`, set
`DATABASE_URL` and `USE_MEMORY_REPO=false`, then run:

```bash
pnpm --filter @planning-poker/socket prisma:generate
pnpm --filter @planning-poker/socket prisma:migrate
```

## Testing

```bash
pnpm typecheck   # tsc --noEmit in every workspace
pnpm lint        # eslint in every workspace
pnpm test        # vitest: shared unit tests + socket integration tests
pnpm test:e2e    # Playwright E2E tests (apps/web), starts both servers automatically
```

`pnpm test:e2e` runs Playwright's own ephemeral web (port 3100) and socket (port 4100) servers
(see `apps/web/playwright.config.ts`) — it does not need `pnpm dev` running first, and it uses
the in-memory repository so it needs no database either.

## Deployment

See PLAN.md §11 for the full walkthrough. Summary:

1. **Supabase** — create a Postgres project. Copy the direct connection string.
2. **Render** — import this repo as a Blueprint (`render.yaml`). Set `DATABASE_URL` and
   `CORS_ORIGINS` (your Vercel domain) in the Render dashboard.
3. **Vercel** — import this repo with root directory `apps/web`. Set
   `NEXT_PUBLIC_SOCKET_URL` to your Render service's URL.

## Status against PLAN.md §12

| Step | Status |
|---|---|
| 1. Monorepo scaffold | Done |
| 2. `packages/shared` | Done — 21 unit tests passing |
| 3. `apps/socket` (in-memory) | Done — 5 integration tests passing |
| 4. Prisma + PrismaRepository | Schema validates (`prisma validate`); **not** exercised against a live Postgres/Supabase instance in this environment — do that before your first production deploy |
| 5. `apps/web` scaffold | Done — builds cleanly |
| 6–7. UI + all actions | Done — manually verified two-browser play (vote/reveal/reset, issues, settings) |
| 8. Responsive/dark mode/a11y | Done — verified at a 375px width and in dark mode; no formal Lighthouse audit was run |
| 9. Playwright E2E | Done — 2/2 tests passing |
| 10. Deployment config | Done (this file, `render.yaml`, `.env.example`s) — actual Render/Vercel/Supabase accounts are yours to create |
