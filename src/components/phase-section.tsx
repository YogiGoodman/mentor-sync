"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Phase, TaskWithCommentCount } from "@/lib/types/database";
import { WeekSection } from "./week-section";

interface PhaseSectionProps {
  phase: Phase;
  tasks: Record<number, TaskWithCommentCount[]>;
  onToggleComplete: (taskId: string) => void;
  onToggleBlocked: (taskId: string) => void;
  onOpenComments: (taskId: string) => void;
  highlightedTaskId?: string | null;
}

export function PhaseSection({
  phase,
  tasks,
  onToggleComplete,
  onToggleBlocked,
  onOpenComments,
  highlightedTaskId,
}: PhaseSectionProps) {
  const [expanded, setExpanded] = useState(true);

  const allTasks = Object.values(tasks).flat();
  const completed = allTasks.filter((t) => t.is_completed).length;
  const total = allTasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const weekNumbers = Object.keys(tasks)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Phase {phase.phase_number}: {phase.title}
            </h3>
            {phase.description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {phase.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {completed}/{total}
          </span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 dark:border-slate-800">
          {phase.strategic_focus && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Strategic Focus
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {phase.strategic_focus}
              </p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {weekNumbers.map((week) => (
              <WeekSection
                key={week}
                weekNumber={week}
                tasks={tasks[week] ?? []}
                onToggleComplete={onToggleComplete}
                onToggleBlocked={onToggleBlocked}
                onOpenComments={onOpenComments}
                highlightedTaskId={highlightedTaskId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
