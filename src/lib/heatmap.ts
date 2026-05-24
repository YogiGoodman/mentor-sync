import type { TaskWithCommentCount } from "@/lib/types/database";

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const HEATMAP_COLORS = {
  empty: "#ebedf0",
  level1: "#9be9a8",
  level2: "#40c463",
  level3: "#30a14e",
  level4: "#216e39",
  future: "#f6f8fa",
  futureBorder: "#d8dee4",
  todayRing: "#1f2937",
} as const;

export function getIntensityColor(count: number): string {
  if (count === 0) return HEATMAP_COLORS.empty;
  if (count === 1) return HEATMAP_COLORS.level1;
  if (count === 2) return HEATMAP_COLORS.level2;
  if (count === 3) return HEATMAP_COLORS.level3;
  return HEATMAP_COLORS.level4;
}

export interface HeatmapDay {
  date: Date;
  dateKey: string;
  count: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface HeatmapMonth {
  label: string;
  colStart: number;
  colSpan: number;
}

export function buildHeatmapData(
  tasks: TaskWithCommentCount[],
  startDate: string | null,
  totalWeeks: number
) {
  const start = startDate
    ? new Date(startDate + "T00:00:00")
    : new Date(Date.now() - totalWeeks * 7 * 24 * 60 * 60 * 1000);

  const dayOfWeek = start.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const totalDays = totalWeeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completionsMap: Record<string, number> = {};
  for (const task of tasks) {
    if (task.completed_at) {
      const dateKey = localDateKey(new Date(task.completed_at));
      completionsMap[dateKey] = (completionsMap[dateKey] || 0) + 1;
    }
  }

  const days: HeatmapDay[] = [];
  const weeks = Math.ceil(totalDays / 7);

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dateKey = localDateKey(date);
    const isToday = date.getTime() === today.getTime();
    const isPast = date < today;
    const isFuture = date > today;

    days.push({
      date,
      dateKey,
      count: completionsMap[dateKey] || 0,
      isToday,
      isPast,
      isFuture,
    });
  }

  // Build month spans: each month gets colStart + colSpan for header rendering
  const months: HeatmapMonth[] = [];
  let currentMonth = -1;
  let currentMonthStart = 0;

  for (let w = 0; w < weeks; w++) {
    const dayIndex = w * 7;
    const day = days[dayIndex];
    if (!day) continue;
    const m = day.date.getMonth();
    if (m !== currentMonth) {
      if (currentMonth !== -1) {
        months[months.length - 1].colSpan = w - currentMonthStart;
      }
      months.push({
        label: day.date.toLocaleDateString("en-US", { month: "short" }),
        colStart: w,
        colSpan: 1,
      });
      currentMonth = m;
      currentMonthStart = w;
    }
  }
  if (months.length > 0) {
    months[months.length - 1].colSpan = weeks - currentMonthStart;
  }

  return { days, months, weeks };
}

export function countActiveDays(tasks: TaskWithCommentCount[]): number {
  const dates = new Set<string>();
  for (const task of tasks) {
    if (task.completed_at) {
      dates.add(localDateKey(new Date(task.completed_at)));
    }
  }
  return dates.size;
}

export function computeCurrentStreak(tasks: TaskWithCommentCount[]): number {
  const dates = new Set<string>();
  for (const task of tasks) {
    if (task.completed_at) {
      dates.add(localDateKey(new Date(task.completed_at)));
    }
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const check = new Date(today);
  if (!dates.has(localDateKey(check))) {
    check.setDate(check.getDate() - 1);
  }

  while (dates.has(localDateKey(check))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  return streak;
}

export function getCurrentWeek(
  startDate: string | null,
  totalWeeks: number
): number | null {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (diffWeeks < 1) return null;
  if (diffWeeks > totalWeeks) return totalWeeks;
  return diffWeeks;
}
