# Planning Poker — Implementation Spec

This spec is written for an LLM coding agent. Implement the application exactly as described, working through the steps in §12 in order. Each step lists a verification that must pass before you start the next one.

## 0. Rules for the Implementer

1. Use TypeScript in strict mode everywhere. Do not use `any` except at validated boundaries.
2. Do not add features, libraries, or files that this spec does not list. If the spec is ambiguous, pick the simplest option and record it in `DECISIONS.md`.
3. Keep game logic in pure functions (`packages/shared/src/engine.ts`). The socket server calls those functions; it does not contain rules itself.
4. **Vote values must never be sent to any client while `status !== "revealed"`.** This is the core security invariant.
5. Validate every inbound socket payload and HTTP body with Zod. Reply to invalid input with an `error` event; never crash.
6. Never hardcode secrets. Read them from environment variables (§3).
7. After each step, run `pnpm -r typecheck && pnpm -r lint && pnpm -r test`.

## 1. Product Summary

This is a clone of **planningpokeronline.com**: a real-time estimation game for Agile teams, with no sign-up required.

- A facilitator creates a game (name + deck) and shares the link.
- Guests open the link, enter a display name, and sit at a virtual table.
- Players pick a card privately. Everyone else sees only that a player *has* voted.
- Cards are revealed together, with an optional 3-second countdown. The results show each vote, the average, the vote distribution, and an agreement score.
- A new round clears the votes.
- An issue list lets the team vote issue by issue and save a final estimate for each.
- Settings control who can reveal cards, who can manage issues, whether the average and countdown are shown, and whether cards reveal automatically.

## 2. Tech Stack & Architecture

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces, Node 20 LTS |
| Web | Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Framer Motion, Zustand, `socket.io-client`, `qrcode.react` |
| Socket server | Node 20, Express 4 + Socket.IO 4, Prisma 5, Zod, `nanoid`, `pino` logger |
| Database | Supabase Postgres (accessed **only** by the socket server, via Prisma) |
| Shared | `packages/shared`: types, Zod schemas, deck definitions, pure game engine |
| Tests | Vitest (unit + integration), Playwright (E2E) |
| Hosting | Web on **Vercel**; socket server on **Render** (Web Service, 1 instance); DB on **Supabase** in the same region as Render |

```
Browser ──HTTPS──▶ Vercel (Next.js UI only, no DB access)
   │
   ├──HTTPS POST /games ─────────▶ Render: socket server (Express + Socket.IO)
   └──WebSocket (Socket.IO) ─────▶        │  in-memory authoritative state
                                          │  write-through persistence
                                          ▼
                                   Supabase Postgres
```

The socket server is the **single writer** to the database. The web app is a pure client.

## 3. Repository Layout & Environment

```
planning-poker-game/
├─ package.json                 # workspace root scripts
├─ pnpm-workspace.yaml          # apps/*, packages/*
├─ tsconfig.base.json
├─ .eslintrc.cjs / .prettierrc
├─ DECISIONS.md
├─ packages/shared/
│  └─ src/
│     ├─ decks.ts               # deck definitions
│     ├─ types.ts               # domain + snapshot types
│     ├─ schemas.ts             # Zod schemas for events and HTTP bodies
│     ├─ events.ts              # typed Socket.IO event maps
│     ├─ engine.ts              # pure state transitions
│     ├─ results.ts             # average / distribution / agreement
│     └─ index.ts
├─ apps/socket/
│  ├─ prisma/schema.prisma
│  └─ src/
│     ├─ index.ts               # bootstrap Express + Socket.IO
│     ├─ config.ts              # env parsing with Zod
│     ├─ http.ts                # POST /games, GET /games/:id/exists, GET /health
│     ├─ socket.ts              # event handlers
│     ├─ gameStore.ts           # in-memory Map<gameId, GameState> + load/evict
│     ├─ repository.ts          # interface GameRepository
│     ├─ prismaRepository.ts    # Prisma implementation
│     ├─ memoryRepository.ts    # in-memory implementation (tests / local dev)
│     ├─ auth.ts                # token generation + sha256 hashing
│     ├─ rateLimit.ts           # token bucket per socket
│     ├─ timers.ts              # countdown, facilitator handoff, eviction
│     └─ jobs/cleanup.ts        # delete inactive games
│  └─ test/…
└─ apps/web/
   └─ src/
      ├─ app/
      │  ├─ layout.tsx, globals.css
      │  ├─ page.tsx                     # Create game
      │  └─ game/[id]/page.tsx           # Game room
      ├─ components/…                    # see §9
      ├─ lib/socket.ts                   # singleton client
      ├─ lib/api.ts                      # createGame()
      ├─ lib/storage.ts                  # localStorage helpers
      └─ store/gameStore.ts              # Zustand
   └─ e2e/…
```

