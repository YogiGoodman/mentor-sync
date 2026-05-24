import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/types/database";

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface PlanStats {
  plan: Plan;
  total: number;
  completed: number;
  blockedCount: number;
  activeDays: number;
  currentWeek: number | null;
  completedAtDates: string[];
}

export async function fetchPlanStats(
  supabase: SupabaseClient,
  plan: Plan
): Promise<PlanStats> {
  const { data: phases } = await supabase
    .from("phases")
    .select("id")
    .eq("plan_id", plan.id);

  if (!phases?.length) {
    return {
      plan,
      total: 0,
      completed: 0,
      blockedCount: 0,
      activeDays: 0,
      currentWeek: null,
      completedAtDates: [],
    };
  }

  const phaseIds = phases.map((p) => p.id);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("is_completed, is_blocked, completed_at")
    .in("phase_id", phaseIds);

  const all = tasks ?? [];
  const total = all.length;
  const completed = all.filter((t) => t.is_completed).length;
  const blockedCount = all.filter((t) => t.is_blocked).length;

  const dateSet = new Set<string>();
  const completedAtDates: string[] = [];
  for (const t of all) {
    if (t.completed_at) {
      const d = localDateKey(new Date(t.completed_at));
      completedAtDates.push(t.completed_at);
      dateSet.add(d);
    }
  }

  let currentWeek: number | null = null;
  if (plan.start_date) {
    const start = new Date(plan.start_date);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const w = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    if (w >= 1 && w <= plan.total_weeks) currentWeek = w;
    else if (w > plan.total_weeks) currentWeek = plan.total_weeks;
  }

  return {
    plan,
    total,
    completed,
    blockedCount,
    activeDays: dateSet.size,
    currentWeek,
    completedAtDates,
  };
}

export interface AggregateStats {
  totalPlans: number;
  totalTasks: number;
  totalCompleted: number;
  totalBlocked: number;
  totalActiveDays: number;
  completionPercent: number;
}

export function aggregateStats(planStats: PlanStats[]): AggregateStats {
  let totalTasks = 0;
  let totalCompleted = 0;
  let totalBlocked = 0;
  const allDates = new Set<string>();

  for (const ps of planStats) {
    totalTasks += ps.total;
    totalCompleted += ps.completed;
    totalBlocked += ps.blockedCount;
    for (const d of ps.completedAtDates) {
      allDates.add(localDateKey(new Date(d)));
    }
  }

  return {
    totalPlans: planStats.length,
    totalTasks,
    totalCompleted,
    totalBlocked,
    totalActiveDays: allDates.size,
    completionPercent:
      totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
  };
}
