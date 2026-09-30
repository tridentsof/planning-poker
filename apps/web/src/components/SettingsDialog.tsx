"use client";

import type { GameSettings, PlayerView } from "@planning-poker/shared";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";

const PERMISSION_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "facilitator", label: "Facilitator only" },
];

/** PLAN.md §9.3. Facilitator-only controls. */
export function SettingsDialog({
  settings,
  players,
  selfIsFacilitator,
  onUpdateSettings,
  onTransferFacilitator,
  trigger,
}: {
  settings: GameSettings;
  players: PlayerView[];
  selfIsFacilitator: boolean;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onTransferFacilitator: (playerId: string) => void;
  trigger: React.ReactNode;
}) {
  if (!selfIsFacilitator) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Game settings">
        <div className="space-y-4">
          <SettingRow label="Who can reveal cards">
            <Select
              value={settings.whoCanReveal}
              onValueChange={(v) => onUpdateSettings({ whoCanReveal: v as "all" | "facilitator" })}
              options={PERMISSION_OPTIONS}
              aria-label="Who can reveal cards"
            />
          </SettingRow>
          <SettingRow label="Who can manage issues">
            <Select
              value={settings.whoCanManageIssues}
              onValueChange={(v) => onUpdateSettings({ whoCanManageIssues: v as "all" | "facilitator" })}
              options={PERMISSION_OPTIONS}
              aria-label="Who can manage issues"
            />
          </SettingRow>
          <SettingRow label="Show average">
            <Switch
              checked={settings.showAverage}
              onCheckedChange={(v) => onUpdateSettings({ showAverage: v })}
              aria-label="Show average"
            />
          </SettingRow>
          <SettingRow label="Show countdown">
            <Switch
              checked={settings.showCountdown}
              onCheckedChange={(v) => onUpdateSettings({ showCountdown: v })}
              aria-label="Show countdown"
            />
          </SettingRow>
          <SettingRow label="Auto-reveal when everyone has voted">
            <Switch
              checked={settings.autoReveal}
              onCheckedChange={(v) => onUpdateSettings({ autoReveal: v })}
              aria-label="Auto-reveal"
            />
          </SettingRow>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Transfer facilitator
            </p>
            <div className="flex flex-wrap gap-2">
              {players
                .filter((p) => !p.isFacilitator)
                .map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="secondary"
                    onClick={() => onTransferFacilitator(p.id)}
                  >
                    Make {p.name} facilitator
                  </Button>
                ))}
              {players.filter((p) => !p.isFacilitator).length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No other players yet.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </div>
  );
}
