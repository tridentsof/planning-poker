"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SearchX } from "lucide-react";
import type { GameJoinAck } from "@planning-poker/shared";
import { getSocket } from "@/lib/socket";
import { getPlayerToken, getStoredName, setPlayerToken, setStoredName, getCreatorSecret, clearCreatorSecret } from "@/lib/storage";
import { useGameStore } from "@/store/gameStore";
import { JoinDialog } from "@/components/JoinDialog";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Header } from "@/components/Header";
import { PokerTable } from "@/components/PokerTable";
import { Deck } from "@/components/Deck";
import { ResultsPanel } from "@/components/ResultsPanel";
import { EstimateBar } from "@/components/EstimateBar";

export default function GameRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);
  const {
    snapshot,
    connection,
    selfPlayerId,
    notFound,
    setSnapshot,
    setConnection,
    setSelfPlayerId,
    setNotFound,
  } = useGameStore();
  const joinedRef = useRef(false);
  // The server never echoes our own vote's value back while status !== "revealed" (the hidden-
  // vote invariant applies to every player, including ourselves), so the Deck's "selected" card
  // is tracked locally from our own click rather than read off the snapshot.
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const joinWith = useCallback(
    (name: string, role: "player" | "spectator") => {
      const socket = getSocket();
      const playerToken = getPlayerToken(gameId) ?? undefined;
      const creatorSecret = getCreatorSecret(gameId) ?? undefined;

      socket.emit(
        "game:join",
        { gameId, name, role, playerToken, creatorSecret },
        (ack: GameJoinAck) => {
          if (!ack.ok) {
            if (ack.error === "GAME_NOT_FOUND") setNotFound(true);
            else toast.error(ack.error);
            return;
          }
          setPlayerToken(gameId, ack.playerToken);
          clearCreatorSecret(gameId);
          setSelfPlayerId(ack.playerId);
          setConnection("connected");
        },
      );
    },
    [gameId, setConnection, setNotFound, setSelfPlayerId],
  );

  useEffect(() => {
    const socket = getSocket();
    const storedName = getStoredName();

    function handleConnect() {
      setConnection("connected");
      // Re-emits game:join on every connect, including reconnects, so a dropped connection
      // restores our seat via the stored token (PLAN.md §9.2, §9.3 ConnectionBanner).
      if (storedName) {
        joinedRef.current = true;
        const lastRole = useGameStore.getState().snapshot?.players.find((p) => p.id === selfPlayerId)?.role;
        joinWith(storedName, lastRole ?? "player");
      }
    }
    function handleDisconnect() {
      setConnection("reconnecting");
    }
    function handleGameState(snap: Parameters<typeof setSnapshot>[0]) {
      setSnapshot(snap);
    }
    function handleError(err: { code: string; message: string }) {
      if (err.code !== "RATE_LIMITED") toast.error(err.message);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("game:state", handleGameState);
    socket.on("error", handleError);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("game:state", handleGameState);
      socket.off("error", handleError);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (notFound) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800">
          <SearchX className="h-7 w-7 text-slate-500 dark:text-slate-400" aria-hidden />
        </div>
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Game not found.</p>
        <Link
          href="/"
          className="rounded-lg text-sm font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"
        >
          Create a new game
        </Link>
      </main>
    );
  }

  if (!getStoredName() && !snapshot) {
    return (
      <JoinDialog
        onJoin={(name, spectator) => {
          setStoredName(name);
          joinedRef.current = true;
          joinWith(name, spectator ? "spectator" : "player");
        }}
      />
    );
  }

  if (!snapshot) {
    // Loading state: skeleton cards echo the final layout instead of a bare spinner.
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6">
        <div className="flex gap-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 w-11 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Connecting…</p>
      </main>
    );
  }

  const self = snapshot.players.find((p) => p.id === selfPlayerId) ?? null;
  if (self && !self.hasVoted && selectedCard !== null) {
    // A round reset (or a vote cleared elsewhere, e.g. switching to spectator) clears our pick.
    setSelectedCard(null);
  }
  const canAct = snapshot.settings.whoCanReveal === "all" || Boolean(self?.isFacilitator);
  const canManageIssues = snapshot.settings.whoCanManageIssues === "all" || Boolean(self?.isFacilitator);
  const votingPlayers = snapshot.players.filter((p) => p.role === "player");
  const spectatorCount = snapshot.players.length - votingPlayers.length;
  const currentIssue = snapshot.issues.find((i) => i.id === snapshot.currentIssueId) ?? null;
  const inviteUrl = typeof window !== "undefined" ? window.location.href : "";
  const socket = getSocket();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ConnectionBanner status={connection} />
      <Header
        snapshot={snapshot}
        self={self}
        inviteUrl={inviteUrl}
        onRenameGame={(name) => socket.emit("game:rename", { name })}
        onUpdateSettings={(partial) => socket.emit("game:updateSettings", partial)}
        onTransferFacilitator={(playerId) => socket.emit("facilitator:transfer", { playerId })}
        onRenamePlayer={(name) => {
          setStoredName(name);
          socket.emit("player:rename", { name });
        }}
        onSetRole={(role) => socket.emit("player:setRole", { role })}
        onAddIssue={(title) => socket.emit("issue:add", { title })}
        onBulkAddIssues={(titles) => titles.forEach((title) => socket.emit("issue:add", { title }))}
        onUpdateIssue={(id, title, url) => socket.emit("issue:update", { id, title, url })}
        onDeleteIssue={(id) => socket.emit("issue:delete", { id })}
        onReorderIssues={(ids) => socket.emit("issue:reorder", { ids })}
        onSelectIssue={(issueId) => socket.emit("issue:select", { id: issueId })}
      />

      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-6">
        <PokerTable
          players={votingPlayers}
          spectatorCount={spectatorCount}
          status={snapshot.status}
          countdownEndsAt={snapshot.countdownEndsAt}
          hasVotes={votingPlayers.some((p) => p.hasVoted)}
          canAct={canAct}
          onReveal={() => socket.emit("round:reveal")}
          onReset={() => socket.emit("round:reset")}
        />

        {currentIssue && snapshot.status === "revealed" && snapshot.results && (
          <EstimateBar
            issue={currentIssue}
            deck={snapshot.deck}
            results={snapshot.results}
            canManage={canManageIssues}
            onSave={(value) => socket.emit("issue:setEstimate", { id: currentIssue.id, value })}
          />
        )}
      </main>

      <footer className="sticky bottom-0 z-20 flex flex-col items-center justify-center border-t border-slate-200 bg-white/90 p-2.5 sm:p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        {snapshot.status === "revealed" && snapshot.results ? (
          <ResultsPanel results={snapshot.results} showAverage={snapshot.settings.showAverage} />
        ) : self?.role === "player" ? (
          <Deck
            cards={snapshot.deck}
            selected={selectedCard}
            onSelect={(value) => {
              setSelectedCard(value);
              socket.emit("vote:cast", { value });
            }}
            disabled={snapshot.status !== "voting"}
          />
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            You are spectating this game.
          </p>
        )}
      </footer>
    </div>
  );
}
