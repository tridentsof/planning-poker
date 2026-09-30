"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link as LinkIcon, Pencil, Trash2, Vote } from "lucide-react";
import type { Issue } from "@planning-poker/shared";
import { cn } from "@/lib/cn";

export function IssueRow({
  issue,
  isCurrent,
  canManage,
  onSelect,
  onUpdate,
  onDelete,
}: {
  issue: Issue;
  isCurrent: boolean;
  canManage: boolean;
  onSelect: () => void;
  onUpdate: (title: string, url: string | null) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: issue.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [url, setUrl] = useState(issue.url ?? "");

  function saveEdit() {
    if (title.trim().length === 0) return;
    onUpdate(title.trim(), url.trim() || null);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2 transition-colors",
        isCurrent
          ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/20"
          : "border-slate-200 dark:border-slate-700",
      )}
    >
      {canManage && (
        <button
          type="button"
          aria-label="Reorder"
          className="mt-1 cursor-grab text-slate-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-1.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 w-full rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link (optional)"
              className="h-8 w-full rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="text-xs font-medium text-brand-600">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-slate-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              {isCurrent && (
                <span className="rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Voting now
                </span>
              )}
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{issue.title}</p>
              {issue.url && (
                <a href={issue.url} target="_blank" rel="noreferrer" aria-label="Open link">
                  <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
                </a>
              )}
            </div>
            {issue.finalEstimate && (
              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {issue.finalEstimate}
              </span>
            )}
          </>
        )}
      </div>

      {canManage && !editing && (
        <div className="flex shrink-0 gap-1">
          <button onClick={onSelect} aria-label="Vote this issue" className="p-1 text-slate-400 hover:text-brand-600">
            <Vote className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(true)} aria-label="Edit issue" className="p-1 text-slate-400 hover:text-brand-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} aria-label="Delete issue" className="p-1 text-slate-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
