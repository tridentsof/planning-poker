"use client";

import type { PlayerView, GameStatus } from "@planning-poker/shared";
import { Seat } from "./Seat";
import { TableCenter } from "./TableCenter";
import { Users } from "lucide-react";

const MAX_TOP_BOTTOM = 6;

/**
 * Distributes seated players around the table: alternate top/bottom first,
 * then left/right once top and bottom each hold more than MAX_TOP_BOTTOM players.
 */
function distributeSeats(players: PlayerView[]) {
  const top: PlayerView[] = [];
  const bottom: PlayerView[] = [];
  const left: PlayerView[] = [];
  const right: PlayerView[] = [];

  players.forEach((player, i) => {
    if (top.length < MAX_TOP_BOTTOM && bottom.length <= top.length) {
      top.push(player);
    } else if (bottom.length < MAX_TOP_BOTTOM) {
      bottom.push(player);
    } else {
      (i % 2 === 0 ? left : right).push(player);
    }
  });

  return { top, bottom, left, right };
}

function SeatRow({
  players,
  revealed,
  vertical = false,
}: {
  players: PlayerView[];
  revealed: boolean;
  vertical?: boolean;
}) {
  if (players.length === 0) return null;
  return (
    <div
      className={
        vertical
          ? "flex flex-col items-center justify-center gap-3"
          : "flex flex-wrap items-center justify-center gap-4 sm:gap-6 px-2"
      }
    >
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
  consensus = false,
  onReveal,
  onReset,
}: {
  players: PlayerView[];
  spectatorCount: number;
  status: GameStatus;
  countdownEndsAt: number | null;
  hasVotes: boolean;
  canAct: boolean;
  consensus?: boolean;
  onReveal: () => void;
  onReset: () => void;
}) {
  const { top, bottom, left, right } = distributeSeats(players);
  const revealed = status === "revealed";

  return (
    <div className="flex w-full flex-col items-center gap-4 py-2 sm:py-4">
      {/* 
        AUTHENTIC CASINO POKER TABLE
        Layer 1: Heavy Padded Leather Armrest Rail (Outer Bumper)
      */}
      <div className="relative w-full max-w-5xl rounded-[52px] sm:rounded-[80px] p-2.5 sm:p-4 bg-gradient-to-b from-[#302823] via-[#1d1815] to-[#100d0b] dark:from-[#252c37] dark:via-[#161a22] dark:to-[#0d0f14] border-[3px] sm:border-4 border-[#443831] dark:border-[#2f3846] shadow-[0_28px_65px_-15px_rgba(0,0,0,0.75),0_12px_24px_-8px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.18)]">
        
        {/* Layer 2: Wood Racetrack / Metallic Brass Trim */}
        <div className="rounded-[44px] sm:rounded-[70px] p-2 sm:p-3.5 bg-gradient-to-b from-[#3b200e] via-[#241206] to-[#140a03] dark:from-[#1b222c] dark:to-[#0f141a] border border-amber-600/35 shadow-[inset_0_2px_12px_rgba(0,0,0,0.85)]">
          
          {/* Layer 3: Casino Green Felt Surface */}
          <div className="relative flex min-h-[380px] sm:min-h-[460px] flex-col justify-between overflow-hidden rounded-[36px] sm:rounded-[58px] p-4 sm:p-6 bg-[radial-gradient(ellipse_at_center,_#0f5f3e_0%,_#0a452c_45%,_#052c1b_82%,_#021b10_100%)] dark:bg-[radial-gradient(ellipse_at_center,_#105944_0%,_#0a3f30_45%,_#05281e_82%,_#021711_100%)] border border-emerald-400/25 shadow-[inset_0_6px_36px_rgba(0,0,0,0.65)]">
            
            {/* Printed Betting Line Oval on the Felt */}
            <div className="pointer-events-none absolute inset-4 sm:inset-7 rounded-[28px] sm:rounded-[48px] border border-amber-300/20 sm:border-amber-300/25 shadow-[0_0_20px_rgba(251,191,36,0.06)]" />

            {/* Subtle Felt Watermark */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-15 select-none text-emerald-200">
              <div className="text-xl sm:text-2xl tracking-widest font-serif">♠ ♥ ♣ ♦</div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] mt-1">Planning Poker</span>
            </div>

            {/* TOP SEATS ROW */}
            <div className="relative z-10 flex min-h-[92px] items-center justify-center">
              {top.length > 0 ? (
                <SeatRow players={top} revealed={revealed} />
              ) : (
                <div className="h-6" />
              )}
            </div>

            {/* TABLE CENTER ROW (with left/right players if present) */}
            <div className="relative z-10 flex w-full items-center justify-around gap-2 px-1 sm:px-4">
              <SeatRow players={left} revealed={revealed} vertical />

              <TableCenter
                status={status}
                countdownEndsAt={countdownEndsAt}
                hasVotes={hasVotes}
                canAct={canAct}
                onReveal={onReveal}
                onReset={onReset}
              />

              <SeatRow players={right} revealed={revealed} vertical />
            </div>

            {/* BOTTOM SEATS ROW */}
            <div className="relative z-10 flex min-h-[92px] items-center justify-center">
              {bottom.length > 0 ? (
                <SeatRow players={bottom} revealed={revealed} />
              ) : (
                <div className="h-6" />
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Spectator Count Badge */}
      {spectatorCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span>Spectators ({spectatorCount})</span>
        </div>
      )}
    </div>
  );
}

