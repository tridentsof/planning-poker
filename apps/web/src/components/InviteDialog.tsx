"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

/** PLAN.md §9.3: shows the game link with a Copy button and a QR code. */
export function InviteDialog({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Invite players
        </Button>
      </DialogTrigger>
      <DialogContent title="Invite players" description="Share this link or QR code with your team.">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-md bg-white p-3">
            <QRCodeSVG value={url} size={160} />
          </div>
          <div className="flex w-full items-center gap-2">
            <input
              readOnly
              value={url}
              className="h-10 flex-1 truncate rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <Button size="md" variant="secondary" onClick={copyLink} aria-label="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