**Environment variables**

| Var | App | Example |
|---|---|---|
| `DATABASE_URL` | socket | Supabase direct connection string (port 5432) |
| `PORT` | socket | `4000` |
| `CORS_ORIGINS` | socket | `http://localhost:3000,https://planning-poker.vercel.app` |
| `USE_MEMORY_REPO` | socket | `true` (local/tests without a DB) |
| `NEXT_PUBLIC_SOCKET_URL` | web | `http://localhost:4000` |

Provide a `.env.example` in each app.

## 4. Decks (`packages/shared/src/decks.ts`)

```ts
export const DECKS = {
  fibonacci:          ["0","1","2","3","5","8","13","21","34","55","89","?","☕"],
  modifiedFibonacci:  ["0","½","1","2","3","5","8","13","20","40","100","?","☕"],
  tshirt:             ["XXS","XS","S","M","L","XL","XXL","?","☕"],
  powersOfTwo:        ["0","1","2","4","8","16","32","64","?","☕"],
} as const;
export type DeckType = keyof typeof DECKS | "custom";
```

- Custom deck: 2–20 unique values, each 1–4 characters, trimmed. The input is a comma-separated string.
- The numeric value of a card is `"½"` → 0.5, a finite number string → that number, and anything else → non-numeric.

## 5. Data Model (`apps/socket/prisma/schema.prisma`)

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum GameStatus  { voting counting revealed }
enum Permission  { all facilitator }
enum PlayerRole  { player spectator }
enum IssueStatus { pending voted }

model Game {
  id                 String      @id            // nanoid(10), url-safe
  name               String      @db.VarChar(60)
  deckType           String
  deck               String[]
  creatorSecretHash  String
  facilitatorId      String?
  whoCanReveal       Permission  @default(all)
  whoCanManageIssues Permission  @default(all)
  showAverage        Boolean     @default(true)
  showCountdown      Boolean     @default(true)
  autoReveal         Boolean     @default(false)
  status             GameStatus  @default(voting)
  currentIssueId     String?
  currentRoundId     String?
  createdAt          DateTime    @default(now())
  lastActivityAt     DateTime    @default(now())
  players            Player[]
  issues             Issue[]
  rounds             Round[]
  @@index([lastActivityAt])
}

model Player {
  id         String     @id
  gameId     String
  game       Game       @relation(fields: [gameId], references: [id], onDelete: Cascade)
  name       String     @db.VarChar(30)
  role       PlayerRole @default(player)
  tokenHash  String
  joinedAt   DateTime   @default(now())
  lastSeenAt DateTime   @default(now())
  votes      Vote[]
  @@index([gameId])
}

model Issue {
  id            String      @id
  gameId        String
  game          Game        @relation(fields: [gameId], references: [id], onDelete: Cascade)
  title         String      @db.VarChar(200)
  url           String?     @db.VarChar(500)
  position      Int
  finalEstimate String?
  status        IssueStatus @default(pending)
  @@index([gameId, position])
}

model Round {
  id         String    @id
  gameId     String
  game       Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  issueId    String?
  startedAt  DateTime  @default(now())
  revealedAt DateTime?
  votes      Vote[]
}

model Vote {
  roundId  String
  round    Round  @relation(fields: [roundId], references: [id], onDelete: Cascade)
  playerId String
  player   Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
  value    String
  @@id([roundId, playerId])
}
```

## 6. Shared Types (`packages/shared/src/types.ts`)

```ts
export type GameSettings = {
  whoCanReveal: "all" | "facilitator";
  whoCanManageIssues: "all" | "facilitator";
  showAverage: boolean;
  showCountdown: boolean;
  autoReveal: boolean;
};

// Server-internal authoritative state (never sent as-is)
export type GameState = {
  id: string; name: string; deckType: DeckType; deck: string[];
  facilitatorId: string | null; settings: GameSettings;
  status: "voting" | "counting" | "revealed";
  countdownEndsAt: number | null;          // epoch ms
  currentIssueId: string | null; currentRoundId: string;
  players: Record<string, { id: string; name: string; role: "player" | "spectator";
                            joinedAt: number; connections: number }>;
  votes: Record<string, string>;           // playerId -> value (current round)
  issues: Issue[];                         // sorted by position
};

