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
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Card deck"
      className="flex gap-2 overflow-x-auto px-1 pb-2 pt-2 scrollbar-thin"
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
            animate={{ y: isSelected ? -8 : 0 }}
            whileHover={disabled ? undefined : { y: isSelected ? -8 : -4 }}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "flex h-20 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 text-lg font-semibold",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
              isSelected
                ? "border-brand-600 bg-brand-600 text-white shadow-lg shadow-brand-600/40"
                : "border-slate-300 bg-white text-slate-800 shadow-sm hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500 dark:hover:text-brand-300",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {card}
          </motion.button>
        );
      })}
    </div>
  );
}
