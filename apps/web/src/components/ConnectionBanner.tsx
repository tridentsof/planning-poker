"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ConnectionStatus } from "@/store/gameStore";

/** PLAN.md §9.3: slides in while the socket is disconnected/reconnecting. */
export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  return (
    <AnimatePresence initial={false}>
      {status !== "connected" && (
        <motion.div
          key="connection-banner"
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="w-full bg-amber-500 py-1.5 text-center text-sm font-medium text-white">
            {status === "connecting" ? "Connecting…" : "Reconnecting…"}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
