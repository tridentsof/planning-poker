"use client";

import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({
  children,
  align = "end",
}: {
  children: React.ReactNode;
  align?: "start" | "end" | "center";
}) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-[200px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  className,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-slate-700 outline-none",
        "data-[highlighted]:bg-brand-50 dark:text-slate-200 dark:data-[highlighted]:bg-slate-700",
        className,
      )}
    >
      {children}
    </RadixDropdown.Item>
  );
}

export const DropdownMenuSeparator = () => (
  <RadixDropdown.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
);
