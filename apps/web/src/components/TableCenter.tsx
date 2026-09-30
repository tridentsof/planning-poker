"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
 * PLAN.md §9.3: the center of the poker table — status text, reveal/reset controls,
 * countdown. Rendered as the table's felt oval; controls sit on the felt in white
 * for contrast (emerald-on-emerald buttons would fail the contrast check).
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
    <div className="flex h-36 w-full max-w-md flex-col items-center justify-center gap-3 rounded-full border-[6px] border-amber-900/70 bg-gradient-to-br from-brand-600 to-brand-800 text-center shadow-[inset_0_2px_16px_rgba(0,0,0,0.35),0_8px_24px_rgba(0,0,0,0.15)] dark:border-amber-950">
      {status === "voting" && !hasVotes && (
        <p className="text-sm font-medium text-brand-50/90">Pick your cards!</p>
      )}
      {status === "voting" && hasVotes && canAct && (
        <Button variant="secondary" onClick={onReveal}>
          Reveal cards
        </Button>
      )}
      {status === "voting" && hasVotes && !canAct && (
        <p className="text-sm font-medium text-brand-50/90">Waiting for reveal…</p>
      )}
      {status === "counting" && (
        <p aria-live="assertive" className="text-4xl font-bold tabular-nums text-white">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={Math.max(1, seconds)}
              initial={{ y: -14, opacity: 0, scale: 1.25 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="inline-block"
            >
              {Math.max(1, seconds)}
            </motion.span>
          </AnimatePresence>
        </p>
      )}
      {status === "revealed" && canAct && (
        <Button variant="secondary" onClick={onReset}>
          Start new vote
        </Button>
      )}
      {status === "revealed" && !canAct && (
        <p className="text-sm font-medium text-brand-50/90">Waiting for the next round…</p>
      )}
    </div>
  );
}
