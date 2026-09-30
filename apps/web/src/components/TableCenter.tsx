"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { GameStatus } from "@planning-poker/shared";

function useCountdownSeconds(endsAt: number | null): number {
  const [seconds, setSeconds] = useState(() => (endsAt ? Math.ceil((endsAt - Date.now()) / 1000) : 0));
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return seconds;
}

/**
 * Center console of the poker table — status, reveal/reset actions, and countdown.
 */
export function TableCenter({
  status,
  countdownEndsAt,
  hasVotes,
  canAct,
  onReveal,
  onReset,
}: {
  status: GameStatus;
  countdownEndsAt: number | null;
  hasVotes: boolean;
  canAct: boolean;
  onReveal: () => void;
  onReset: () => void;
}) {
  const seconds = useCountdownSeconds(countdownEndsAt);

  return (
    <div className="relative z-10 flex min-h-[110px] w-full max-w-[280px] sm:max-w-xs flex-col items-center justify-center gap-2.5 rounded-2xl border border-amber-400/20 bg-black/40 px-5 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
      {status === "voting" && !hasVotes && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Voting in progress</span>
          </div>
          <p className="text-sm font-medium text-emerald-100/90">Pick your card below</p>
        </div>
      )}

      {status === "voting" && hasVotes && canAct && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={onReveal}
            className="border-amber-400/50 bg-gradient-to-b from-white to-amber-50 font-bold text-slate-900 shadow-xl shadow-amber-500/20 hover:border-amber-400 hover:bg-white"
          >
            <Eye className="h-4 w-4 text-amber-600" />
            Reveal cards
          </Button>
        </motion.div>
      )}

      {status === "voting" && hasVotes && !canAct && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Votes placed</span>
          <p className="text-sm font-medium text-emerald-100/80">Waiting for facilitator to reveal…</p>
        </div>
      )}

      {status === "counting" && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Revealing in</span>
          <p aria-live="assertive" className="text-5xl font-black tabular-nums text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={Math.max(1, seconds)}
                initial={{ y: -16, opacity: 0, scale: 1.3 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 16, opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-block"
              >
                {Math.max(1, seconds)}
              </motion.span>
            </AnimatePresence>
          </p>
        </div>
      )}

      {status === "revealed" && canAct && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={onReset}
            className="border-emerald-400/50 bg-gradient-to-b from-white to-emerald-50 font-bold text-slate-900 shadow-xl shadow-emerald-500/20 hover:border-emerald-400 hover:bg-white"
          >
            <RotateCcw className="h-4 w-4 text-emerald-600" />
            Start new vote
          </Button>
        </motion.div>
      )}

      {status === "revealed" && !canAct && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Cards Revealed</span>
          <p className="text-sm font-medium text-emerald-100/80">Waiting for next round…</p>
        </div>
      )}
    </div>
  );
}

