"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers } from "lucide-react";
import { DECKS, parseCustomDeck, type DeckType } from "@planning-poker/shared";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { createGame } from "@/lib/api";
import { setCreatorSecret } from "@/lib/storage";

const DECK_OPTIONS: { value: DeckType; label: string }[] = [
  { value: "fibonacci", label: "Fibonacci (0, 1, 2, 3, 5, 8, ...)" },
  { value: "modifiedFibonacci", label: "Modified Fibonacci (0, ½, 1, 2, 3, 5, ...)" },
  { value: "tshirt", label: "T-shirt sizes (XS, S, M, L, ...)" },
  { value: "powersOfTwo", label: "Powers of 2 (0, 1, 2, 4, 8, ...)" },
  { value: "custom", label: "Custom…" },
];

const inputClasses =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40";

export default function CreateGamePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [deckType, setDeckType] = useState<DeckType>("fibonacci");
  const [customDeck, setCustomDeck] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const customPreview = deckType === "custom" ? parseCustomDeck(customDeck) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (deckType === "custom" && !customPreview) {
      toast.error("Enter 2–20 comma-separated cards (each up to 4 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createGame({
        name: name.trim() || undefined,
        deckType,
        customDeck: deckType === "custom" ? customDeck : undefined,
      });
      setCreatorSecret(result.id, result.creatorSecret);
      router.push(`/game/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create game");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-md shadow-brand-600/30">
            <Layers className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Planning Poker
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create a game and share the link with your team.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="game-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Game name
            </label>
            <input
              id="game-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Planning poker game"
              maxLength={60}
              className={inputClasses}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Voting system
            </label>
            <Select
              value={deckType}
              onValueChange={(v) => setDeckType(v as DeckType)}
              options={DECK_OPTIONS}
              aria-label="Voting system"
              className="w-full"
            />
          </div>

          {deckType === "custom" && (
            <div>
              <label htmlFor="custom-deck" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Custom cards (comma-separated)
              </label>
              <input
                id="custom-deck"
                value={customDeck}
                onChange={(e) => setCustomDeck(e.target.value)}
                placeholder="1, 2, 3, 5, 8, ?"
                className={inputClasses}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(customPreview ?? []).map((card) => (
                  <span
                    key={card}
                    className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
                  >
                    {card}
                  </span>
                ))}
              </div>
            </div>
          )}

          {deckType !== "custom" && (
            <div className="flex flex-wrap gap-1.5">
              {DECKS[deckType].map((card) => (
                <span
                  key={card}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-800"
                >
                  {card}
                </span>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="mt-8 w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create game"}
        </Button>
      </form>
    </main>
  );
}
