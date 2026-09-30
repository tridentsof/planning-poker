"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { AVATAR_PRESETS } from "@/lib/avatar";
import { cn } from "@/lib/cn";

export function AvatarPickerModal({
  open,
  onOpenChange,
  currentAvatar,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar: string;
  onSelect: (avatar: string) => void;
}) {
  const [selected, setSelected] = useState(currentAvatar || AVATAR_PRESETS[0]);
  const [customInput, setCustomInput] = useState("");

  function handleSave() {
    onSelect(selected);
    onOpenChange(false);
  }

  function handleCustomChange(val: string) {
    setCustomInput(val);
    const trimmed = val.trim();
    if (trimmed) {
      // Pick first emoji/character
      const char = Array.from(trimmed)[0];
      if (char) setSelected(char);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Choose your avatar" description="Pick an avatar to display at your poker table seat." className="max-w-md">
        <div className="flex flex-col items-center gap-5 pt-2">
          {/* Active Preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-brand-500 bg-brand-50 shadow-inner dark:border-brand-500 dark:bg-brand-950/40">
              <span className="text-4xl select-none">{selected}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Current preview</span>
          </div>

          {/* Preset Grid */}
          <div className="grid w-full grid-cols-6 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            {AVATAR_PRESETS.map((preset) => {
              const isCurrent = preset === selected;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelected(preset)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-all",
                    "hover:scale-110 active:scale-95",
                    isCurrent
                      ? "border-2 border-brand-500 bg-brand-100/80 shadow-sm dark:bg-brand-900/50"
                      : "border border-transparent bg-white hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700",
                  )}
                  aria-label={`Select ${preset}`}
                >
                  <span className="select-none">{preset}</span>
                </button>
              );
            })}
          </div>

          {/* Custom emoji input */}
          <div className="flex w-full items-center gap-2">
            <label htmlFor="custom-avatar-input" className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Or type custom:
            </label>
            <input
              id="custom-avatar-input"
              value={customInput}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="e.g. 🍀, 🦁, 🌟"
              maxLength={4}
              className="h-9 w-28 rounded-lg border border-slate-300 px-2.5 text-center text-sm transition-colors focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {/* Footer actions */}
          <div className="flex w-full justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Avatar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