export type Issue = { id: string; title: string; url: string | null; position: number;
                      finalEstimate: string | null; status: "pending" | "voted" };

// What clients receive
export type PlayerView = { id: string; name: string; role: "player" | "spectator";
                           isFacilitator: boolean; connected: boolean;
                           hasVoted: boolean; vote: string | null /* null unless revealed */ };

export type Results = { average: number | null;          // null if no numeric votes or tshirt deck
                        distribution: { value: string; count: number }[]; // desc by count
                        agreement: number;               // 0..1, share of voters on top value
                        consensus: boolean;              // all voters picked same value
                        suggested: string | null };      // see §7.3

export type GameSnapshot = {
  id: string; name: string; deck: string[]; deckType: DeckType;
  settings: GameSettings; facilitatorId: string | null;
  status: GameState["status"]; countdownEndsAt: number | null;
  currentIssueId: string | null; issues: Issue[];
  players: PlayerView[];                   // sorted by joinedAt
  results: Results | null;                 // non-null only when status === "revealed"
};
```

`toSnapshot(state)` is the **only** function that builds client payloads. It must set `vote: null` and `results: null` unless `status === "revealed"`.

## 7. Game Rules (`engine.ts`, `results.ts`)

Every engine function has the signature `(state, actorId, payload) => { state, effects? } | { error: ErrorCode }`. Effects are instructions for the server to perform, such as `{ type: "startCountdown" }` or `{ type: "persist", ops: [...] }`.

### 7.1 Permissions
- `isFacilitator = state.facilitatorId === actorId`.
- Reveal: allowed if `whoCanReveal === "all"` or the actor is the facilitator. The same check applies to Reset (new round).
- Issue mutations (add, update, delete, reorder, select, setEstimate): allowed if `whoCanManageIssues === "all"` or the actor is the facilitator.
- Settings updates, facilitator transfer, and game rename: facilitator only.
- Spectators cannot vote.

### 7.2 Actions
| Action | Preconditions | Effect |
|---|---|---|
| `castVote(value \| null)` | actor is a player; `status === "voting"`; value ∈ deck | set or delete `votes[actor]`. If `autoReveal` and every connected player has voted and at least 1 vote exists, then run `reveal` |
| `reveal` | permitted; `status === "voting"`; at least 1 vote | if `showCountdown`, then `status = "counting"`, `countdownEndsAt = now + 3000`, and the server timer finalizes the reveal after 3 s; otherwise `status = "revealed"` |
| `finalizeReveal` | internal; `status === "counting"` | `status = "revealed"`, `countdownEndsAt = null`, persist `Round.revealedAt` |
| `resetRound` | permitted | `votes = {}`, `status = "voting"`, create a new `currentRoundId` |
| `addIssue(title, url?)` | permitted; up to 200 issues | append with `position = max + 1` |
| `updateIssue(id, title?, url?)` / `deleteIssue(id)` | permitted | if the deleted issue is current, set `currentIssueId = null` |
| `reorderIssues(ids[])` | permitted; `ids` is a permutation of existing ids | rewrite positions 0..n-1 |
| `selectIssue(id \| null)` | permitted | set `currentIssueId` and then run `resetRound` |
| `setEstimate(issueId, value \| null)` | permitted; value ∈ deck or null | set `finalEstimate`; `status = value ? "voted" : "pending"` |
| `rename(name)` | 1–30 chars after trim | update the player's name |
| `setRole(role)` | none | update; switching to spectator deletes the player's vote |
| `updateSettings(partial)` | facilitator | merge |
| `renameGame(name)` | facilitator; 1–60 chars | update |
| `transferFacilitator(playerId)` | facilitator; target exists | set `facilitatorId` |

When the game has an unrevealed round, a player leaving or disconnecting keeps their vote, so a refresh does not lose it.

### 7.3 Results (computed only when revealed)
- **Voters** are all entries in `votes`.
- `distribution`: count per value, sorted by count descending, then by deck order.
- `average`: mean of the numeric values (see §4), rounded to 1 decimal place; `null` when the deck is `tshirt` or there are no numeric votes.
- `agreement = topCount / voterCount`. `consensus = distribution.length === 1`.
- `suggested`: for numeric decks, the numeric deck card closest to `average`, choosing the higher card on a tie. Otherwise, the most common value. The UI pre-fills this as the final estimate.

## 8. Socket Server (`apps/socket`)

### 8.1 HTTP (Express)
- `GET /health` → `200 {ok:true}`
- `POST /games` with body `{ name?: string(≤60), deckType: DeckType, customDeck?: string }`:
  - Validate the body. A missing or empty `name` becomes `"Planning poker game"`.
  - Create `id = nanoid(10)` and `creatorSecret = randomBytes(32).toString("base64url")`, then store `sha256(creatorSecret)`.
  - Respond with `201 { id, creatorSecret }`.
  - Rate limit: 10 requests per minute per IP.
- `GET /games/:id/exists` → `{ exists: boolean }`
- CORS allows only the origins in `CORS_ORIGINS`.

### 8.2 Socket.IO events (`packages/shared/src/events.ts`)

```ts
export interface ClientToServer {
  "game:join": (p: { gameId: string; name: string; role: "player"|"spectator";
                     playerToken?: string; creatorSecret?: string },
                ack: (r: { ok: true; playerId: string; playerToken: string } |
                         { ok: false; error: ErrorCode }) => void) => void;
  "vote:cast": (p: { value: string | null }) => void;
  "round:reveal": () => void;
  "round:reset": () => void;
  "issue:add": (p: { title: string; url?: string }) => void;
  "issue:update": (p: { id: string; title?: string; url?: string | null }) => void;
  "issue:delete": (p: { id: string }) => void;
  "issue:reorder": (p: { ids: string[] }) => void;
  "issue:select": (p: { id: string | null }) => void;
  "issue:setEstimate": (p: { id: string; value: string | null }) => void;
  "player:rename": (p: { name: string }) => void;
  "player:setRole": (p: { role: "player" | "spectator" }) => void;
  "game:updateSettings": (p: Partial<GameSettings>) => void;
  "game:rename": (p: { name: string }) => void;
  "facilitator:transfer": (p: { playerId: string }) => void;
}
export interface ServerToClient {
  "game:state": (s: GameSnapshot) => void;
  "error": (e: { code: ErrorCode; message: string }) => void;
}
export type ErrorCode = "GAME_NOT_FOUND" | "INVALID_PAYLOAD" | "FORBIDDEN" |
                        "INVALID_STATE" | "RATE_LIMITED" | "NOT_JOINED";
