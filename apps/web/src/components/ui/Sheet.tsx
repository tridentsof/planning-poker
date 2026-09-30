"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** A right-side drawer, built on the same Dialog primitive as Dialog.tsx (used for IssuesDrawer). */
export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;

export function SheetContent({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <RadixDialog.Content
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white p-4 shadow-xl dark:bg-slate-900",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
          <RadixDialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Close
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </RadixDialog.Close>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
