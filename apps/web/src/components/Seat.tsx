"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import type { PlayerView } from "@planning-poker/shared";
import { cn } from "@/lib/cn";

/** PLAN.md §9.3: a card slot above a player's name. */
export function Seat({ player, revealed, delayIndex }: { player: PlayerView; revealed: boolean; delayIndex: number }) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", !player.connected && "opacity-50")}>
      <div className="relative h-16 w-11">
        {player.hasVoted && !revealed && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="card-face-down h-16 w-11 rounded-lg border-2 shadow-md shadow-brand-900/20"
            aria-label="Voted"
          />
        )}
        {revealed && player.vote !== null && (
          <motion.div
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            transition={{ delay: delayIndex * 0.05, duration: 0.3 }}
            className="card-face-up flex h-16 w-11 items-center justify-center rounded-lg border-2 text-sm font-semibold shadow-md"
          >
            {player.vote}
          </motion.div>
        )}
        {!player.hasVoted && (
          <div className="h-16 w-11 rounded-lg border-2 border-dashed border-slate-300 bg-white/50 dark:border-slate-600 dark:bg-slate-800/50" />
        )}
        {player.isFacilitator && (
          <Crown className="absolute -right-1.5 -top-1.5 h-4 w-4 fill-amber-400 text-amber-500" aria-label="Facilitator" />
        )}
      </div>
      <span className="max-w-[80px] truncate rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
        {player.name}
      </span>
    </div>
  );
}
