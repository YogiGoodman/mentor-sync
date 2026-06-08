import type { TaskWithCommentCount } from "@/lib/types/database";
import {
  computeCurrentStreak,
  getCurrentWeek,
  parseTimestamp,
} from "@/lib/heatmap";

export type Pace = "ahead" | "on_track" | "behind" | "not_started";

export interface Momentum {
  completed: number;
  total: number;
  percent: number;
  /** Consecutive active days up to today. */
  streak: number;
  /** Completions in the trailing 7 days. */
  last7: number;
  currentWeek: number | null;
  totalWeeks: number;
  /** Tasks scheduled on/before the current week. */
  dueByNow: number;
  /** Of the due tasks, how many are done. */
  completedDue: number;
  onTimePercent: number;
  pace: Pace;
  blockers: number;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Derive momentum signals for one mentee from their merged task list
 * (template + their `task_progress` overlay). Pure — safe on server or client.
 */
export function computeMomentum(
  tasks: TaskWithCommentCount[],
  startDate: string | null,
  totalWeeks: number
): Momentum {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const streak = computeCurrentStreak(tasks);
  const currentWeek = getCurrentWeek(startDate, totalWeeks);
  const blockers = tasks.filter((t) => t.is_blocked).length;

  const weekAgo = Date.now() - 7 * DAY;
  let last7 = 0;
  for (const t of tasks) {
    if (t.completed_at && parseTimestamp(t.completed_at).getTime() >= weekAgo) {
      last7++;
    }
  }

  const dueTasks =
    currentWeek === null
      ? []
      : tasks.filter((t) => t.week_number <= currentWeek);
  const dueByNow = dueTasks.length;
  const completedDue = dueTasks.filter((t) => t.is_completed).length;
  const onTimePercent =
    dueByNow > 0 ? Math.round((completedDue / dueByNow) * 100) : 0;

  let pace: Pace;
  if (currentWeek === null) pace = "not_started";
  else if (completed > dueByNow) pace = "ahead";
  else if (completedDue >= dueByNow) pace = "on_track";
  else pace = "behind";

  return {
    completed,
    total,
    percent,
    streak,
    last7,
    currentWeek,
    totalWeeks,
    dueByNow,
    completedDue,
    onTimePercent,
    pace,
    blockers,
  };
}

/** Tasks a mentee should have completed by now, prorated by elapsed weeks. */
export function expectedByNow(
  total: number,
  currentWeek: number | null,
  totalWeeks: number
): number {
  if (!currentWeek || totalWeeks <= 0) return 0;
  return Math.round((total * Math.min(currentWeek, totalWeeks)) / totalWeeks);
}

export const PACE_LABEL: Record<Pace, string> = {
  ahead: "Ahead",
  on_track: "On track",
  behind: "Behind",
  not_started: "Not started",
};