```

### 8.3 Join flow
1. Validate the payload. Load the game through `gameStore.getOrLoad(gameId)`. If it does not exist, ack `GAME_NOT_FOUND`.
2. If `playerToken` is present and `sha256(token)` matches a player in the game, reuse that player and update the name if it changed. Otherwise, create a player with `id = nanoid(12)` and a new token.
3. If `facilitatorId` is null and `creatorSecret` matches the stored hash, make this player the facilitator.
4. Increment the player's `connections`, call `socket.join(gameId)`, set `socket.data = { gameId, playerId }`, ack, then broadcast the state.
5. Any event other than join from a socket without `socket.data.playerId` gets the `NOT_JOINED` error.

### 8.4 Mutation pipeline (all events except join)
`rateLimit` (token bucket, 20 events/s, burst 40) → Zod validate → `engine.fn` → on error, emit `error` to that socket only → on success, `await repository.persist(ops)` → update memory → `io.to(gameId).emit("game:state", toSnapshot(state))` → update `lastActivityAt`.

Process mutations for the same game sequentially, using a per-game promise queue, to avoid races.

### 8.5 Timers (`timers.ts`)
- **Countdown:** `setTimeout(3000)` calls `finalizeReveal` and then broadcasts. Clear it if a reset happens first.
- **Disconnect:** decrement `connections` and broadcast (the player shows as offline).
- **Facilitator handoff:** if the facilitator has 0 connections for 5 minutes, transfer the role to the connected player with the earliest `joinedAt`. If nobody is connected, keep the current facilitator.
- **Eviction:** if a game has 0 total connections for 10 minutes, remove it from memory (the DB keeps it).
- **Cleanup job:** runs hourly on the server and deletes games with `lastActivityAt < now - 30 days`.

### 8.6 Repository
`GameRepository` interface: `createGame`, `loadGame(id) → GameState | null`, `persist(gameId, ops: PersistOp[])`, `deleteInactive(before)`. `PrismaRepository` runs ops inside `prisma.$transaction`. `MemoryRepository` is used when `USE_MEMORY_REPO=true` and in tests.

`loadGame` rebuilds the state: game row, players (with `connections: 0`), issues, and the votes of `currentRoundId`. A status of `counting` found on load becomes `revealed`.

## 9. Web App (`apps/web`)

### 9.1 Local storage keys (`lib/storage.ts`)
- `pp:name` — the last display name
- `pp:token:{gameId}` — the player token
- `pp:creator:{gameId}` — the creator secret (deleted after a successful join as facilitator)
- `pp:theme` — `light | dark | system`

### 9.2 Pages
**`/` Create game**
- A centered card containing: Game name input (placeholder "Planning poker game"); a Voting system select (Fibonacci, Modified Fibonacci, T-shirt, Powers of 2, Custom…), where Custom shows a comma-separated input with a live preview of the cards; and a "Create game" button.
- On submit, call `POST /games`, store the creator secret, and `router.push(/game/{id})`. Show server errors in a toast.

**`/game/[id]` Game room** (client component)
1. If there is no `pp:name`, show the **JoinDialog**: display name (1–30 characters) and a "Join as spectator" switch.
2. Connect with the singleton socket and emit `game:join`. On `GAME_NOT_FOUND`, show a "Game not found" screen with a link home.
3. Store the returned token. Subscribe to `game:state` in the Zustand store.
4. Show a banner while reconnecting. Socket.IO auto-reconnects; on `connect`, re-emit `game:join` with the stored token.

### 9.3 Layout & components
```
┌ Header: [logo] GameName ▾(facilitator: rename/settings) ········ [Invite players] [Issues ☰] [Avatar ▾] ┐
│                                                                                                       │
│                 Seats (top row)                                                          IssuesDrawer │
│        ┌──────────────────────────────────────┐                                          (right,      │
│  Seats │   Table center:                      │ Seats                                     toggle)     │
│  (left)│   "Pick your cards!" | [Reveal cards]│ (right)                                               │
│        │   | countdown 3·2·1 | [Start new vote]│                                                      │
│        └──────────────────────────────────────┘                                                       │
│                 Seats (bottom row)                                                                    │
│ ───────────────────────────────────────────────────────────────────────────────────────────────────── │
│ Footer: Deck (when voting)  OR  ResultsPanel (when revealed)                                          │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Behavior |
|---|---|
| `Header` | Game name; facilitator menu (Rename game, Settings); the Invite button opens `InviteDialog`; the Issues button toggles the drawer; the avatar menu has Change name, Switch to spectator/player, Theme |
| `InviteDialog` | Shows the URL with a Copy button (toast "Link copied") and a QR code |
| `PokerTable` | Distributes players around the table: alternate top and bottom first, then left and right once top and bottom each hold more than 6 players. Spectators are listed as a small "Spectators (n)" chip, not seated |
| `Seat` | Shows a card slot above the name. The slot is empty if the player has not voted, a face-down card (brand color) if they have, and a face-up value (Framer Motion Y-flip, staggered 50 ms) once revealed. The facilitator gets a 👑 badge; offline players are shown at 50% opacity |
| `TableCenter` | voting + 0 votes → "Pick your cards!"; voting + at least 1 vote + permitted → "Reveal cards" button; counting → large number 3/2/1 (from `countdownEndsAt`); revealed + permitted → "Start new vote". Non-permitted users see status text instead |
| `Deck` | A horizontal row of cards. The selected card is lifted with a ring. Clicking the selected card again deselects it. Keyboard: arrow keys move focus, Enter/Space selects. Hidden for spectators |
| `ResultsPanel` | Distribution as cards with count bars; average (if `showAverage` and not null); an agreement donut (percentage) with a 🎉 message on consensus |
| `IssuesDrawer` | List with title, link icon, and an estimate badge; "Voting now" highlight on the current issue; per-item actions (Vote this issue, Edit, Delete); drag handle to reorder (`@dnd-kit/sortable`); "+ Add an issue" inline form; bulk add by pasting multiple lines (one issue per line); footer showing "N issues · Total: X points" (sum of numeric estimates). Mutation controls are hidden if the user lacks permission |
| `EstimateBar` | Shown when revealed and a current issue exists: a select pre-filled with `results.suggested` plus a Save button → `issue:setEstimate` |
| `SettingsDialog` | Who can reveal, who can manage issues, show average, countdown, auto-reveal, transfer facilitator (player select) |
| `ConnectionBanner` | "Reconnecting…" while the socket is disconnected |

