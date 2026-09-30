"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PlayerView } from "@planning-poker/shared";
import { cn } from "@/lib/cn";
import { parsePlayer } from "@/lib/avatar";
import { Avatar } from "./Avatar";

/** PLAN.md §9.3: a card slot and player avatar with name. */
export function Seat({
  player,
  revealed,
  delayIndex,
}: {
  player: PlayerView;
  revealed: boolean;
  delayIndex: number;
}) {
  const { avatar, displayName } = parsePlayer(player.name);

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-1.5 transition-opacity",
        !player.connected && "opacity-50",
      )}
    >
      {/* Playing Card Slot */}
      <div className="relative h-16 w-11 flex-shrink-0">
        {player.hasVoted && !revealed && (
          <motion.div
            initial={{ scale: 0.6, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
            className="card-face-down relative h-16 w-11 rounded-lg border-2 border-brand-400 shadow-lg shadow-black/40 ring-1 ring-white/20"
            aria-label="Voted"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/80 text-white shadow-sm">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            </div>
          </motion.div>
        )}

        {revealed && player.vote !== null && (
          <motion.div
            initial={{ rotateY: 90, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ delay: delayIndex * 0.05, duration: 0.35, type: "spring" }}
            className="card-face-up relative flex h-16 w-11 flex-col items-center justify-center rounded-lg border-2 border-slate-300 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-xl dark:border-slate-600 dark:from-slate-800 dark:to-slate-850 dark:text-slate-100"
          >
            <span className="text-base font-bold tracking-tight">{player.vote}</span>
          </motion.div>
        )}

        {!player.hasVoted && (
          <div className="flex h-16 w-11 items-center justify-center rounded-lg border-2 border-dashed border-emerald-400/30 bg-emerald-950/20 shadow-inner dark:border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/30" />
          </div>
        )}
      </div>

      {/* Avatar & Player Info */}
      <div className="flex flex-col items-center gap-1">
        <Avatar
          avatar={avatar}
          name={displayName}
          size="md"
          connected={player.connected}
          isFacilitator={player.isFacilitator}
        />

        <span
          title={displayName}
          className="max-w-[84px] truncate rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-center text-[11px] font-medium text-white shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          {displayName}
        </span>
      </div>
    </div>
  );
}

