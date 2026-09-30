import { PartyPopper } from "lucide-react";
import type { Results } from "@planning-poker/shared";

const RING_R = 15.5;
const RING_C = 2 * Math.PI * RING_R;

/** PLAN.md §9.3: distribution, average, and an agreement indicator. */
export function ResultsPanel({ results, showAverage }: { results: Results; showAverage: boolean }) {
  const maxCount = Math.max(1, ...results.distribution.map((d) => d.count));
  const agreementPct = Math.round(results.agreement * 100);

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap gap-3">
        {results.distribution.map((d) => (
          <div key={d.value} className="flex flex-col items-center">
            <div className="card-face-up flex h-12 w-9 items-center justify-center rounded-lg border-2 text-sm font-semibold shadow-sm">
              {d.value}
            </div>
            <div className="mt-1 h-1.5 w-9 rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-1.5 rounded-full bg-brand-600 transition-all"
                style={{ width: `${(d.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="mt-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">{d.count}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {showAverage && results.average !== null && (
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{results.average}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average</p>
          </div>
        )}
        <div className="relative flex h-14 w-14 items-center justify-center" role="img" aria-label={`${agreementPct}% agreement`}>
          <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="18" cy="18" r={RING_R} fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-slate-700" />
            <circle
              cx="18"
              cy="18"
              r={RING_R}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(results.agreement * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`}
              className="stroke-brand-500 transition-all"
            />
          </svg>
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {agreementPct}%
          </span>
        </div>
        {results.consensus && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400">
            <PartyPopper className="h-4 w-4" aria-hidden /> Consensus!
          </p>
        )}
      </div>
    </div>
  );
}
