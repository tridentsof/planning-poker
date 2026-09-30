"use client";

import { useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Issue } from "@planning-poker/shared";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { IssueRow } from "./IssueRow";

/** PLAN.md §9.3. */
export function IssuesDrawer({
  issues,
  currentIssueId,
  canManage,
  trigger,
  onAdd,
  onBulkAdd,
  onUpdate,
  onDelete,
  onReorder,
  onSelect,
}: {
  issues: Issue[];
  currentIssueId: string | null;
  canManage: boolean;
  trigger: React.ReactNode;
  onAdd: (title: string) => void;
  onBulkAdd: (titles: string[]) => void;
  onUpdate: (id: string, title: string, url: string | null) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onSelect: (id: string | null) => void;
}) {
  const [draft, setDraft] = useState("");

  const totalPoints = issues.reduce((sum, i) => {
    const n = Number(i.finalEstimate);
    return Number.isFinite(n) && i.finalEstimate ? sum + n : sum;
  }, 0);

  function submitDraft() {
    const lines = draft
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    if (lines.length === 1) onAdd(lines[0]!);
    else onBulkAdd(lines);
    setDraft("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = issues.findIndex((i) => i.id === active.id);
    const newIndex = issues.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(issues, oldIndex, newIndex).map((i) => i.id));
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title="Issues">
        <div className="flex h-full flex-col gap-3">
          <div className="flex-1 space-y-2 overflow-y-auto">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {issues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    isCurrent={issue.id === currentIssueId}
                    canManage={canManage}
                    onSelect={() => onSelect(issue.id)}
                    onUpdate={(title, url) => onUpdate(issue.id, title, url)}
                    onDelete={() => onDelete(issue.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {issues.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No issues yet.
              </p>
            )}
          </div>

          {canManage && (
            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="+ Add an issue (one per line to bulk-add)"
                rows={2}
                className="w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <Button size="sm" variant="secondary" onClick={submitDraft} className="w-full">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          )}

          <p className="border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {issues.length} issue{issues.length === 1 ? "" : "s"} · Total: {totalPoints} points
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