Styling: use Tailwind with shadcn primitives (Button, Dialog, Select, Switch, DropdownMenu, Sheet, Toast via `sonner`). Support light and dark themes (`next-themes`). The layout must work at a 360 px width: on mobile the table becomes a vertical grid of seats and the deck scrolls horizontally.

## 10. Testing

**Unit (Vitest, `packages/shared`)** — at minimum:
- `toSnapshot` hides votes and results in the `voting` and `counting` states, and exposes them in `revealed`.
- `castVote` rejects spectators, rejects values not in the deck, and rejects votes while revealed.
- Auto-reveal fires only when all *connected* players have voted.
- Permission matrix for reveal, reset, and issue operations under both `all` and `facilitator`.
- `results`: average with `½`, `?`, and `☕`; t-shirt deck returns `average = null`; ties in `suggested` pick the higher card; agreement and consensus.
- `reorderIssues` rejects arrays that are not permutations.
- `selectIssue` resets votes.

**Integration (Vitest, `apps/socket`, MemoryRepository)** — start the server on a random port and connect multiple `socket.io-client` instances:
- Create, join, and vote: the other clients receive `hasVoted: true`, and the **raw serialized payload does not contain the vote value**.
- Reveal with the countdown (use fake timers) produces `counting` and then `revealed`.
- Reconnecting with a token restores the same `playerId` and keeps the vote.
- The creator secret grants facilitator; a second joiner is not the facilitator.
- Invalid payloads produce `INVALID_PAYLOAD`; exceeding the rate limit produces `RATE_LIMITED`.

