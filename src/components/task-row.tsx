"use client";

import { Save, X } from "lucide-react";
import type { TaskType } from "@/lib/types/database";

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "weekend", label: "Weekend" },
  { value: "weekday", label: "Weekday" },
  { value: "milestone", label: "Milestone" },
  { value: "full_focus", label: "Full Focus" },
];

interface TaskRowEditorProps {
  title: string;
  taskType: TaskType;
  weekNumber: number;
  maxWeek: number;
  onTitleChange: (v: string) => void;
  onTaskTypeChange: (v: TaskType) => void;
  onWeekNumberChange: (v: number) => void;
  onSave: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function TaskRowEditor({
  title,
  taskType,
  weekNumber,
  maxWeek,
  onTitleChange,
  onTaskTypeChange,
  onWeekNumberChange,
  onSave,
  onCancel,
  autoFocus,
  disabled,
}: TaskRowEditorProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Task title..."
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500"
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) onSave();
          }}
        />
      </div>
      <select
        value={taskType}
        onChange={(e) => onTaskTypeChange(e.target.value as TaskType)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
      >
        {TASK_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        max={maxWeek}
        value={weekNumber}
        onChange={(e) => onWeekNumberChange(Number(e.target.value))}
        className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500"
        title="Week number"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || !title.trim()}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        title="Save"
      >
        <Save className="h-4 w-4" />
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
