"use client";

import { cn } from "@/lib/utils";
import type { TaskWithCommentCount, TaskType } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageCircle, CheckCircle2, Circle } from "lucide-react";

interface TaskCardProps {
  task: TaskWithCommentCount;
  onToggleComplete: (taskId: string) => void;
  onToggleBlocked: (taskId: string) => void;
  onOpenComments: (taskId: string) => void;
  highlighted?: boolean;
}

const typeLabels: Record<TaskType, string> = {
  weekend: "Weekend",
  weekday: "Weekday",
  milestone: "Milestone",
  full_focus: "Full Focus",
};

export function TaskCard({
  task,
  onToggleComplete,
  onToggleBlocked,
  onOpenComments,
  highlighted,
}: TaskCardProps) {
  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "rounded-lg border p-3 transition-all",
        task.is_blocked
          ? "border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
          : task.is_completed
          ? "border-slate-100 bg-slate-50 opacity-75 dark:border-slate-800 dark:bg-slate-800/40"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
        highlighted && "ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          className="mt-0.5 flex-shrink-0"
        >
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-400" />
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              task.is_completed
                ? "text-slate-400 line-through dark:text-slate-500"
                : "text-slate-800 dark:text-slate-100"
            )}
          >
            {task.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant={task.task_type}>{typeLabels[task.task_type]}</Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleBlocked(task.id)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              task.is_blocked
                ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                : "text-slate-300 hover:bg-slate-100 hover:text-amber-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-amber-400"
            )}
            title={task.is_blocked ? "Remove blocker" : "Flag as blocked"}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>

          <button
            onClick={() => onOpenComments(task.id)}
            className="relative rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Comments"
          >
            <MessageCircle className="h-4 w-4" />
            {task.comment_count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] font-medium text-white dark:bg-slate-600">
                {task.comment_count}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
