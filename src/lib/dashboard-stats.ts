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

/**
 * Stats for a plan. Progress lives in the per-mentee `task_progress` overlay:
 * pass `menteeId` for a single mentee's view (mentee dashboard), or omit it to
 * aggregate every mentee's activity (mentor plan card heatmap).
 */
export async function fetchPlanStats(
  supabase: SupabaseClient,
  plan: Plan,
  menteeId?: string
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
    .select("id")
    .in("phase_id", phaseIds);
  const taskIds = (tasks ?? []).map((t) => t.id);
  const total = taskIds.length;

  let progress: { is_completed: boolean; is_blocked: boolean; completed_at: string | null }[] = [];
  if (taskIds.length > 0) {
    let q = supabase
      .from("task_progress")
      .select("is_completed, is_blocked, completed_at")
      .in("task_id", taskIds);
    if (menteeId) q = q.eq("mentee_id", menteeId);
    const { data } = await q;
    progress = data ?? [];
  }

  const completed = progress.filter((t) => t.is_completed).length;
  const blockedCount = progress.filter((t) => t.is_blocked).length;

  const dateSet = new Set<string>();
  const completedAtDates: string[] = [];
  for (const t of progress) {
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

export interface MentorOverview {
  total_plans: number;
  total_mentees: number;
  pending_requests: number;
  completions_this_week: number;
  recent_activity: {
    task_title: string;
    plan_title: string;
    completed_at: string;
  }[];
}

export async function computeMentorOverview(
  supabase: SupabaseClient,
  mentorId: string
): Promise<MentorOverview> {
  const { data: plans } = await supabase
    .from("plans")
    .select("id, title")
    .eq("created_by", mentorId);
  const planIds = (plans ?? []).map((p) => p.id);
  const titleMap = new Map((plans ?? []).map((p) => [p.id, p.title]));

  if (planIds.length === 0) {
    return {
      total_plans: 0,
      total_mentees: 0,
      pending_requests: 0,
      completions_this_week: 0,
      recent_activity: [],
    };
  }

  const [{ data: phases }, { data: assignments }, { count: pendingCount }] =
    await Promise.all([
      supabase.from("phases").select("id, plan_id").in("plan_id", planIds),
      supabase
        .from("plan_assignments")
        .select("mentee_id", { count: "exact" })
        .in("plan_id", planIds),
      supabase
        .from("plan_access_requests")
        .select("id", { count: "exact", head: true })
        .in("plan_id", planIds)
        .eq("status", "pending"),
    ]);

  const phaseIds = (phases ?? []).map((p) => p.id);
  const phaseToPlan = new Map((phases ?? []).map((p) => [p.id, p.plan_id]));

  let completionsThisWeek = 0;
  const recent: MentorOverview["recent_activity"] = [];

  if (phaseIds.length > 0) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Completions now live in task_progress; map back to task + plan for display.
    const { data: planTasks } = await supabase
      .from("tasks")
      .select("id, title, phase_id")
      .in("phase_id", phaseIds);
    const taskTitle = new Map((planTasks ?? []).map((t) => [t.id, t.title]));
    const taskPhase = new Map((planTasks ?? []).map((t) => [t.id, t.phase_id]));
    const taskIds = (planTasks ?? []).map((t) => t.id);

    if (taskIds.length > 0) {
      const { data: completions } = await supabase
        .from("task_progress")
        .select("task_id, completed_at")
        .in("task_id", taskIds)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(50);

      for (const c of completions ?? []) {
        if (!c.completed_at) continue;
        if (c.completed_at >= weekAgo) completionsThisWeek += 1;
        if (recent.length < 10) {
          const phaseId = taskPhase.get(c.task_id);
          const planId = phaseId ? phaseToPlan.get(phaseId) : undefined;
          recent.push({
            task_title: taskTitle.get(c.task_id) ?? "Task",
            plan_title: planId ? titleMap.get(planId) ?? "" : "",
            completed_at: c.completed_at,
          });
        }
      }
    }
  }

  // unique mentees across plans
  const menteeSet = new Set<string>();
  for (const a of assignments ?? []) menteeSet.add(a.mentee_id);

  return {
    total_plans: planIds.length,
    total_mentees: menteeSet.size,
    pending_requests: pendingCount ?? 0,
    completions_this_week: completionsThisWeek,
    recent_activity: recent,
  };
}
