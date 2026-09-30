"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { ChevronDown, ListChecks, Settings2 } from "lucide-react";
import type { GameSnapshot, PlayerView } from "@planning-poker/shared";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { InviteDialog } from "./InviteDialog";
import { SettingsDialog } from "./SettingsDialog";
import { IssuesDrawer } from "./IssuesDrawer";
import { AvatarPickerModal } from "./AvatarPickerModal";
import { parsePlayer, formatPlayer } from "@/lib/avatar";

export function Header({
  snapshot,
  self,
  inviteUrl,
  onRenameGame,
  onUpdateSettings,
  onTransferFacilitator,
  onRenamePlayer,
  onSetRole,
  onAddIssue,
  onBulkAddIssues,
  onUpdateIssue,
  onDeleteIssue,
  onReorderIssues,
  onSelectIssue,
}: {
  snapshot: GameSnapshot;
  self: PlayerView | null;
  inviteUrl: string;
  onRenameGame: (name: string) => void;
  onUpdateSettings: (partial: Partial<GameSnapshot["settings"]>) => void;
  onTransferFacilitator: (playerId: string) => void;
  onRenamePlayer: (name: string) => void;
  onSetRole: (role: "player" | "spectator") => void;
  onAddIssue: (title: string) => void;
  onBulkAddIssues: (titles: string[]) => void;
  onUpdateIssue: (id: string, title: string, url: string | null) => void;
  onDeleteIssue: (id: string) => void;
  onReorderIssues: (ids: string[]) => void;
  onSelectIssue: (id: string | null) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [renaming, setRenaming] = useState(false);
  const [gameName, setGameName] = useState(snapshot.name);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const canManageIssues = snapshot.settings.whoCanManageIssues === "all" || self?.isFacilitator;

  const { avatar: selfAvatar, displayName: selfName } = parsePlayer(self?.name ?? "");

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        <div className="flex items-center gap-1.5">
          {renaming ? (
            <input
              autoFocus
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              onBlur={() => {
                setRenaming(false);
                if (gameName.trim()) onRenameGame(gameName.trim());
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="h-8 rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          ) : (
            <h1
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
              onDoubleClick={() => self?.isFacilitator && setRenaming(true)}
            >
              {snapshot.name}
            </h1>
          )}
          {self?.isFacilitator && (
            <SettingsDialog
              settings={snapshot.settings}
              players={snapshot.players}
              selfIsFacilitator={self.isFacilitator}
              onUpdateSettings={onUpdateSettings}
              onTransferFacilitator={onTransferFacilitator}
              trigger={
                <button
                  aria-label="Game settings"
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <InviteDialog url={inviteUrl} />
          <IssuesDrawer
            issues={snapshot.issues}
            currentIssueId={snapshot.currentIssueId}
            canManage={Boolean(canManageIssues)}
            onAdd={onAddIssue}
            onBulkAdd={onBulkAddIssues}
            onUpdate={onUpdateIssue}
            onDelete={onDeleteIssue}
            onReorder={onReorderIssues}
            onSelect={onSelectIssue}
            trigger={
              <Button variant="secondary" size="sm">
                <ListChecks className="h-4 w-4" /> Issues
              </Button>
            }
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Account menu"
                className="flex items-center gap-1.5 rounded-full border border-slate-300 py-1 pl-1.5 pr-2.5 text-sm transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:hover:border-brand-500 dark:hover:text-brand-300"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm select-none dark:bg-slate-800">
                  {selfAvatar}
                </span>
                <span className="max-w-[100px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                  {selfName}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setAvatarModalOpen(true)}>
                Change avatar
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const newName = window.prompt("Your name", selfName);
                  if (newName && newName.trim()) {
                    onRenamePlayer(formatPlayer(selfAvatar, newName.trim()));
                  }
                }}
              >
                Change name
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onSetRole(self?.role === "spectator" ? "player" : "spectator")}>
                {self?.role === "spectator" ? "Switch to player" : "Switch to spectator"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setTheme("light")}>
                {theme === "light" ? "✓ " : ""}Light
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTheme("dark")}>
                {theme === "dark" ? "✓ " : ""}Dark
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTheme("system")}>
                {theme === "system" ? "✓ " : ""}System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AvatarPickerModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        currentAvatar={selfAvatar}
        onSelect={(newAvatar) => {
          onRenamePlayer(formatPlayer(newAvatar, selfName));
        }}
      />
    </>
  );
}
