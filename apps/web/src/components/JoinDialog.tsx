"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { AVATAR_PRESETS, formatPlayer } from "@/lib/avatar";
import { AvatarPickerModal } from "./AvatarPickerModal";
import { cn } from "@/lib/cn";

/** Shown on first visit to a game room when there is no stored display name (PLAN.md §9.2). */
export function JoinDialog({ onJoin }: { onJoin: (name: string, spectator: boolean) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATAR_PRESETS[0]);
  const [spectator, setSpectator] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) return;
    onJoin(formatPlayer(avatar, trimmed), spectator);
  }

  // Quick picks: 6 popular avatars
  const quickPicks = AVATAR_PRESETS.slice(0, 6);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
        >
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Join the game</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose your name and avatar for the poker table</p>

          {/* Avatar selector section */}
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Select Avatar
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                title="Click to change avatar"
                className="group relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-brand-500 bg-brand-50/80 text-2xl shadow-sm transition-all hover:scale-105 active:scale-95 dark:border-brand-500 dark:bg-brand-950/50"
              >
                <span className="select-none leading-none">{avatar}</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white shadow">
                  ✎
                </span>
              </button>

              <div className="flex flex-1 items-center justify-between gap-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-950/60">
                {quickPicks.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAvatar(preset)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-transform hover:scale-110 active:scale-95",
                      avatar === preset
                        ? "border border-brand-500 bg-brand-100 dark:bg-brand-900/60"
                        : "hover:bg-slate-200/60 dark:hover:bg-slate-800",
                    )}
                  >
                    <span className="select-none leading-none">{preset}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex h-9 px-2 items-center justify-center rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/50"
                  title="More avatars"
                >
                  More
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Your name
            </label>
            <input
              id="display-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={25}
              required
              placeholder="e.g. Alex"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="join-spectator" className="text-sm text-slate-700 dark:text-slate-300">
              Join as spectator
            </label>
            <Switch id="join-spectator" checked={spectator} onCheckedChange={setSpectator} aria-label="Join as spectator" />
          </div>

          <Button type="submit" size="lg" className="mt-6 w-full">
            Join Game
          </Button>
        </form>
      </div>

      <AvatarPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentAvatar={avatar}
        onSelect={(newAvatar) => setAvatar(newAvatar)}
      />
    </>
  );
}

