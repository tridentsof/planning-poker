"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";

/** Shown on first visit to a game room when there is no stored display name (PLAN.md §9.2). */
export function JoinDialog({ onJoin }: { onJoin: (name: string, spectator: boolean) => void }) {
  const [name, setName] = useState("");
  const [spectator, setSpectator] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) return;
    onJoin(trimmed, spectator);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Join the game</h2>
        <div className="mt-4">
          <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Your name
          </label>
          <input
            id="display-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
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
          Join
        </Button>
      </form>
    </div>
  );
}
