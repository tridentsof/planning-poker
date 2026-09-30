"use client";

import { MotionConfig } from "framer-motion";

/**
 * Global motion discipline (design-taste §6.B): every framer-motion animation
 * in the app collapses to instant when the user prefers reduced motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
