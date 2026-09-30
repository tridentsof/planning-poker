"use client";

import type { PlayerView } from "@planning-poker/shared";
import { Seat } from "./Seat";
import { TableCenter } from "./TableCenter";
import type { GameStatus } from "@planning-poker/shared";

const MAX_TOP_BOTTOM = 6;

/**
 * Distributes seated players around the table (PLAN.md §9.3): alternate top/bottom first,
 * then left/right once top and bottom each hold more than MAX_TOP_BOTTOM players.
 */
function distributeSeats(players: PlayerView[]) {
  const top: PlayerView[] = [];
  const bottom: PlayerView[] = [];
  const left: PlayerView[] = [];
  const right: PlayerView[] = [];

  players.forEach((player, i) => {
    if (top.length <= MAX_TOP_BOTTOM || bottom.length <= MAX_TOP_BOTTOM) {
      (i % 2 === 0 ? top : bottom).push(player);
    } else {
      (i % 2 === 0 ? left : right).push(player);
    }
  });

  return { top, bottom, left, right };
}

function SeatRow({ players, revealed }: { players: PlayerView[]; revealed: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {players.map((p, i) => (
        <Seat key={p.id} player={p} revealed={revealed} delayIndex={i} />
      ))}
    </div>
  );
}

export function PokerTable({
  players,
  spectatorCount,
  status,
  countdownEndsAt,
  hasVotes,
  canAct,
  onReveal,
  onReset,
}: {
  players: PlayerView[];
  spectatorCount: number;
  status: GameStatus;
  countdownEndsAt: number | null;
  hasVotes: boolean;
  canAct: boolean;
  onReveal: () => void;
  onReset: () => void;
}) {
  const { top, bottom, left, right } = distributeSeats(players);
  const revealed = status === "revealed";

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <SeatRow players={top} revealed={revealed} />
      <div className="flex w-full items-center justify-center gap-6">
        <SeatRow players={left} revealed={revealed} />
        <TableCenter
          status={status}
          countdownEndsAt={countdownEndsAt}
          hasVotes={hasVotes}
          canAct={canAct}
          onReveal={onReveal}
          onReset={onReset}
        />
        <SeatRow players={right} revealed={revealed} />
      </div>
      <SeatRow players={bottom} revealed={revealed} />
      {spectatorCount > 0 && (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Spectators ({spectatorCount})
        </span>
      )}
    </div>
  );
}
