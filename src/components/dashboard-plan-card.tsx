"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { StreakHeatmap } from "@/components/streak-heatmap";
import { AlertTriangle, Calendar, Flame, ArrowRight } from "lucide-react";
import type { Plan, TaskWithCommentCount } from "@/lib/types/database";

interface DashboardPlanCardProps {
  plan: Plan;
  completed: number;
  total: number;
  blockedCount: number;
  activeDays: number;
  currentWeek: number | null;
  completedAtDates: string[];
}

export function DashboardPlanCard({
  plan,
  completed,
  total,
  blockedCount,
  activeDays,
  currentWeek,
  completedAtDates,
}: DashboardPlanCardProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pseudoTasks: TaskWithCommentCount[] = completedAtDates.map(
    (dateStr, i) => ({
      id: `pseudo-${i}`,
      phase_id: "",
      week_number: 0,
      title: "",
      task_type: "weekday" as const,
      is_completed: true,
      is_blocked: false,
      completed_at: dateStr,
      sort_order: 0,
      created_at: "",
      comment_count: 0,
    })
  );

  return (
    <Link
      href={`/plan/${plan.id}`}
      className="group relative block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
            {plan.title}
          </h2>
          {plan.description && (
            <p className="mt-0.5 text-sm text-slate-500 truncate">
              {plan.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {plan.total_weeks}w
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </div>
      </div>

      {/* Mini heatmap - plan duration only */}
      <div className="mt-3 overflow-x-auto pb-0.5">
        <StreakHeatmap
          tasks={pseudoTasks}
          startDate={plan.start_date}
          totalWeeks={plan.total_weeks}
          compact
          showLegend={false}
        />
      </div>

      {/* Progress */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {completed} of {total} tasks
          </span>
          <span className="font-semibold text-slate-700">{percentage}%</span>
        </div>
        <Progress value={percentage} />
      </div>

      {/* Meta badges */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {currentWeek !== null && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Week {currentWeek}/{plan.total_weeks}
          </span>
        )}
        {activeDays > 0 && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Flame className="h-3.5 w-3.5" />
            {activeDays}d active
          </span>
        )}
        {blockedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blockedCount} blocked
          </span>
        )}
      </div>
    </Link>
  );
}
