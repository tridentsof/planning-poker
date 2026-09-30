"use client";

import { useEffect, useState } from "react";
import type { Issue, Results } from "@planning-poker/shared";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const NO_ESTIMATE = "";

/**
 * PLAN.md §9.3: shown when revealed and a current issue exists. The select is pre-filled
 * with results.suggested and re-prefills when a new issue or a new round's suggestion
 * arrives; "No estimate" clears the saved estimate (issue:setEstimate with null).
 */
export function EstimateBar({
  issue,
  deck,
  results,
  canManage,
  onSave,
}: {
  issue: Issue;
  deck: string[];
  results: Results;
  canManage: boolean;
  onSave: (value: string | null) => void;
}) {
  const prefill = issue.finalEstimate ?? results.suggested ?? deck[0] ?? NO_ESTIMATE;
  const [value, setValue] = useState(prefill);

  // Re-prefill when the current issue changes or a new round produces a new suggestion.
  const { id: issueId, finalEstimate } = issue;
  const suggested = results.suggested;
  useEffect(() => {
    setValue(finalEstimate ?? suggested ?? deck[0] ?? NO_ESTIMATE);
  }, [issueId, finalEstimate, suggested, deck]);

  if (!canManage) return null;

  return (
    <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Final estimate for &ldquo;{issue.title}&rdquo;
      </span>
      <Select
        value={value}
        onValueChange={setValue}
        options={[
          { value: NO_ESTIMATE, label: "No estimate" },
          ...deck.map((card) => ({ value: card, label: card })),
        ]}
        aria-label="Final estimate"
      />
      <Button size="sm" onClick={() => onSave(value === NO_ESTIMATE ? null : value)}>
        Save
      </Button>
    </div>
  );
}
