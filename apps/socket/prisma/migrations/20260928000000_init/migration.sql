-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('voting', 'counting', 'revealed');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('all', 'facilitator');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('player', 'spectator');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('pending', 'voted');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "deckType" TEXT NOT NULL,
    "deck" TEXT[],
    "creatorSecretHash" TEXT NOT NULL,
    "facilitatorId" TEXT,
    "whoCanReveal" "Permission" NOT NULL DEFAULT 'all',
    "whoCanManageIssues" "Permission" NOT NULL DEFAULT 'all',
    "showAverage" BOOLEAN NOT NULL DEFAULT true,
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "autoReveal" BOOLEAN NOT NULL DEFAULT false,
    "status" "GameStatus" NOT NULL DEFAULT 'voting',
    "currentIssueId" TEXT,
    "currentRoundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "role" "PlayerRole" NOT NULL DEFAULT 'player',
    "tokenHash" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "url" VARCHAR(500),
    "position" INTEGER NOT NULL,
    "finalEstimate" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "issueId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("roundId","playerId")
);

-- CreateIndex
CREATE INDEX "Game_lastActivityAt_idx" ON "Game"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Player_gameId_idx" ON "Player"("gameId");

-- CreateIndex
CREATE INDEX "Issue_gameId_position_idx" ON "Issue"("gameId", "position");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