**E2E (Playwright, `apps/web/e2e`)** — run the web and socket (memory repo) servers:
- Two browser contexts: A creates a game, B joins through the link, both vote, A reveals, both see the same results, and A starts a new vote.
- Add an issue, vote on it, and save the estimate; the total updates in both contexts.

## 11. Deployment

1. **Supabase:** create a project in the same region as Render. Copy the direct connection string into `DATABASE_URL` on Render. Run `pnpm --filter socket prisma migrate deploy` as the Render pre-deploy command.
2. **Render:** create a Web Service from the repo. Build: `pnpm install --frozen-lockfile && pnpm --filter shared build && pnpm --filter socket build`. Start: `pnpm --filter socket start`. Health check path: `/health`. Env: `DATABASE_URL`, `CORS_ORIGINS`, `PORT` (supplied by Render). Use the Starter plan to avoid cold starts.
3. **Vercel:** import the repo with root directory `apps/web`. Env: `NEXT_PUBLIC_SOCKET_URL=https://<render-service>.onrender.com`. Add the Vercel domain to `CORS_ORIGINS`.
4. Add a `render.yaml` blueprint and a root `README.md` covering local setup (`pnpm i`, `pnpm dev` runs web and socket together using `concurrently`, with `USE_MEMORY_REPO=true` so no DB is needed locally).

## 12. Implementation Steps (execute in order)

| # | Step | Verification |
|---|---|---|
| 1 | Scaffold the monorepo: root `package.json` (scripts `dev`, `build`, `typecheck`, `lint`, `test`), workspace file, base tsconfig, ESLint + Prettier, `.gitignore`, `git init` | `pnpm i` succeeds |
| 2 | `packages/shared`: decks, types, schemas, events, results, engine, `toSnapshot` | Unit tests from §10 pass |
| 3 | `apps/socket`: config, repository interface, MemoryRepository, gameStore with per-game queue, auth, rateLimit, HTTP routes, socket handlers, timers | Integration tests from §10 pass |
| 4 | Prisma schema + PrismaRepository + initial migration; cleanup job | `prisma validate`; the server boots against a local Postgres or Supabase and survives a create → join → restart → rejoin cycle |
| 5 | `apps/web` scaffold: Next.js, Tailwind, shadcn, theme, `lib/*`, Zustand store | `pnpm --filter web build` succeeds |
| 6 | Create page + JoinDialog + game room connection + PokerTable/Seat/TableCenter/Deck/ResultsPanel | Manually: two browser tabs can play a full round |
| 7 | IssuesDrawer, EstimateBar, SettingsDialog, InviteDialog, Header menus, ConnectionBanner | Manually: every action in §7.2 works from the UI and permissions hide controls correctly |
| 8 | Responsive/mobile layout, dark mode, keyboard + ARIA labels, animations | Lighthouse accessibility score ≥ 90; usable at a 360 px width |
| 9 | Playwright E2E tests | E2E tests from §10 pass |
| 10 | `render.yaml`, `.env.example` files, README, deployment config | Deployed per §11; the two-device game works in production |

## 13. Out of Scope

User accounts or login, paid plans, Jira or other integrations, vote history reports, chat, multiple socket instances (Redis adapter), and internationalization.
