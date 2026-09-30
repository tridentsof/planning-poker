"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * PLAN.md §9.3: a horizontal row of selectable cards. Hidden for spectators by the caller.
 * Keyboard: arrow keys move focus (Left/Right, plus Up/Down on the horizontal deck),
 * Enter/Space selects; each card is a native <button> in an ARIA radiogroup.
 * Motion: spring hover-lift + press; collapses to static under prefers-reduced-motion
 * via the app-wide MotionConfig.
 */
export function Deck({
  cards,
  selected,
  onSelect,
  disabled,
}: {
  cards: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  disabled?: boolean;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  function moveFocus(current: number, delta: number) {
    if (cards.length === 0) return;
    const next = (current + delta + cards.length) % cards.length;
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("button[role='radio']");
    buttons?.[next]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(index, -1);
    }
  }

  return (
    <div className="w-full overflow-x-auto py-2.5 px-3 sm:px-6 scrollbar-none flex justify-center">
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Card deck"
        className="mx-auto flex w-fit max-w-full items-center justify-center gap-2 sm:gap-2.5 px-1 py-1"
      >
        {cards.map((card, i) => {
          const isSelected = card === selected;
          return (
            <motion.button
              key={card}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (selected === null && i === 0) ? 0 : -1}
              disabled={disabled}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onClick={() => onSelect(isSelected ? null : card)}
              animate={{ y: isSelected ? -12 : 0 }}
              whileHover={disabled ? undefined : { y: isSelected ? -12 : -5 }}
              whileTap={disabled ? undefined : { scale: 0.94 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className={cn(
                "group relative flex h-20 w-14 sm:h-[92px] sm:w-[62px] flex-shrink-0 flex-col items-center justify-between rounded-xl border-2 p-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
                isSelected
                  ? "border-brand-500 bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-xl shadow-brand-500/35 ring-2 ring-brand-400/50"
                  : "border-slate-200/90 bg-white text-slate-800 shadow-md hover:border-brand-400 hover:text-brand-700 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:text-brand-300",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {/* Top-left mini index */}
              <span className={cn(
                "self-start text-[10px] font-bold leading-none select-none",
                isSelected ? "text-brand-100" : "text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400",
              )}>
                {card}
              </span>

              {/* Main center number */}
              <span className="text-xl sm:text-2xl font-bold tracking-tight select-none">
                {card}
              </span>

              {/* Bottom-right mini index (rotated) */}
              <span className={cn(
                "self-end text-[10px] font-bold leading-none select-none rotate-180",
                isSelected ? "text-brand-100" : "text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400",
              )}>
                {card}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

