"use client";

import { useMemo } from "react";
import { ActivityCalendar, type Activity, type ThemeInput } from "react-activity-calendar";
import { Flame } from "lucide-react";
import type { TaskWithCommentCount } from "@/lib/types/database";
import { computeCurrentStreak } from "@/lib/heatmap";
import { useTheme } from "./theme-provider";

interface StreakHeatmapProps {
  tasks: TaskWithCommentCount[];
  startDate: string | null;
  totalWeeks: number;
  compact?: boolean;
  showLegend?: boolean;
}

const LIGHT_THEME: ThemeInput = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
};

const DARK_THEME: ThemeInput = {
  light: ["#1e293b", "#064e3b", "#065f46", "#059669", "#34d399"],
  dark: ["#1e293b", "#064e3b", "#065f46", "#059669", "#34d399"],
};

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTimestamp(value: string): Date {
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  return new Date(normalized);
}

function countToLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function buildActivities(
  tasks: TaskWithCommentCount[],
  startDate: string | null,
  totalWeeks: number
): Activity[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startDate
    ? new Date(startDate + "T00:00:00")
    : new Date(today.getTime() - totalWeeks * 7 * 86400000);
  start.setHours(0, 0, 0, 0);

  const completionsMap: Record<string, number> = {};
  for (const task of tasks) {
    if (task.completed_at) {
      const key = localDateKey(parseTimestamp(task.completed_at));
      completionsMap[key] = (completionsMap[key] || 0) + 1;
    }
  }

  const activities: Activity[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = localDateKey(cursor);
    const count = completionsMap[key] ?? 0;
    activities.push({ date: key, count, level: countToLevel(count) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return activities;
}

export function StreakHeatmap({
  tasks,
  startDate,
  totalWeeks,
  compact = false,
  showLegend = true,
}: StreakHeatmapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const activities = useMemo(
    () => buildActivities(tasks, startDate, totalWeeks),
    [tasks, startDate, totalWeeks]
  );

  const streak = useMemo(() => computeCurrentStreak(tasks), [tasks]);

  return (
    <div className="inline-flex flex-col gap-2">
      {!compact && streak > 0 && (
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {streak} day streak
          </span>
        </div>
      )}

      <ActivityCalendar
        data={activities}
        theme={isDark ? DARK_THEME : LIGHT_THEME}
        colorScheme={isDark ? "dark" : "light"}
        blockSize={compact ? 10 : 13}
        blockMargin={compact ? 2 : 3}
        blockRadius={2}
        fontSize={11}
        showColorLegend={showLegend}
        showMonthLabels={!compact}
        showWeekdayLabels={compact ? false : ["mon", "wed", "fri"]}
        showTotalCount={false}
        labels={{
          totalCount: "{{count}} active days",
          legend: { less: "Less", more: "More" },
        }}
      />
    </div>
  );
}
