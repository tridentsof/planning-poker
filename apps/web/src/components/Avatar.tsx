"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/cn";
import { getAvatarColor } from "@/lib/avatar";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<AvatarSize, { container: string; text: string; crown: string; badge: string }> = {
  sm: { container: "h-7 w-7", text: "text-sm", crown: "h-3 w-3 -top-1.5 -right-1.5", badge: "h-2 w-2" },
  md: { container: "h-9 w-9", text: "text-lg", crown: "h-3.5 w-3.5 -top-1.5 -right-1.5", badge: "h-2.5 w-2.5" },
  lg: { container: "h-12 w-12", text: "text-2xl", crown: "h-4 w-4 -top-2 -right-2", badge: "h-3 w-3" },
  xl: { container: "h-16 w-16", text: "text-3xl", crown: "h-5 w-5 -top-2 -right-2", badge: "h-3.5 w-3.5" },
};

export function Avatar({
  avatar,
  name,
  size = "md",
  connected,
  isFacilitator,
  className,
  onClick,
}: {
  avatar: string;
  name: string;
  size?: AvatarSize;
  connected?: boolean;
  isFacilitator?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const config = sizeMap[size];
  const palette = getAvatarColor(name);

  return (
    <div className={cn("relative inline-flex flex-shrink-0 items-center justify-center", className)}>
      <div
        onClick={onClick}
        className={cn(
          config.container,
          "relative flex items-center justify-center rounded-full border shadow-sm transition-all",
          "bg-gradient-to-b from-white/90 to-slate-100/90 dark:from-slate-800/90 dark:to-slate-900/90",
          "border-slate-200/80 dark:border-slate-700/80",
          onClick && "cursor-pointer hover:scale-105 active:scale-95",
        )}
      >
        <span className={cn(config.text, "select-none leading-none")} role="img" aria-label={name}>
          {avatar}
        </span>
      </div>

      {isFacilitator && (
        <span
          className={cn(
            "absolute z-10 flex items-center justify-center rounded-full bg-amber-400 p-0.5 text-amber-950 shadow-sm",
            config.crown,
          )}
          title="Facilitator"
        >
          <Crown className="h-full w-full fill-amber-950" />
        </span>
      )}

      {connected !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 z-10 rounded-full border-2 border-white dark:border-slate-900",
            config.badge,
            connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-slate-400 opacity-60",
          )}
          title={connected ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
