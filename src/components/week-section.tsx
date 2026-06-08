"use client";

import type { TaskWithCommentCount } from "@/lib/types/database";
import { TaskCard } from "./task-card";

interface WeekSectionProps {
  weekNumber: number;
  tasks: TaskWithCommentCount[];
  onToggleComplete: (taskId: string) => void;
  onToggleBlocked: (taskId: string) => void;
  onOpenComments: (taskId: string) => void;
  highlightedTaskId?: string | null;
  readOnly?: boolean;
}

export function WeekSection({
  weekNumber,
  tasks,
  onToggleComplete,
  onToggleBlocked,
  onOpenComments,
  highlightedTaskId,
  readOnly,
}: WeekSectionProps) {
  const weekendTasks = tasks.filter(
    (t) => t.task_type === "weekend" || t.task_type === "full_focus"
  );
  const weekdayTasks = tasks.filter(
    (t) => t.task_type === "weekday" || t.task_type === "milestone"
  );

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
      <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Week {weekNumber}
      </h4>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Weekend Focus */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Weekend Focus (Class Theory)
          </p>
          {weekendTasks.length > 0 ? (
            weekendTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleBlocked={onToggleBlocked}
                onOpenComments={onOpenComments}
                highlighted={task.id === highlightedTaskId}
                readOnly={readOnly}
              />
            ))
          ) : (
            <p className="py-2 text-xs text-slate-400 dark:text-slate-500">No tasks</p>
          )}
        </div>

        {/* Weekday Focus */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
            Weekday Focus (1-Hour Project)
          </p>
          {weekdayTasks.length > 0 ? (
            weekdayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleBlocked={onToggleBlocked}
                onOpenComments={onOpenComments}
                highlighted={task.id === highlightedTaskId}
                readOnly={readOnly}
              />
            ))
          ) : (
            <p className="py-2 text-xs text-slate-400 dark:text-slate-500">No tasks</p>
          )}
        </div>
      </div>
    </div>
  );
}
